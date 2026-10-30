"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContactRequest = createContactRequest;
exports.getContactRequests = getContactRequests;
exports.acceptContactRequest = acceptContactRequest;
exports.declineContactRequest = declineContactRequest;
exports.getContactAccessStatus = getContactAccessStatus;
exports.revealContactDetails = revealContactDetails;
const prismaBridge_1 = __importDefault(require("../db/prismaBridge"));
const client_1 = require("../db/client");
const entitlementService_1 = require("../services/entitlementService");
const ContactRequest_1 = require("../models/ContactRequest");
const ContactAccessLog_1 = require("../models/ContactAccessLog");
const Subscription_1 = require("../models/Subscription");
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const Notification_1 = require("../models/Notification");
const MembershipPlan_1 = require("../models/MembershipPlan");
const Block_1 = require("../models/Block");
const securityUtils_1 = require("../utils/securityUtils");
const profileController_1 = require("./profileController");
const permissionUtils_1 = require("../utils/permissionUtils");
/**
 * 1. POST /api/contact-requests
 * Send a new contact request to a member
 */
async function createContactRequest(req, res, next) {
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
        let targetUserId = null;
        // 1. Resolve via canonical profile (supports candidate ID like WJ-100092, profile _id, or legacy WJ-[hex])
        const resolvedProfile = await (0, profileController_1.findCanonicalProfile)(rawTarget);
        if (resolvedProfile) {
            const u = resolvedProfile.user || resolvedProfile.userId;
            if (u) {
                targetUserId = String(u._id || u.id || u);
            }
        }
        // 2. Direct User lookup if rawTarget is an ObjectId or UUID format
        if (!targetUserId && ((0, securityUtils_1.isValidObjectId)(rawTarget) || /^[0-9a-fA-F]{24}$/.test(rawTarget) || /^[0-9a-fA-F-]{36}$/.test(rawTarget))) {
            const directUser = await User_1.User.findById(rawTarget).select('_id');
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
        const recipientUser = await User_1.User.findById(targetUserId);
        if (!recipientUser) {
            return res.status(404).json({ success: false, message: 'Member account not found' });
        }
        if (recipientUser.isBlocked || recipientUser.status === 'SUSPENDED' || recipientUser.status === 'DELETED') {
            return res.status(404).json({ success: false, message: 'Member account not found or inactive' });
        }
        // Fail-closed block check: do not allow contact requests if blocked or if block query fails
        let isBlocked = null;
        try {
            isBlocked = await Block_1.Block.findOne({
                $or: [
                    { blocker: requesterId, blockedUser: targetUserId },
                    { blocker: targetUserId, blockedUser: requesterId },
                ],
            });
        }
        catch (blockErr) {
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
        const subscription = await Subscription_1.Subscription.findOne({
            user: requesterId,
            status: 'ACTIVE',
            $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
        }).sort({ createdAt: -1 });
        const planSlug = (subscription?.planId || subscription?.plan || 'free').toLowerCase();
        const isFreePlan = !subscription || planSlug === 'free';
        const isPaidMember = await (0, entitlementService_1.hasActivePaidMembership)(requesterId, req.user?.role);
        if (!isPaidMember || isFreePlan) {
            const activePlans = await MembershipPlan_1.MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
            return res.status(403).json({
                success: false,
                canUpgrade: true,
                code: 'FREE_PLAN_NO_CREDITS',
                message: 'Contact requests require an active paid membership. Free plans do not include contact requests. Please choose Doctor Connect or Premium Match to connect directly.',
                availablePlans: activePlans,
            });
        }
        // Determine plan limits
        const isUnlimited = planSlug.includes('concierge') ||
            planSlug === 'vvip' ||
            subscription?.plan === 'VVIP';
        const creditsRemaining = subscription?.contactRequestsRemaining ?? 0;
        if (!isUnlimited && creditsRemaining <= 0) {
            return res.status(403).json({
                success: false,
                canUpgrade: true,
                code: 'NO_CREDITS_REMAINING',
                message: 'You have utilized all your contact request credits. Please upgrade or renew your membership to send more contact requests.',
            });
        }
        // 2. Check for existing request between requester and recipient
        const existingRequest = await ContactRequest_1.ContactRequest.findOne({
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
        const newRequest = await ContactRequest_1.ContactRequest.create({
            requester: requesterId,
            recipient: targetUserId,
            status: 'PENDING',
            contactCreditDeducted: false,
            contactUnlockedAt: null,
            message: message || '',
        });
        // 4. Log creation in ContactAccessLog
        await ContactAccessLog_1.ContactAccessLog.create({
            user: requesterId,
            profileOwner: targetUserId,
            contactRequest: newRequest._id,
            action: 'REQUEST_CREATED',
            creditsUsed: 0,
            ipAddress: req.ip || '127.0.0.1',
        }).catch(() => { });
        // 5. Send In-App Notification to recipient
        const requesterProfile = await Profile_1.Profile.findOne({ user: requesterId });
        const requesterName = requesterProfile?.displayName || 'A verified doctor';
        await Notification_1.Notification.create({
            user: targetUserId,
            type: 'INTEREST',
            title: 'New Contact Request',
            message: `${requesterName} has requested to view your contact information.`,
            referenceId: newRequest._id,
            read: false,
        }).catch(() => { });
        res.status(201).json({
            success: true,
            message: 'Contact request sent securely. Your contact credit will only be deducted once the doctor accepts your request.',
            data: newRequest,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * 2. GET /api/contact-requests
 * Retrieve user's incoming and outgoing contact requests
 */
async function getContactRequests(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const [incomingRequests, outgoingRequests] = await Promise.all([
            ContactRequest_1.ContactRequest.find({ recipient: userId })
                .populate('requester', 'fullName email mobile verified verificationStatus')
                .sort({ createdAt: -1 }),
            ContactRequest_1.ContactRequest.find({ requester: userId })
                .populate('recipient', 'fullName email mobile verified verificationStatus')
                .sort({ createdAt: -1 }),
        ]);
        // Attach profile summaries for UI presentation
        const requesterIds = incomingRequests.map((r) => r.requester?._id || r.requester?.id || (typeof r.requester === 'string' ? r.requester : r.requesterId)).filter(Boolean).map(String);
        const recipientIds = outgoingRequests.map((r) => r.recipient?._id || r.recipient?.id || (typeof r.recipient === 'string' ? r.recipient : r.recipientId)).filter(Boolean).map(String);
        const [requesterProfiles, recipientProfiles] = await Promise.all([
            Profile_1.Profile.find({ user: { $in: requesterIds } }).select('user displayName primaryPhoto degree education profession city state'),
            Profile_1.Profile.find({ user: { $in: recipientIds } }).select('user displayName primaryPhoto degree education profession city state'),
        ]);
        const reqProfileMap = new Map(requesterProfiles.map((p) => [p.user.toString(), p]));
        const recProfileMap = new Map(recipientProfiles.map((p) => [p.user.toString(), p]));
        const formatIncoming = incomingRequests.map((reqItem) => {
            const uId = String(reqItem.requester?._id || reqItem.requester?.id || reqItem.requester || reqItem.requesterId || '');
            return {
                ...reqItem.toObject(),
                profile: uId ? reqProfileMap.get(uId) || null : null,
            };
        });
        const formatOutgoing = outgoingRequests.map((reqItem) => {
            const uId = String(reqItem.recipient?._id || reqItem.recipient?.id || reqItem.recipient || reqItem.recipientId || '');
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
    }
    catch (error) {
        next(error);
    }
}
/**
 * 3. PATCH /api/contact-requests/:id/accept
 * Recipient accepts contact request -> Unlocks contact details & deducts 1 credit from requester
 */
async function acceptContactRequest(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { id } = req.params;
        if (!prismaBridge_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID' });
        }
        const contactRequest = await ContactRequest_1.ContactRequest.findById(id);
        if (!contactRequest) {
            return res.status(404).json({ success: false, message: 'Contact request not found' });
        }
        // Security: Only recipient can accept
        const recipientId = String(contactRequest.recipient?._id ||
            contactRequest.recipient?.id ||
            contactRequest.recipient ||
            contactRequest.recipientId ||
            '');
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
            const requesterSub = await Subscription_1.Subscription.findOne({
                user: contactRequest.requester,
                status: 'ACTIVE',
            }).sort({ createdAt: -1 });
            if (requesterSub) {
                const planSlug = (requesterSub.planId || requesterSub.plan || '').toLowerCase();
                const isUnlimited = planSlug.includes('concierge') || planSlug === 'vvip';
                if (!isUnlimited) {
                    requesterSub.contactRequestsRemaining = Math.max(0, (requesterSub.contactRequestsRemaining || 0) - 1);
                    requesterSub.contactRequestsUsed = (requesterSub.contactRequestsUsed || 0) + 1;
                    await requesterSub.save();
                    creditDeducted = true;
                }
                // Log deduction
                await ContactAccessLog_1.ContactAccessLog.create({
                    user: contactRequest.requester,
                    profileOwner: userId,
                    contactRequest: contactRequest._id,
                    action: 'CREDIT_DEDUCTED',
                    creditsUsed: isUnlimited ? 0 : 1,
                    ipAddress: req.ip || '127.0.0.1',
                }).catch(() => { });
            }
            contactRequest.contactCreditDeducted = true;
        }
        await contactRequest.save();
        // Log acceptance
        await ContactAccessLog_1.ContactAccessLog.create({
            user: userId,
            profileOwner: contactRequest.requester,
            contactRequest: contactRequest._id,
            action: 'REQUEST_ACCEPTED',
            creditsUsed: 0,
            ipAddress: req.ip || '127.0.0.1',
        }).catch(() => { });
        // Notify requester
        const recipientProfile = await Profile_1.Profile.findOne({ user: userId });
        const recipientName = recipientProfile?.displayName || 'The candidate';
        await Notification_1.Notification.create({
            user: contactRequest.requester,
            type: 'INTEREST',
            title: 'Contact Request Accepted',
            message: `Dr. ${recipientName} has accepted your contact request! You can now view their verified phone and contact details.`,
            referenceId: contactRequest._id,
            read: false,
        }).catch(() => { });
        res.json({
            success: true,
            message: 'Contact request accepted. Contact details are now accessible to both members.',
            data: contactRequest,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * 4. PATCH /api/contact-requests/:id/decline
 * Recipient declines contact request -> 0 credits deducted
 */
async function declineContactRequest(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { id } = req.params;
        if (!prismaBridge_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID' });
        }
        const contactRequest = await ContactRequest_1.ContactRequest.findById(id);
        if (!contactRequest) {
            return res.status(404).json({ success: false, message: 'Contact request not found' });
        }
        // Security: Only recipient can decline
        const declineRecipientId = String(contactRequest.recipient?._id ||
            contactRequest.recipient?.id ||
            contactRequest.recipient ||
            contactRequest.recipientId ||
            '');
        if (!declineRecipientId || declineRecipientId !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to decline this contact request.',
            });
        }
        contactRequest.status = 'DECLINED';
        await contactRequest.save();
        // Log decline
        await ContactAccessLog_1.ContactAccessLog.create({
            user: userId,
            profileOwner: contactRequest.requester,
            contactRequest: contactRequest._id,
            action: 'REQUEST_DECLINED',
            creditsUsed: 0,
            ipAddress: req.ip || '127.0.0.1',
        }).catch(() => { });
        res.json({
            success: true,
            message: 'Contact request declined. No contact credits were deducted.',
            data: contactRequest,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * 5. GET /api/contact-access/:profileId
 * Check if the authenticated user has permission to see contact details
 */
async function getContactAccessStatus(req, res, next) {
    try {
        const userId = req.user?.userId;
        const rawProfileId = (req.params.profileId || req.params.targetId || req.params.id || '').trim();
        const profileId = rawProfileId;
        if (!profileId || profileId.length < 3 || profileId.length > 50) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const targetProfile = await (0, profileController_1.findCanonicalProfile)(profileId.trim(), {
            populateUser: true,
        });
        if (!targetProfile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const targetUserId = targetProfile.user?._id?.toString() ||
            targetProfile.user?.id?.toString() ||
            (typeof targetProfile.user === 'string' ? targetProfile.user : null) ||
            targetProfile.userId?.toString() ||
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
            const u = targetProfile.user;
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
        const isPaid = await (0, entitlementService_1.hasActivePaidMembership)(userId, req.user?.role);
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
            const { Admin } = await Promise.resolve().then(() => __importStar(require('../models/Admin')));
            const adminRecord = await Admin.findOne({ user: userId });
            if (adminRecord && (0, permissionUtils_1.hasSuperAdminPermission)(adminRecord.permissions)) {
                const u = targetProfile.user;
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
            ContactRequest_1.ContactRequest.findOne({
                $or: [
                    { requester: userId, recipient: targetUserId },
                    { requester: targetUserId, recipient: userId },
                ],
            }).sort({ createdAt: -1 }),
            ContactAccessLog_1.ContactAccessLog.findOne({
                user: userId,
                profileOwner: targetUserId,
                action: { $in: ['FREE_CONTACT_REVEAL', 'CONTACT_VIEWED', 'REQUEST_ACCEPTED'] },
            }),
        ]);
        if (existingRequest && existingRequest.status === 'ACCEPTED') {
            const u = targetProfile.user;
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
            const u = targetProfile.user;
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
        let freeAllowanceRemaining = null;
        let creditsRemaining = 0;
        let availablePlans = undefined;
        if (isPaid) {
            const sub = await Subscription_1.Subscription.findOne({
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
                availablePlans = await MembershipPlan_1.MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
            }
        }
        else {
            // Free member: 1 complimentary contact view across account lifetime
            const freeLogs = await ContactAccessLog_1.ContactAccessLog.find({
                user: userId,
                action: { $in: ['FREE_CONTACT_REVEAL', 'CONTACT_VIEWED'] },
                creditsUsed: 0,
            });
            const distinctOwners = new Set(freeLogs
                .map((log) => String(log.profileOwner || log.profileOwnerId || ''))
                .filter((id) => id && id !== String(userId)));
            freeAllowanceRemaining = distinctOwners.size >= 1 ? 0 : 1;
            canReveal = !isHiddenByOwner && freeAllowanceRemaining > 0;
            if (!canReveal && !isHiddenByOwner) {
                availablePlans = await MembershipPlan_1.MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
            }
        }
        if (existingRequest && existingRequest.status === 'PENDING') {
            const requesterId = String(existingRequest.requester?._id ||
                existingRequest.requester?.id ||
                existingRequest.requester ||
                existingRequest.requesterId ||
                '');
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
    }
    catch (error) {
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
async function revealContactDetails(req, res, next) {
    try {
        const requesterId = req.user?.userId;
        if (!requesterId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const rawProfileId = (req.params.profileId || req.params.targetId || req.params.id || '').trim();
        if (!rawProfileId || rawProfileId.length < 3) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const targetProfile = await (0, profileController_1.findCanonicalProfile)(rawProfileId, { populateUser: true });
        if (!targetProfile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const targetUserId = targetProfile.user?._id?.toString() ||
            targetProfile.user?.id?.toString() ||
            (typeof targetProfile.user === 'string' ? targetProfile.user : null) ||
            targetProfile.userId?.toString() ||
            null;
        if (!targetUserId) {
            return res.status(404).json({ success: false, message: 'Profile owner user account not found' });
        }
        const targetUserObj = targetProfile.user;
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
        const targetUser = await User_1.User.findById(targetUserId);
        if (!targetUser || targetUser.isBlocked || targetUser.status === 'SUSPENDED' || targetUser.status === 'DELETED') {
            return res.status(404).json({ success: false, message: 'Member account not found or inactive' });
        }
        // Block check
        let isBlocked = null;
        try {
            isBlocked = await Block_1.Block.findOne({
                $or: [
                    { blocker: requesterId, blockedUser: targetUserId },
                    { blocker: targetUserId, blockedUser: requesterId },
                ],
            });
        }
        catch (blockErr) {
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
            const { Admin } = await Promise.resolve().then(() => __importStar(require('../models/Admin')));
            const adminRecord = await Admin.findOne({ user: requesterId });
            if (!adminRecord || !(0, permissionUtils_1.hasSuperAdminPermission)(adminRecord.permissions)) {
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
            ContactRequest_1.ContactRequest.findOne({
                $or: [
                    { requester: requesterId, recipient: targetUserId },
                    { requester: targetUserId, recipient: requesterId },
                ],
                status: 'ACCEPTED',
            }),
            ContactAccessLog_1.ContactAccessLog.findOne({
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
        const isPaid = await (0, entitlementService_1.hasActivePaidMembership)(requesterId, req.user?.role);
        if (isPaid) {
            // Paid member flow
            const now = new Date();
            const subscription = await Subscription_1.Subscription.findOne({
                user: requesterId,
                status: 'ACTIVE',
                $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
            }).sort({ createdAt: -1 });
            const planSlug = (subscription?.planId || subscription?.plan || '').toLowerCase();
            const isUnlimited = planSlug.includes('concierge') ||
                planSlug === 'vvip' ||
                subscription?.plan === 'VVIP';
            const creditsRemaining = subscription?.contactRequestsRemaining ?? 0;
            if (!isUnlimited && creditsRemaining <= 0) {
                const plans = await MembershipPlan_1.MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
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
            await client_1.prisma.$transaction(async (tx) => {
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
                        id: (0, client_1.generateObjectId)(),
                        userId: String(requesterId),
                        profileOwnerId: String(targetUserId),
                        action: 'CONTACT_VIEWED',
                        creditsUsed: isUnlimited ? 0 : 1,
                        ipAddress: req.ip || '127.0.0.1',
                    },
                });
            });
            // Send in-app notification to target user
            const requesterProfile = await Profile_1.Profile.findOne({ user: requesterId });
            const requesterName = requesterProfile?.displayName || 'A verified doctor';
            await Notification_1.Notification.create({
                user: targetUserId,
                type: 'INTEREST',
                title: 'Contact Details Viewed',
                message: `${requesterName} viewed your verified contact details.`,
                read: false,
            }).catch(() => { });
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
        const existingFreeLogs = await ContactAccessLog_1.ContactAccessLog.find({
            user: requesterId,
            action: { $in: ['FREE_CONTACT_REVEAL', 'CONTACT_VIEWED'] },
            creditsUsed: 0,
        });
        const distinctOwners = new Set(existingFreeLogs
            .map((log) => String(log.profileOwner || log.profileOwnerId || ''))
            .filter((ownerId) => ownerId && ownerId !== String(requesterId)));
        if (distinctOwners.size >= 1 && !distinctOwners.has(String(targetUserId))) {
            // Second profile attempt by free member -> strictly denied
            const plans = await MembershipPlan_1.MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
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
            await client_1.prisma.$transaction(async (tx) => {
                // Pessimistic row-level lock on user row in MariaDB to serialize concurrent free reveal attempts
                try {
                    await tx.$executeRawUnsafe('SELECT _id FROM users WHERE _id = ? FOR UPDATE', String(requesterId));
                }
                catch {
                    await tx.user.update({
                        where: { id: String(requesterId) },
                        data: { updatedAt: new Date() },
                    }).catch(() => { });
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
                    const err = new Error('Free contact view limit exceeded');
                    err.code = 'UPGRADE_REQUIRED';
                    throw err;
                }
                await tx.contactAccessLog.create({
                    data: {
                        id: (0, client_1.generateObjectId)(),
                        userId: String(requesterId),
                        profileOwnerId: String(targetUserId),
                        action: 'FREE_CONTACT_REVEAL',
                        creditsUsed: 0,
                        ipAddress: req.ip || '127.0.0.1',
                    },
                });
            });
        }
        catch (txErr) {
            if (txErr.code === 'UPGRADE_REQUIRED' || txErr.message?.includes('Free contact view limit')) {
                const plans = await MembershipPlan_1.MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, discountedPrice: 1 });
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
        const requesterProfile = await Profile_1.Profile.findOne({ user: requesterId });
        const requesterName = requesterProfile?.displayName || 'A verified doctor';
        await Notification_1.Notification.create({
            user: targetUserId,
            type: 'INTEREST',
            title: 'Contact Details Viewed',
            message: `${requesterName} viewed your verified contact details.`,
            read: false,
        }).catch(() => { });
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
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=contactRequestController.js.map