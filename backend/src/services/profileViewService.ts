import crypto from 'crypto';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Block } from '../models/Block';
import { prisma, generateObjectId } from '../db/client';

export const PROFILE_VIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory mutex strictly for isolated unit/integration test mock environments
const testActiveLocks = new Set<string>();

/**
 * Tracks profile views and safely creates a notification for the profile owner
 * subject to all qualification and deduplication rules:
 *
 * 1. Excludes anonymous visitors.
 * 2. Excludes self-views.
 * 3. Excludes administrative or system accounts.
 * 4. Excludes deleted, inactive, suspended, or blocked profiles/users.
 * 5. Suppresses duplicate notifications within a 24-hour cooldown.
 * 6. MariaDB safe: does not use unsupported nested JSON predicates in queries.
 * 7. Best effort: failures do not impact profile loading.
 */
export async function recordProfileView(
  viewerUserId: string | undefined | null,
  targetProfile: any,
  viewerRole?: string
): Promise<boolean> {
  try {
    // 1. Exclude anonymous visitors
    if (!viewerUserId) {
      return false;
    }

    const cleanViewerId = String(viewerUserId);

    // 2. Exclude administrative accounts
    if (viewerRole === 'admin') {
      return false;
    }

    // 3. Exclude missing target profile or target user
    if (!targetProfile || targetProfile.isDeleted) {
      return false;
    }

    const targetUserId =
      targetProfile.user?._id?.toString() ||
      targetProfile.user?.toString() ||
      targetProfile.userId?.toString();

    if (!targetUserId) {
      return false;
    }

    // 4. Exclude self-profile views
    if (cleanViewerId === String(targetUserId)) {
      return false;
    }

    // 5. Exclude administrative target, suspended, or deleted target accounts
    const targetUser = await User.findById(targetUserId).select('role status isActive isDeleted');
    if (
      !targetUser ||
      targetUser.isDeleted ||
      targetUser.isActive === false ||
      targetUser.role === 'admin' ||
      ['Suspended', 'Blocked', 'Deleted'].includes(targetUser.status || '')
    ) {
      return false;
    }

    // Also check if viewer account is active/valid
    const viewerUser = await User.findById(cleanViewerId).select('role status isActive isDeleted');
    if (
      !viewerUser ||
      viewerUser.isDeleted ||
      viewerUser.isActive === false ||
      viewerUser.role === 'admin' ||
      ['Suspended', 'Blocked', 'Deleted'].includes(viewerUser.status || '')
    ) {
      return false;
    }

    // 6. Check block status in both directions
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: cleanViewerId, blockedUser: targetUserId },
        { blocker: targetUserId, blockedUser: cleanViewerId },
      ],
    });
    if (isBlocked) {
      return false;
    }

    // 7. Distributed concurrency protection & 24-hour cooldown deduplication
    // In MariaDB/MySQL, GET_LOCK provides database-level mutual exclusion across all application workers.
    // Lock name MUST be strictly <= 64 characters. We use SHA-256 hash to guarantee bounded length and zero collisions.
    const hash = crypto
      .createHash('sha256')
      .update(`${cleanViewerId}:${targetUserId}`)
      .digest('hex');
    const lockKey = `wj_pv_${hash.slice(0, 50)}`; // exactly 56 chars (well within MariaDB 64-char limit)

    // Execute in connection-pinned transaction when Prisma transaction is available
    if (typeof (prisma as any)?.$transaction === 'function') {
      try {
        return await (prisma as any).$transaction(
          async (tx: any) => {
            // A. Acquire MariaDB advisory lock on the pinned transaction connection
            let lockAcquired = false;
            try {
              const lockRes: any = await tx.$queryRawUnsafe(
                `SELECT GET_LOCK(?, 5) as acquired`,
                lockKey
              );
              if (
                Array.isArray(lockRes) &&
                (lockRes[0]?.acquired === 1 || lockRes[0]?.acquired === '1')
              ) {
                lockAcquired = true;
              }
            } catch (lockErr) {
              console.error('[ProfileViewService] Error executing GET_LOCK:', lockErr);
              return false;
            }

            // Lock timeout (0), NULL, or failure MUST NEVER fall through to unprotected creation
            if (!lockAcquired) {
              console.warn(
                `[ProfileViewService] Advisory lock could not be acquired (timeout or busy) for key ${lockKey}`
              );
              return false;
            }

            try {
              // B. Cooldown lookup on the exact same connection
              const since24h = new Date(Date.now() - PROFILE_VIEW_COOLDOWN_MS);
              const recentNotifications = tx.notification
                ? await tx.notification.findMany({
                    where: {
                      userId: targetUserId,
                      type: 'PROFILE_VIEW',
                      createdAt: { gte: since24h },
                    },
                  })
                : await Notification.find({
                    user: targetUserId,
                    type: 'PROFILE_VIEW',
                    createdAt: { $gte: since24h },
                  });

              const isCooldownActive = recentNotifications.some((n: any) => {
                let meta = n.metadata;
                if (typeof meta === 'string') {
                  try {
                    meta = JSON.parse(meta);
                  } catch {
                    return false;
                  }
                }
                return (
                  meta &&
                  (String(meta.viewerUserId) === cleanViewerId ||
                    String(meta.viewerId) === cleanViewerId)
                );
              });

              if (isCooldownActive) {
                return false;
              }

              // C. Resolve viewer profile
              const viewerProfile = await Profile.findOne({
                user: cleanViewerId,
                isDeleted: { $ne: true },
              }).select('_id candidateId');

              const viewerProfileId =
                viewerProfile?.candidateId ||
                (viewerProfile?._id ? String(viewerProfile._id) : null);

              // D. Create notification on the exact same connection
              if (tx.notification) {
                await tx.notification.create({
                  data: {
                    id: generateObjectId(),
                    userId: targetUserId,
                    type: 'PROFILE_VIEW',
                    title: 'Someone viewed your profile',
                    message: 'A member is interested in your profile. Upgrade to discover who.',
                    actionUrl: '/membership?feature=profile-viewers',
                    link: '/membership?feature=profile-viewers',
                    read: false,
                    metadata: {
                      viewerUserId: cleanViewerId,
                      viewerProfileId: viewerProfileId || null,
                      viewedAt: new Date().toISOString(),
                    },
                  },
                });
              } else {
                await Notification.create({
                  user: targetUserId,
                  type: 'PROFILE_VIEW',
                  title: 'Someone viewed your profile',
                  message: 'A member is interested in your profile. Upgrade to discover who.',
                  actionUrl: '/membership?feature=profile-viewers',
                  link: '/membership?feature=profile-viewers',
                  read: false,
                  metadata: {
                    viewerUserId: cleanViewerId,
                    viewerProfileId: viewerProfileId || null,
                    viewedAt: new Date().toISOString(),
                  },
                });
              }

              return true;
            } finally {
              // E. Release advisory lock on the exact same pinned connection
              try {
                await tx.$queryRawUnsafe(`SELECT RELEASE_LOCK(?) as released`, lockKey);
              } catch (releaseErr) {
                console.error(
                  '[ProfileViewService] Error safely releasing MariaDB advisory lock:',
                  releaseErr
                );
              }
            }
          },
          { timeout: 10000, maxWait: 5000 }
        );
      } catch (txErr: any) {
        // In production, transaction failures MUST fail closed
        if (process.env.NODE_ENV === 'production') {
          console.error(
            '[ProfileViewService] Production transaction execution failed:',
            txErr?.message || txErr
          );
          return false;
        }
        // In test environments where live database is offline, fall through to test mutex
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error(
        '[ProfileViewService] prisma.$transaction is unavailable in production. Failing closed.'
      );
      return false;
    }

    // 8. Test-only concurrency fallback (active ONLY in non-production unit testing)
    if (testActiveLocks.has(lockKey)) {
      return false;
    }
    testActiveLocks.add(lockKey);

    try {
      const since24h = new Date(Date.now() - PROFILE_VIEW_COOLDOWN_MS);
      const recentNotifications = await Notification.find({
        user: targetUserId,
        type: 'PROFILE_VIEW',
        createdAt: { $gte: since24h },
      });

      const isCooldownActive = recentNotifications.some((n: any) => {
        let meta = n.metadata;
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta);
          } catch {
            return false;
          }
        }
        return (
          meta &&
          (String(meta.viewerUserId) === cleanViewerId ||
            String(meta.viewerId) === cleanViewerId)
        );
      });

      if (isCooldownActive) {
        return false;
      }

      const viewerProfile = await Profile.findOne({
        user: cleanViewerId,
        isDeleted: { $ne: true },
      }).select('_id candidateId');

      const viewerProfileId =
        viewerProfile?.candidateId ||
        (viewerProfile?._id ? String(viewerProfile._id) : null);

      await Notification.create({
        user: targetUserId,
        type: 'PROFILE_VIEW',
        title: 'Someone viewed your profile',
        message: 'A member is interested in your profile. Upgrade to discover who.',
        actionUrl: '/membership?feature=profile-viewers',
        link: '/membership?feature=profile-viewers',
        read: false,
        metadata: {
          viewerUserId: cleanViewerId,
          viewerProfileId: viewerProfileId || null,
          viewedAt: new Date().toISOString(),
        },
      });

      return true;
    } finally {
      testActiveLocks.delete(lockKey);
    }
  } catch (err: any) {
    // Non-blocking best-effort: log error without throwing
    console.error('[ProfileViewService] Failed to record profile view notification:', err?.message || err);
    return false;
  }
}
