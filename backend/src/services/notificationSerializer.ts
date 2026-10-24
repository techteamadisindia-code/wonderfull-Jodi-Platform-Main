import { Profile } from '../models/Profile';
import { hasActivePaidMembership } from './entitlementService';

export interface SerializedNotification {
  _id: any;
  id?: any;
  user?: any;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  link?: string;
  read: boolean;
  readAt?: Date;
  isLocked?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

/**
 * Strips private visitor details for Free members and projects allowlisted public
 * visitor details for Paid members.
 *
 * Guarantees:
 * - Free members NEVER receive viewer user ID, profile ID, candidate ID, visitor name,
 *   photo URL, profile URL, phone number, email, or any raw identifying metadata.
 * - Paid members receive ONLY allowlisted public identity fields (public display name,
 *   primary public photo, public candidate ID link).
 */
export async function serializeNotificationsForRecipient(
  notifications: any[],
  recipientUserId: string,
  recipientRole?: string
): Promise<SerializedNotification[]> {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return [];
  }

  // 1. Server-side entitlement check
  const isEntitled = await hasActivePaidMembership(recipientUserId, recipientRole);

  // 2. Identify all PROFILE_VIEW notifications
  const hasProfileViews = notifications.some((n) => n?.type === 'PROFILE_VIEW');
  if (!hasProfileViews) {
    return notifications.map((n) => (n.toObject ? n.toObject() : { ...n }));
  }

  // If entitled, preload viewer profiles in a single query
  const viewerProfileMap = new Map<string, any>();
  if (isEntitled) {
    const viewerUserIds: string[] = [];
    for (const n of notifications) {
      if (n?.type === 'PROFILE_VIEW') {
        let meta = n.metadata;
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta);
          } catch {
            meta = {};
          }
        }
        if (meta?.viewerUserId) {
          viewerUserIds.push(String(meta.viewerUserId));
        }
      }
    }

    if (viewerUserIds.length > 0) {
      try {
        const uniqueViewerIds = Array.from(new Set(viewerUserIds));
        await Promise.all(
          uniqueViewerIds.map(async (uId) => {
            const p = await Profile.findOne({
              $or: [{ user: uId }, { userId: uId }],
              isDeleted: { $ne: true },
            });
            if (p) {
              viewerProfileMap.set(String(uId), p);
            }
          })
        );
      } catch (err) {
        console.error('[NotificationSerializer] Error preloading viewer profiles:', err);
      }
    }
  }

  // 3. Serialize each notification
  return notifications.map((n) => {
    const raw = n.toObject ? n.toObject() : { ...n };

    if (raw.type !== 'PROFILE_VIEW') {
      return raw;
    }

    let meta = raw.metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = {};
      }
    } else if (!meta || typeof meta !== 'object') {
      meta = {};
    }

    const viewedAt = meta.viewedAt || raw.createdAt;

    // --- CASE A: Free Member (Locked Projection) ---
    if (!isEntitled) {
      return {
        _id: raw._id || raw.id,
        id: raw._id || raw.id,
        user: raw.user,
        type: 'PROFILE_VIEW',
        title: 'Someone viewed your profile',
        message: 'A member is interested in your profile. Upgrade to discover who.',
        actionUrl: '/membership?feature=profile-viewers',
        link: '/membership?feature=profile-viewers',
        read: Boolean(raw.read),
        readAt: raw.readAt || null,
        isLocked: true,
        metadata: {
          isLocked: true,
          upgradeFeature: 'profile-viewers',
          unlockUrl: '/membership?feature=profile-viewers',
          viewedAt,
        },
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      };
    }

    // --- CASE B: Paid Member (Unlocked Allowlisted Public Projection) ---
    const viewerUserId = String(meta.viewerUserId || '');
    const viewerProfile = viewerProfileMap.get(viewerUserId);

    let displayName = 'A verified member';
    let visitorPhoto: string | null = null;
    let visitorProfileId: string | null = null;

    if (viewerProfile) {
      displayName =
        viewerProfile.displayName ||
        viewerProfile.publicName ||
        viewerProfile.name ||
        (viewerProfile.firstName
          ? `${viewerProfile.firstName} ${viewerProfile.lastName ? viewerProfile.lastName.charAt(0) + '.' : ''}`.trim()
          : 'A verified member');

      visitorPhoto =
        viewerProfile.primaryPhoto ||
        (Array.isArray(viewerProfile.photos) && viewerProfile.photos.length > 0
          ? viewerProfile.photos[0]
          : null);

      visitorProfileId = viewerProfile.candidateId || String(viewerProfile._id);
    }

    const profileUrl = visitorProfileId ? `/profile/${visitorProfileId}` : '/search';

    return {
      _id: raw._id || raw.id,
      id: raw._id || raw.id,
      user: raw.user,
      type: 'PROFILE_VIEW',
      title: `${displayName} viewed your profile`,
      message: `${displayName} viewed your profile.`,
      actionUrl: profileUrl,
      link: profileUrl,
      read: Boolean(raw.read),
      readAt: raw.readAt || null,
      isLocked: false,
      metadata: {
        isLocked: false,
        visitorName: displayName,
        viewerName: displayName,
        visitorPhoto,
        viewerAvatar: visitorPhoto,
        visitorProfileId,
        profileUrl,
        viewedAt,
      },
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  });
}

/**
 * Serializes a single notification object for the recipient
 */
export async function serializeNotificationForRecipient(
  notification: any,
  recipientUserId: string,
  recipientRole?: string
): Promise<SerializedNotification> {
  const [serialized] = await serializeNotificationsForRecipient(
    [notification],
    recipientUserId,
    recipientRole
  );
  return serialized;
}
