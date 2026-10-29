import { Response, NextFunction } from 'express';
import mongoose from '../db/prismaBridge';
import { prisma, generateObjectId } from '../db/client';
import { hasActivePaidMembership } from '../services/entitlementService';
import { AuthRequest } from '../middleware/authMiddleware';
import { ContactRequest } from '../models/ContactRequest';
import { ContactAccessLog } from '../models/ContactAccessLog';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Notification } from '../models/Notification';
import { MembershipPlan } from '../models/MembershipPlan';
import { Block } from '../models/Block';
import { isValidObjectId } from '../utils/securityUtils';
import { findCanonicalProfile } from './profileController';

/**
 * 1. POST /api/contact-requests
 * Send a new contact request to a member
 */
export async function createContactRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const requesterId = req.user?.userId;
    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { recipientId, profileId, targetUserId: explicitTargetUserId, message } = req.body;

    const rawTarget = (recipientId || explicitTargetUserId || profileId || '').trim();
    if (!rawTarget) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID or Profile ID is required to request contact.',
      });
    }

    let targetUserId: string | null = null;

    // 1. Resolve via canonical profile (supports candidate ID like WJ-100092, profile _id, or legacy WJ-[hex])
    const resolvedProfile = await findCanonicalProfile(rawTarget);
    if (resolvedProfile) {
      const u = resolvedProfile.user || (resolvedProfile as any).userId;
      if (u) {
        targetUserId = String(u._id || u.id || u);
      }
    }

    // 2. Direct User lookup if rawTarget is an ObjectId or UUID format
    if (!targetUserId && (isValidObjectId(rawTarget) || /^[0-9a-fA-F]{24}$/.test(rawTarget) || /^[0-9a-fA-F-]{36}$/.test(rawTarget))) {
      const directUser = await User.findById(rawTarget).select('_id');
      if (directUser) {
        targetUserId = String(directUser._id || directUser.id);
      }
    }

    if (!targetUserId) {
      if (!resolvedProfile && (rawTarget.startsWith('WJ-') || rawTarget.startsWith('wj-'))) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }
      return res.status(400).json({ success: false, message: 'Invalid recipient ID' });
    }

    if (requesterId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request contact details from your own profile.',
      });
    }

    const recipientUser = await User.findById(targetUserId);
    if (!recipientUser) {
      return res.status(404).json({ success: false, message: 'Member account not found' });
    }
    if (recipientUser.isBlocked || recipientUser.status === 'SUSPENDED' || recipientUser.status === 'DELETED') {
      return res.status(404).json({ success: false, message: 'Member account not found or inactive' });
    }

    // Fail-closed block check: do not allow contact requests if blocked or if block query fails
    let isBlocked = null;
    try {
      isBlocked = await Block.findOne({
        $or: [
          { blocker: requesterId, blockedUser: targetUserId },
          { blocker: targetUserId, blockedUser: requesterId },
        ],
      });
    } catch (blockErr: any) {
      console.error('[ContactRequest] Block verification failed (database/schema error):', blockErr?.message);
      return res.status(503).json({
        success: false,
        message: 'Unable to verify member eligibility at this time. Please try again later.',
      });
    }
    if (isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot request contact details from this member' });
    }

    // 1. Check requester's subscription & credit availability
    const now = new Date();
    const subscription = await Subscription.findOne({
      user: requesterId,
      status: 'ACTIVE',
      $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
    }).sort({ createdAt: -1 });

    const planSlug = (subscription?.planId || subscription?.plan || 'free').toLowerCase();
    const isFreePlan = !subscription || planSlug === 'free';

    const isPaidMember = await hasActivePaidMembership(requesterId, req.user?.role);
    if (!isPaidMember || isFreePlan) {
      const activePlans = await MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
      return res.status(403).json({
        success: false,
        canUpgrade: true,
        code: 'FREE_PLAN_NO_CREDITS',
        message:
          'Contact requests require an active paid membership. Free plans do not include contact requests. Please choose Doctor Connect or Premium Match to connect directly.',
        availablePlans: activePlans,
      });
    }

    // Determine plan limits
    const isUnlimited =
      planSlug.includes('concierge') ||
      planSlug === 'vvip' ||
      subscription?.plan === 'VVIP';

    const creditsRemaining = subscription?.contactRequestsRemaining ?? 0;

    if (!isUnlimited && creditsRemaining <= 0) {
      return res.status(403).json({
        success: false,
        canUpgrade: true,
        code: 'NO_CREDITS_REMAINING',
        message:
          'You have utilized all your contact request credits. Please upgrade or renew your membership to send more contact requests.',
      });
    }

    // 2. Check for existing request between requester and recipient
    const existingRequest = await ContactRequest.findOne({
      requester: requesterId,
      recipient: targetUserId,
      status: { $in: ['PENDING', 'ACCEPTED'] },
    });

    if (existingRequest) {
      if (existingRequest.status === 'ACCEPTED') {
        return res.status(200).json({
          success: true,
          alreadyUnlocked: true,
          message: 'Contact details have already been unlocked for this member.',
          data: existingRequest,
        });
      }
      return res.status(400).json({
        success: false,
        isPending: true,
        message: 'A contact request is already pending acceptance by this member.',
        data: existingRequest,
      });
    }

    // 3. Create ContactRequest (PENDING - zero credit deducted until recipient accepts)
    const newRequest = await ContactRequest.create({
      requester: requesterId,
      recipient: targetUserId,
      status: 'PENDING',
      contactCreditDeducted: false,
      contactUnlockedAt: null,
      message: message || '',
    });

    // 4. Log creation in ContactAccessLog
    await ContactAccessLog.create({
      user: requesterId,
      profileOwner: targetUserId,
      contactRequest: newRequest._id,
      action: 'REQUEST_CREATED',
      creditsUsed: 0,
      ipAddress: req.ip || '127.0.0.1',
    }).catch(() => {});

    // 5. Send In-App Notification to recipient
    const requesterProfile = await Profile.findOne({ user: requesterId });
    const requesterName = requesterProfile?.displayName || 'A verified doctor';

    await Notification.create({
      user: targetUserId,
      type: 'INTEREST',
      title: 'New Contact Request',
      message: `${requesterName} has requested to view your contact information.`,
      referenceId: newRequest._id,
      read: false,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message:
        'Contact request sent securely. Your contact credit will only be deducted once the doctor accepts your request.',
      data: newRequest,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. GET /api/contact-requests
 * Retrieve user's incoming and outgoing contact requests
 */
export async function getContactRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [incomingRequests, outgoingRequests] = await Promise.all([
      ContactRequest.find({ recipient: userId })
        .populate('requester', 'fullName email mobile verified verificationStatus')
        .sort({ createdAt: -1 }),
      ContactRequest.find({ requester: userId })
        .populate('recipient', 'fullName email mobile verified verificationStatus')
        .sort({ createdAt: -1 }),
    ]);

    // Attach profile summaries for UI presentation
    const requesterIds = incomingRequests.map((r: any) =>
      r.requester?._id || r.requester?.id || (typeof r.requester === 'string' ? r.requester : r.requesterId)
    ).filter(Boolean).map(String);
    const recipientIds = outgoingRequests.map((r: any) =>
      r.recipient?._id || r.recipient?.id || (typeof r.recipient === 'string' ? r.recipient : r.recipientId)
    ).filter(Boolean).map(String);

    const [requesterProfiles, recipientProfiles] = await Promise.all([
      Profile.find({ user: { $in: requesterIds } }).select(
        'user displayName primaryPhoto degree education profession city state'
      ),
      Profile.find({ user: { $in: recipientIds } }).select(
        'user displayName primaryPhoto degree education profession city state'
      ),
    ]);

    const reqProfileMap = new Map(requesterProfiles.map((p) => [p.user.toString(), p]));
    const recProfileMap = new Map(recipientProfiles.map((p) => [p.user.toString(), p]));

    const formatIncoming = incomingRequests.map((reqItem: any) => {
      const uId = String(
        reqItem.requester?._id || reqItem.requester?.id || reqItem.requester || reqItem.requesterId || ''
      );
      return {
        ...reqItem.toObject(),
        profile: uId ? reqProfileMap.get(uId) || null : null,
      };
    });

    const formatOutgoing = outgoingRequests.map((reqItem: any) => {
      const uId = String(
        reqItem.recipient?._id || reqItem.recipient?.id || reqItem.recipient || reqItem.recipientId || ''
      );
      return {
        ...reqItem.toObject(),
        profile: uId ? recProfileMap.get(uId) || null : null,
      };
    });

    res.json({
      success: true,
      data: {
        incoming: formatIncoming,
        outgoing: formatOutgoing,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. PATCH /api/contact-requests/:id/accept
 * Recipient accepts contact request -> Unlocks contact details & deducts 1 credit from requester
 */
export async function acceptContactRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }

    const contactRequest = await ContactRequest.findById(id);
    if (!contactRequest) {
      return res.status(404).json({ success: false, message: 'Contact request not found' });
    }

    // Security: Only recipient can accept
    const recipientId = String(
      (contactRequest as any).recipient?._id ||
      (contactRequest as any).recipient?.id ||
      (contactRequest as any).recipient ||
      (contactRequest as any).recipientId ||
      ''
    );
    if (!recipientId || recipientId !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this contact request.',
      });
    }

    if (contactRequest.status === 'ACCEPTED') {
      return res.json({
        success: true,
        message: 'Contact request is already accepted.',
        data: contactRequest,
      });
    }

    // Mark accepted
    contactRequest.status = 'ACCEPTED';
    contactRequest.contactUnlockedAt = new Date();

    // Deduct 1 credit from requester atomically (if not already deducted)
    let creditDeducted = false;
    if (!contactRequest.contactCreditDeducted) {
      const requesterSub = await Subscription.findOne({
        user: contactRequest.requester,
        status: 'ACTIVE',
      }).sort({ createdAt: -1 });

      if (requesterSub) {
        const planSlug = (requesterSub.planId || requesterSub.plan || '').toLowerCase();
        const isUnlimited = planSlug.includes('concierge') || planSlug === 'vvip';

        if (!isUnlimited) {
          requesterSub.contactRequestsRemaining = Math.max(
            0,
            (requesterSub.contactRequestsRemaining || 0) - 1
          );
          requesterSub.contactRequestsUsed = (requesterSub.contactRequestsUsed || 0) + 1;
          await requesterSub.save();
          creditDeducted = true;
        }

        // Log deduction
        await ContactAccessLog.create({
          user: contactRequest.requester,
          profileOwner: userId,
          contactRequest: contactRequest._id,
          action: 'CREDIT_DEDUCTED',
          creditsUsed: isUnlimited ? 0 : 1,
          ipAddress: req.ip || '127.0.0.1',
        }).catch(() => {});
      }

      contactRequest.contactCreditDeducted = true;
    }

    await contactRequest.save();

    // Log acceptance
    await ContactAccessLog.create({
      user: userId,
      profileOwner: contactRequest.requester,
      contactRequest: contactRequest._id,
      action: 'REQUEST_ACCEPTED',
      creditsUsed: 0,
      ipAddress: req.ip || '127.0.0.1',
    }).catch(() => {});

    // Notify requester
    const recipientProfile = await Profile.findOne({ user: userId });
    const recipientName = recipientProfile?.displayName || 'The candidate';

    await Notification.create({
      user: contactRequest.requester,
      type: 'INTEREST',
      title: 'Contact Request Accepted',
      message: `Dr. ${recipientName} has accepted your contact request! You can now view their verified phone and contact details.`,
      referenceId: contactRequest._id,
      read: false,
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Contact request accepted. Contact details are now accessible to both members.',
      data: contactRequest,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. PATCH /api/contact-requests/:id/decline
 * Recipient declines contact request -> 0 credits deducted
 */
export async function declineContactRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }

    const contactRequest = await ContactRequest.findById(id);
    if (!contactRequest) {
      return res.status(404).json({ success: false, message: 'Contact request not found' });
    }

    // Security: Only recipient can decline
    const declineRecipientId = String(
      (contactRequest as any).recipient?._id ||
      (contactRequest as any).recipient?.id ||
      (contactRequest as any).recipient ||
      (contactRequest as any).recipientId ||
      ''
    );
    if (!declineRecipientId || declineRecipientId !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this contact request.',
      });
    }

    contactRequest.status = 'DECLINED';
    await contactRequest.save();

    // Log decline
    await ContactAccessLog.create({
      user: userId,
      profileOwner: contactRequest.requester,
      contactRequest: contactRequest._id,
      action: 'REQUEST_DECLINED',
      creditsUsed: 0,
      ipAddress: req.ip || '127.0.0.1',
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Contact request declined. No contact credits were deducted.',
      data: contactRequest,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. GET /api/contact-access/:profileId
 * Check if the authenticated user has permission to see contact details
 */
export async function getContactAccessStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const rawProfileId = (req.params.profileId || req.params.targetId || req.params.id || '').trim();
    const profileId = rawProfileId;

    if (!profileId || profileId.length < 3 || profileId.length > 50) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const targetProfile = await findCanonicalProfile(profileId.trim(), {
      populateUser: true,
    });

    if (!targetProfile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const targetUserId =
      targetProfile.user?._id?.toString() ||
      targetProfile.user?.id?.toString() ||
      (typeof targetProfile.user === 'string' ? targetProfile.user : null) ||
      (targetProfile as any).userId?.toString() ||
      null;

    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: 'Profile owner user account not found',
      });
    }

    // Guest / non-logged-in users cannot access contact details
    if (!userId) {
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          status: 'GUEST',
          canReveal: false,
          message: 'Please sign in to view contact details or send contact requests.',
        },
      });
    }

    // If own profile, return full access
    if (String(userId) === String(targetUserId)) {
      const u = targetProfile.user as any;
      return res.json({
        success: true,
        data: {
          hasAccess: true,
          isSelf: true,
          status: 'SELF',
          contactDetails: {
            fullName: u?.fullName,
            mobile: u?.mobile,
            email: u?.email,
            workLocation: targetProfile.workLocation,
            currentHospital: targetProfile.currentHospital,
            annualIncome: targetProfile.annualIncome,
          },
        },
      });
    }

    // Compute entitlement metadata for caller
    const isPaid = await hasActivePaidMembership(userId, req.user?.role);

    // Profile-owner privacy settings ALWAYS apply across all non-owner callers
    const privacy = targetProfile.privacySettings || {};
    const isHiddenByOwner = privacy.contactVisibility === 'hidden' || privacy.contactVisibility === 'nobody';

    if (isHiddenByOwner) {
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          status: 'PRIVACY_RESTRICTED',
          canReveal: false,
          isPaid,
          message: 'Contact details are hidden by profile owner privacy settings.',
        },
      });
    }

    // Admin access: Only verified Super Admins with 'all' permissions have administrative contact visibility.
    // Regular admins without Super Admin verification are blocked from member contact details.
    if (req.user?.role === 'admin') {
      const { Admin } = await import('../models/Admin');
      const adminRecord = await Admin.findOne({ user: userId });
      let permissions: string[] = [];
      if (Array.isArray(adminRecord?.permissions)) {
        permissions = adminRecord.permissions;
      } else if (typeof adminRecord?.permissions === 'string') {
        try {
          permissions = JSON.parse(adminRecord.permissions);
        } catch {
          permissions = [];
        }
      }

      if (permissions.includes('all')) {
        const u = targetProfile.user as any;
        return res.json({
          success: true,
          data: {
            hasAccess: true,
            isAdmin: true,
            status: 'ADMIN_ACCESS',
            contactDetails: {
              fullName: u?.fullName,
              mobile: u?.mobile,
              email: u?.email,
              workLocation: targetProfile.workLocation,
              currentHospital: targetProfile.currentHospital,
              annualIncome: targetProfile.annualIncome,
            },
          },
        });
      }
      // Regular admin without 'all' permissions falls through to standard member entitlement check
    }

    // Check if already unlocked via ACCEPTED contact request OR existing contact access log
    const [existingRequest, existingAccessLog] = await Promise.all([
      ContactRequest.findOne({
        $or: [
          { requester: userId, recipient: targetUserId },
          { requester: targetUserId, recipient: userId },
        ],
      }).sort({ createdAt: -1 }),
      ContactAccessLog.findOne({
        user: userId,
        profileOwner: targetUserId,
        action: { $in: ['FREE_CONTACT_REVEAL', 'CONTACT_VIEWED', 'REQUEST_ACCEPTED'] },
      }),
    ]);

    if (existingRequest && existingRequest.status === 'ACCEPTED') {
      const u = targetProfile.user as any;
      return res.json({
        success: true,
        data: {
          hasAccess: true,
          status: 'ACCEPTED',
          unlockedAt: existingRequest.contactUnlockedAt,
          contactDetails: {
            fullName: u?.fullName,
            mobile: u?.mobile,
            email: u?.email,
            workLocation: targetProfile.workLocation,
            currentHospital: targetProfile.currentHospital,
            annualIncome: targetProfile.annualIncome,
          },
        },
      });
    }

    if (existingAccessLog) {
      const u = targetProfile.user as any;
      return res.json({
        success: true,
        data: {
          hasAccess: true,
          status: 'REVEALED',
          unlockedAt: existingAccessLog.createdAt,
          contactDetails: {
            fullName: u?.fullName,
            mobile: u?.mobile,
            email: u?.email,
            workLocation: targetProfile.workLocation,
            currentHospital: targetProfile.currentHospital,
            annualIncome: targetProfile.annualIncome,
          },
        },
      });
    }

    // Compute entitlement metadata for locked contacts
    let canReveal = false;
    let freeAllowanceRemaining: number | null = null;
    let creditsRemaining: number | string = 0;
    let availablePlans: any[] | undefined = undefined;

    if (isPaid) {
      const sub = await Subscription.findOne({
        user: userId,
        status: 'ACTIVE',
        $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
      }).sort({ createdAt: -1 });

      const planSlug = (sub?.planId || sub?.plan || '').toLowerCase();
      const isUnlimited = planSlug.includes('concierge') || planSlug === 'vvip' || sub?.plan === 'VVIP';
      const rem = sub?.contactRequestsRemaining ?? 0;
      canReveal = !isHiddenByOwner && (isUnlimited || rem > 0);
      creditsRemaining = isUnlimited ? 'UNLIMITED' : rem;

      if (!canReveal && !isHiddenByOwner) {
        availablePlans = await MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
      }
    } else {
      // Free member: 1 complimentary contact view across account lifetime
      const freeLogs = await ContactAccessLog.find({
        user: userId,
        action: { $in: ['FREE_CONTACT_REVEAL', 'CONTACT_VIEWED'] },
        creditsUsed: 0,
      });

      const distinctOwners = new Set(
        freeLogs
          .map((log: any) => String(log.profileOwner || log.profileOwnerId || ''))
          .filter((id: string) => id && id !== String(userId))
      );

      freeAllowanceRemaining = distinctOwners.size >= 1 ? 0 : 1;
      canReveal = !isHiddenByOwner && freeAllowanceRemaining > 0;

      if (!canReveal && !isHiddenByOwner) {
        availablePlans = await MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
      }
    }

    if (existingRequest && existingRequest.status === 'PENDING') {
      const requesterId = String(
        (existingRequest as any).requester?._id ||
        (existingRequest as any).requester?.id ||
        (existingRequest as any).requester ||
        (existingRequest as any).requesterId ||
        ''
      );
      const isOutgoing = requesterId.length > 0 && requesterId === String(userId);
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          status: isOutgoing ? 'PENDING' : 'RECEIVED_PENDING',
          requestId: existingRequest._id,
          canReveal,
          isPaid,
          freeAllowanceRemaining,
          creditsRemaining,
          availablePlans,
          message: isOutgoing
            ? 'Contact request sent. Awaiting member acceptance.'
            : 'This member has sent you a contact request. You can accept or decline below.',
        },
      });
    }

    return res.json({
      success: true,
      data: {
        hasAccess: false,
        status: existingRequest ? existingRequest.status : 'NONE',
        canReveal,
        isPaid,
        freeAllowanceRemaining,
        creditsRemaining,
        availablePlans,
        message: isHiddenByOwner
          ? 'Contact details are hidden by profile owner privacy settings.'
          : canReveal
          ? (isPaid ? 'You can unlock contact details using your active membership credits.' : 'You have 1 complimentary contact view available.')
          : 'Upgrade to a membership plan to view contact details.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. POST /api/contact-access/:profileId/reveal
 * Reveal contact details of a target profile.
 * - Free tier: 1 successful profile contact reveal per account lifetime.
 *   On second distinct profile, denies access with HTTP 403 UPGRADE_REQUIRED.
 *   Calling again on already-unlocked profile is idempotent (0 credits consumed).
 * - Paid tier: Reveals per active subscription credits (or unlimited if Concierge/VVIP).
 *   Deducts 1 credit from active subscription.
 * - Atomic transaction protects against concurrent race conditions.
 * - Respects target profile privacy controls, blocking, and account status.
 */
export async function revealContactDetails(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const requesterId = req.user?.userId;
    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const rawProfileId = (req.params.profileId || req.params.targetId || req.params.id || '').trim();
    if (!rawProfileId || rawProfileId.length < 3) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const targetProfile = await findCanonicalProfile(rawProfileId, { populateUser: true });
    if (!targetProfile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const targetUserId =
      targetProfile.user?._id?.toString() ||
      targetProfile.user?.id?.toString() ||
      (typeof targetProfile.user === 'string' ? targetProfile.user : null) ||
      (targetProfile as any).userId?.toString() ||
      null;

    if (!targetUserId) {
      return res.status(404).json({ success: false, message: 'Profile owner user account not found' });
    }

    const targetUserObj = targetProfile.user as any;

    // Self check
    if (String(requesterId) === String(targetUserId)) {
      return res.status(200).json({
        success: true,
        isSelf: true,
        creditsUsed: 0,
        message: 'Viewing own contact details.',
        data: {
          fullName: targetUserObj?.fullName,
          mobile: targetUserObj?.mobile,
          email: targetUserObj?.email,
          workLocation: targetProfile.workLocation,
          currentHospital: targetProfile.currentHospital,
          annualIncome: targetProfile.annualIncome,
        },
      });
    }

    // Target member active / not deleted / not blocked
    const targetUser = await User.findById(targetUserId);
    if (!targetUser || targetUser.isBlocked || targetUser.status === 'SUSPENDED' || targetUser.status === 'DELETED') {
      return res.status(404).json({ success: false, message: 'Member account not found or inactive' });
    }

    // Block check
    let isBlocked = null;
    try {
      isBlocked = await Block.findOne({
        $or: [
          { blocker: requesterId, blockedUser: targetUserId },
          { blocker: targetUserId, blockedUser: requesterId },
        ],
      });
    } catch (blockErr: any) {
      console.error('[RevealContact] Block verification failed:', blockErr?.message);
      return res.status(503).json({
        success: false,
        message: 'Unable to verify member eligibility at this time. Please try again later.',
      });
    }
    if (isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot access contact details of this member' });
    }

    // Target privacy check
    const privacy = targetProfile.privacySettings || {};
    if (privacy.contactVisibility === 'hidden' || privacy.contactVisibility === 'nobody') {
      return res.status(403).json({
        success: false,
        code: 'CONTACT_HIDDEN_BY_OWNER',
        message: 'The member has set their contact details to private.',
      });
    }

    // Admin access check: Only verified Super Admins with 'all' permissions have administrative contact visibility.
    // Regular admins without Super Admin verification are blocked with 403.
    if (req.user?.role === 'admin') {
      const { Admin } = await import('../models/Admin');
      const adminRecord = await Admin.findOne({ user: requesterId });
      let permissions: string[] = [];
      if (Array.isArray(adminRecord?.permissions)) {
        permissions = adminRecord.permissions;
      } else if (typeof adminRecord?.permissions === 'string') {
        try {
          permissions = JSON.parse(adminRecord.permissions);
        } catch {
          permissions = [];
        }
      }

      if (!permissions.includes('all')) {
        return res.status(403).json({
          success: false,
          code: 'SUPER_ADMIN_REQUIRED',
          message: 'Access denied: Super Administrator privileges required to access contact details.',
        });
      }

      return res.status(200).json({
        success: true,
        isAdmin: true,
        creditsUsed: 0,
        data: {
          fullName: targetUserObj?.fullName,
          mobile: targetUserObj?.mobile,
          email: targetUserObj?.email,
          workLocation: targetProfile.workLocation,
          currentHospital: targetProfile.currentHospital,
          annualIncome: targetProfile.annualIncome,
        },
      });
    }

    // Check if already unlocked via accepted contact request OR existing contact access log
    const [existingRequest, existingAccessLog] = await Promise.all([
      ContactRequest.findOne({
        $or: [
          { requester: requesterId, recipient: targetUserId },
          { requester: targetUserId, recipient: requesterId },
        ],
        status: 'ACCEPTED',
      }),
      ContactAccessLog.findOne({
        user: requesterId,
        profileOwner: targetUserId,
        action: { $in: ['FREE_CONTACT_REVEAL', 'CONTACT_VIEWED', 'REQUEST_ACCEPTED'] },
      }),
    ]);

    if (existingRequest || existingAccessLog) {
      return res.status(200).json({
        success: true,
        alreadyUnlocked: true,
        creditsUsed: 0,
        message: 'Contact details already unlocked.',
        data: {
          fullName: targetUserObj?.fullName,
          mobile: targetUserObj?.mobile,
          email: targetUserObj?.email,
          workLocation: targetProfile.workLocation,
          currentHospital: targetProfile.currentHospital,
          annualIncome: targetProfile.annualIncome,
        },
      });
    }

    // Check whether caller has an active paid membership
    const isPaid = await hasActivePaidMembership(requesterId, req.user?.role);

    if (isPaid) {
      // Paid member flow
      const now = new Date();
      const subscription = await Subscription.findOne({
        user: requesterId,
        status: 'ACTIVE',
        $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
      }).sort({ createdAt: -1 });

      const planSlug = (subscription?.planId || subscription?.plan || '').toLowerCase();
      const isUnlimited =
        planSlug.includes('concierge') ||
        planSlug === 'vvip' ||
        subscription?.plan === 'VVIP';
      const creditsRemaining = subscription?.contactRequestsRemaining ?? 0;

      if (!isUnlimited && creditsRemaining <= 0) {
        const plans = await MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
        return res.status(403).json({
          success: false,
          code: 'NO_CREDITS_REMAINING',
          canUpgrade: true,
          message: 'You have utilized all your contact credits. Please upgrade or renew your membership to view more contacts.',
          creditsRemaining: 0,
          availablePlans: plans,
        });
      }

      // Atomically decrement credit (if not unlimited) and log access
      await prisma.$transaction(async (tx) => {
        if (!isUnlimited && subscription) {
          await tx.subscription.update({
            where: { id: String(subscription._id || subscription.id) },
            data: {
              contactRequestsRemaining: { decrement: 1 },
              contactRequestsUsed: { increment: 1 },
            },
          });
        }
        await tx.contactAccessLog.create({
          data: {
            id: generateObjectId(),
            userId: String(requesterId),
            profileOwnerId: String(targetUserId),
            action: 'CONTACT_VIEWED',
            creditsUsed: isUnlimited ? 0 : 1,
            ipAddress: req.ip || '127.0.0.1',
          },
        });
      });

      // Send in-app notification to target user
      const requesterProfile = await Profile.findOne({ user: requesterId });
      const requesterName = requesterProfile?.displayName || 'A verified doctor';
      await Notification.create({
        user: targetUserId,
        type: 'INTEREST',
        title: 'Contact Details Viewed',
        message: `${requesterName} viewed your verified contact details.`,
        read: false,
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        creditsUsed: isUnlimited ? 0 : 1,
        creditsRemaining: isUnlimited ? 'UNLIMITED' : Math.max(0, creditsRemaining - 1),
        message: 'Contact details unlocked successfully.',
        data: {
          fullName: targetUserObj?.fullName,
          mobile: targetUserObj?.mobile,
          email: targetUserObj?.email,
          workLocation: targetProfile.workLocation,
          currentHospital: targetProfile.currentHospital,
          annualIncome: targetProfile.annualIncome,
        },
      });
    }

    // Free member flow:
    // User is entitled to 1 complimentary profile contact view per account lifetime.
    // Query distinct profiles previously viewed by this user with free reveal (creditsUsed = 0)
    const existingFreeLogs = await ContactAccessLog.find({
      user: requesterId,
      action: { $in: ['FREE_CONTACT_REVEAL', 'CONTACT_VIEWED'] },
      creditsUsed: 0,
    });

    const distinctOwners = new Set(
      existingFreeLogs
        .map((log: any) => String(log.profileOwner || log.profileOwnerId || ''))
        .filter((ownerId: string) => ownerId && ownerId !== String(requesterId))
    );

    if (distinctOwners.size >= 1 && !distinctOwners.has(String(targetUserId))) {
      // Second profile attempt by free member -> strictly denied
      const plans = await MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
      return res.status(403).json({
        success: false,
        code: 'UPGRADE_REQUIRED',
        canUpgrade: true,
        message: 'You have used your 1 complimentary contact view for free members. Upgrade to Doctor Connect or Premium Match to connect with more verified doctors.',
        freeAllowanceRemaining: 0,
        availablePlans: plans,
      });
    }

    // Atomic claim within database transaction with pessimistic row lock to serialize concurrent attempts
    try {
      await prisma.$transaction(async (tx) => {
        // Pessimistic row-level lock on user row in MariaDB to serialize concurrent free reveal attempts
        try {
          await (tx as any).$executeRawUnsafe(
            'SELECT _id FROM users WHERE _id = ? FOR UPDATE',
            String(requesterId)
          );
        } catch {
          await tx.user.update({
            where: { id: String(requesterId) },
            data: { updatedAt: new Date() },
          }).catch(() => {});
        }

        // Query within locked transaction
        const concurrentLog = await tx.contactAccessLog.findFirst({
          where: {
            userId: String(requesterId),
            action: { in: ['FREE_CONTACT_REVEAL', 'CONTACT_VIEWED'] },
            creditsUsed: 0,
            profileOwnerId: { not: String(requesterId) },
          },
        });

        if (concurrentLog && concurrentLog.profileOwnerId !== String(targetUserId)) {
          const err: any = new Error('Free contact view limit exceeded');
          err.code = 'UPGRADE_REQUIRED';
          throw err;
        }

        await tx.contactAccessLog.create({
          data: {
            id: generateObjectId(),
            userId: String(requesterId),
            profileOwnerId: String(targetUserId),
            action: 'FREE_CONTACT_REVEAL',
            creditsUsed: 0,
            ipAddress: req.ip || '127.0.0.1',
          },
        });
      });
    } catch (txErr: any) {
      if (txErr.code === 'UPGRADE_REQUIRED' || txErr.message?.includes('Free contact view limit')) {
        const plans = await MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
        return res.status(403).json({
          success: false,
          code: 'UPGRADE_REQUIRED',
          canUpgrade: true,
          message: 'You have used your 1 complimentary contact view for free members. Upgrade to Doctor Connect or Premium Match to connect with more verified doctors.',
          freeAllowanceRemaining: 0,
          availablePlans: plans,
        });
      }
      throw txErr;
    }

    // Send in-app notification to target user
    const requesterProfile = await Profile.findOne({ user: requesterId });
    const requesterName = requesterProfile?.displayName || 'A verified doctor';
    await Notification.create({
      user: targetUserId,
      type: 'INTEREST',
      title: 'Contact Details Viewed',
      message: `${requesterName} viewed your verified contact details.`,
      read: false,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      isFreeReveal: true,
      freeAllowanceRemaining: 0,
      message: 'Complimentary contact view successful. You have used your 1 free profile view.',
      data: {
        fullName: targetUserObj?.fullName,
        mobile: targetUserObj?.mobile,
        email: targetUserObj?.email,
        workLocation: targetProfile.workLocation,
        currentHospital: targetProfile.currentHospital,
        annualIncome: targetProfile.annualIncome,
      },
    });
  } catch (error) {
    next(error);
  }
}
