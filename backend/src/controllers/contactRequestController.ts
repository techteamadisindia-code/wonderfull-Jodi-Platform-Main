import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import { ContactRequest } from '../models/ContactRequest';
import { ContactAccessLog } from '../models/ContactAccessLog';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Notification } from '../models/Notification';
import { MembershipPlan } from '../models/MembershipPlan';

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

    const { recipientId, profileId, message } = req.body;

    let targetUserId: string | null = recipientId || null;

    // If profileId provided, resolve user from Profile
    if (!targetUserId && profileId) {
      if (!mongoose.Types.ObjectId.isValid(profileId)) {
        return res.status(400).json({ success: false, message: 'Invalid profile ID' });
      }
      const profile = await Profile.findById(profileId);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }
      targetUserId = profile.user.toString();
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID or Profile ID is required to request contact.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
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

    // 1. Check requester's subscription & credit availability
    const now = new Date();
    const subscription = await Subscription.findOne({
      user: requesterId,
      status: 'ACTIVE',
      $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
    }).sort({ createdAt: -1 });

    const planSlug = (subscription?.planId || subscription?.plan || 'free').toLowerCase();
    const isFreePlan = !subscription || planSlug === 'free';

    if (isFreePlan) {
      return res.status(403).json({
        success: false,
        canUpgrade: true,
        code: 'FREE_PLAN_NO_CREDITS',
        message:
          'Contact requests require an active membership. Free plans include 0 contact requests. Please choose Doctor Connect or Premium Match to connect directly.',
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
      recipient: targetUserId,
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
    const requesterIds = incomingRequests.map((r: any) => r.requester?._id).filter(Boolean);
    const recipientIds = outgoingRequests.map((r: any) => r.recipient?._id).filter(Boolean);

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
      const uId = reqItem.requester?._id?.toString();
      return {
        ...reqItem.toObject(),
        profile: uId ? reqProfileMap.get(uId) || null : null,
      };
    });

    const formatOutgoing = outgoingRequests.map((reqItem: any) => {
      const uId = reqItem.recipient?._id?.toString();
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
    if (contactRequest.recipient.toString() !== userId.toString()) {
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
      recipient: contactRequest.requester,
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
    if (contactRequest.recipient.toString() !== userId.toString()) {
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
    const { profileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const targetProfile = await Profile.findById(profileId).populate(
      'user',
      'fullName email mobile verified verificationStatus'
    );

    if (!targetProfile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const targetUserId = targetProfile.user?._id?.toString() || targetProfile.user?.toString();

    // Guest / non-logged-in users cannot access contact details
    if (!userId) {
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          status: 'GUEST',
          message: 'Please sign in and request contact details to connect.',
        },
      });
    }

    // If own profile, return full access
    if (userId.toString() === targetUserId) {
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

    // If admin, return full access
    if (req.user?.role === 'admin') {
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

    // Check mutual contact request status
    const existingRequest = await ContactRequest.findOne({
      $or: [
        { requester: userId, recipient: targetUserId },
        { requester: targetUserId, recipient: userId },
      ],
    }).sort({ createdAt: -1 });

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

    if (existingRequest && existingRequest.status === 'PENDING') {
      const isOutgoing = existingRequest.requester.toString() === userId.toString();
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          status: isOutgoing ? 'PENDING' : 'RECEIVED_PENDING',
          requestId: existingRequest._id,
          message: isOutgoing
            ? 'Contact request sent. Awaiting member acceptance.'
            : 'This member has sent you a contact request. You can accept or decline below.',
        },
      });
    }

    // No active request
    return res.json({
      success: true,
      data: {
        hasAccess: false,
        status: existingRequest ? existingRequest.status : 'NONE',
        message: 'Contact details are protected for your privacy.',
      },
    });
  } catch (error) {
    next(error);
  }
}
