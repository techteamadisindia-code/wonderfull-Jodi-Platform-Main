"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectInterest = void 0;
exports.extractEntityId = extractEntityId;
exports.createInterest = createInterest;
exports.checkInterestStatus = checkInterestStatus;
exports.findNotificationByInterest = findNotificationByInterest;
exports.acceptInterest = acceptInterest;
exports.declineInterest = declineInterest;
exports.withdrawInterest = withdrawInterest;
exports.updateInterest = updateInterest;
exports.getSentInterests = getSentInterests;
exports.getReceivedInterests = getReceivedInterests;
exports.getAcceptedConnections = getAcceptedConnections;
const Interest_1 = require("../models/Interest");
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const Block_1 = require("../models/Block");
const Notification_1 = require("../models/Notification");
const Conversation_1 = require("../models/Conversation");
const securityUtils_1 = require("../utils/securityUtils");
const profileController_1 = require("./profileController");
const zod_1 = require("zod");
const createInterestSchema = zod_1.z.object({
    receiverId: zod_1.z.string().optional(),
    recipientId: zod_1.z.string().optional(),
    profileId: zod_1.z.string().optional(),
    targetUserId: zod_1.z.string().optional(),
});
const updateInterestSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACCEPTED', 'DECLINED', 'REJECTED', 'CANCELLED', 'WITHDRAWN']),
});
// Mutex coordinator to serialize concurrent state transitions on the same interest
const inFlightInterestTransitions = new Map();
/**
 * Safely extracts a string ID from an entity, populated object, or scalar fallback.
 * Returns an empty string if the ID is missing or invalid, preventing unhandled TypeErrors.
 */
function extractEntityId(entity, fallbackId) {
    if (entity) {
        if (typeof entity === 'string') {
            return entity.trim();
        }
        if (typeof entity === 'object') {
            const directId = entity._id || entity.id;
            if (directId) {
                return typeof directId === 'object' && directId !== null
                    ? extractEntityId(directId)
                    : String(directId).trim();
            }
            if (typeof entity.toString === 'function' && entity.toString !== Object.prototype.toString) {
                const str = entity.toString();
                if (str && str !== '[object Object]') {
                    return str.trim();
                }
            }
        }
    }
    if (fallbackId) {
        return extractEntityId(fallbackId);
    }
    return '';
}
/**
 * Helper to resolve target user ID whether given receiverId, recipientId, profileId, or targetUserId
 * Supports candidate IDs (e.g. WJ-100092), Profile ObjectIds, and User IDs.
 */
async function resolveTargetUserId(body) {
    const rawId = (body.recipientId || body.receiverId || body.profileId || body.targetUserId || '').trim();
    if (!rawId) {
        return null;
    }
    // 1. Resolve canonical profile (handles candidateId like WJ-100092, profile _id, legacy WJ-[hex])
    const profile = await (0, profileController_1.findCanonicalProfile)(rawId);
    if (profile) {
        const u = profile.user || profile.userId;
        if (u) {
            return String(u._id || u.id || u);
        }
    }
    // 2. Direct User lookup if rawId matches ObjectId or UUID format
    if ((0, securityUtils_1.isValidObjectId)(rawId) || /^[0-9a-fA-F]{24}$/.test(rawId) || /^[A-Za-z0-9_-]{20,36}$/.test(rawId)) {
        const directUser = await User_1.User.findById(rawId).select('_id');
        if (directUser) {
            return String(directUser._id || directUser.id);
        }
    }
    return null;
}
/**
 * Send Interest from Authenticated User to Target User/Profile
 */
async function createInterest(req, res, next) {
    try {
        const senderUserId = req.user?.userId;
        if (!senderUserId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const targetUserId = await resolveTargetUserId(req.body);
        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'Invalid or missing receiver/profile ID' });
        }
        // Prevent self-interest
        if (senderUserId === targetUserId) {
            return res.status(400).json({ success: false, message: 'You cannot send an interest request to yourself' });
        }
        // Verify receiver exists and is active
        const receiverUser = await User_1.User.findById(targetUserId);
        if (!receiverUser || !receiverUser.isActive) {
            return res.status(404).json({ success: false, message: 'Candidate not found or inactive' });
        }
        // Enforce recipient's whoCanSendInterest privacy setting (if verified_only)
        const targetProfile = await Profile_1.Profile.findOne({ user: targetUserId });
        const interestPrivacy = targetProfile?.privacySettings?.whoCanSendInterest || 'all';
        if (interestPrivacy === 'verified_only') {
            const senderUser = await User_1.User.findById(senderUserId);
            const isSenderVerified = senderUser?.verified || senderUser?.verificationStatus === 'VERIFIED';
            if (!isSenderVerified) {
                return res.status(403).json({
                    success: false,
                    message: 'This doctor only accepts interest requests from verified doctor profiles.',
                });
            }
        }
        // Free members can send interests freely without paid restrictions
        // Verify no block relationship (fail-closed: do not continue if block check fails)
        let isBlocked = null;
        try {
            isBlocked = await Block_1.Block.findOne({
                $or: [
                    { blocker: senderUserId, blockedUser: targetUserId },
                    { blocker: targetUserId, blockedUser: senderUserId },
                ],
            });
        }
        catch (blockErr) {
            console.error('[Interest] Block verification failed (database/schema error):', blockErr?.message);
            return res.status(503).json({
                success: false,
                message: 'Unable to verify member eligibility at this time. Please try again later.',
            });
        }
        if (isBlocked) {
            return res.status(403).json({ success: false, message: 'Cannot send interest to this member' });
        }
        // Check if interest already exists in either direction
        const existing = await Interest_1.Interest.findOne({
            $or: [
                { sender: senderUserId, receiver: targetUserId },
                { sender: targetUserId, receiver: senderUserId },
            ],
        });
        if (existing) {
            const existingSenderId = extractEntityId(existing.sender, existing.senderId);
            const existingReceiverId = extractEntityId(existing.receiver, existing.receiverId);
            if (!existingSenderId || !existingReceiverId) {
                return res.status(500).json({
                    success: false,
                    message: 'Existing interest record is missing sender or receiver information',
                });
            }
            if (existingSenderId === senderUserId) {
                if (existing.status === 'PENDING') {
                    return res.status(409).json({
                        success: false,
                        code: 'DUPLICATE_INTEREST',
                        message: 'You have already sent an interest to this profile.',
                        data: existing,
                    });
                }
                if (existing.status === 'ACCEPTED') {
                    return res.status(409).json({
                        success: false,
                        code: 'DUPLICATE_INTEREST',
                        message: 'Interest already accepted with this profile.',
                        data: existing,
                    });
                }
                // If previously declined or cancelled or rejected, allow re-sending
                existing.status = 'PENDING';
                existing.updatedAt = new Date();
                await existing.save();
            }
            else {
                // Target sent interest to current user
                if (existing.status === 'PENDING') {
                    return res.status(200).json({
                        success: true,
                        message: 'This member has already sent you an interest! You can accept it.',
                        data: existing,
                        requiresAction: 'ACCEPT_OR_DECLINE',
                    });
                }
                if (existing.status === 'ACCEPTED') {
                    return res.status(409).json({
                        success: false,
                        code: 'DUPLICATE_INTEREST',
                        message: 'Interest already accepted with this profile.',
                        data: existing,
                    });
                }
            }
        }
        // Fetch sender and receiver profile details
        const senderUser = await User_1.User.findById(senderUserId);
        const senderProfile = await Profile_1.Profile.findOne({ user: senderUserId });
        const receiverProfile = await Profile_1.Profile.findOne({ user: targetUserId });
        const senderName = senderProfile?.displayName || senderUser?.fullName || 'A doctor';
        const senderPhoto = senderProfile?.primaryPhoto || senderProfile?.photos?.[0] || '';
        const senderProfileId = senderProfile ? String(senderProfile._id) : '';
        const receiverProfileId = receiverProfile ? String(receiverProfile._id) : '';
        const senderDegree = senderProfile?.degree || senderProfile?.education || 'MBBS';
        const senderSpecialization = senderProfile?.profession || senderProfile?.specialization || 'Doctor';
        const existingSenderId = existing ? extractEntityId(existing.sender, existing.senderId) : '';
        const interest = existing && existingSenderId === senderUserId
            ? existing
            : await Interest_1.Interest.create({
                sender: senderUserId,
                receiver: targetUserId,
                senderProfile: senderProfile?._id,
                receiverProfile: receiverProfile?._id,
                status: 'PENDING',
            });
        // Create real database Notification for receiver in MongoDB
        const notification = await Notification_1.Notification.create({
            user: targetUserId,
            type: 'INTEREST_RECEIVED',
            title: 'New Interest Received',
            message: `${senderName} sent you an interest.`,
            actionUrl: '/interests',
            link: '/interests',
            read: false,
            metadata: {
                interestId: interest._id,
                senderUserId,
                senderName,
                senderPhoto,
                senderDegree,
                senderSpecialization,
                senderProfileId,
                receiverProfileId,
                type: 'INTEREST_RECEIVED',
            },
        });
        // Real-time notification via Socket.IO if recipient is connected
        const io = req.app?.get('io');
        if (io) {
            io.to(`user:${targetUserId}`).emit('newNotification', {
                notification,
                unreadCountDelta: 1,
            });
            io.to(`user:${targetUserId}`).emit('interestReceived', {
                interest,
                sender: {
                    id: senderUserId,
                    name: senderName,
                    photo: senderPhoto,
                    degree: senderDegree,
                    specialization: senderSpecialization,
                    profileId: senderProfileId,
                },
            });
        }
        res.status(201).json({
            success: true,
            message: 'Interest sent successfully',
            data: interest,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Check interest status between authenticated user and target profile/user
 */
async function checkInterestStatus(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const targetId = (req.params.targetId || req.params.id || req.params.profileId || '').trim();
        if (!targetId || targetId.length < 3 || targetId.length > 50) {
            return res.status(400).json({ success: false, message: 'Invalid target ID' });
        }
        const targetUserId = await resolveTargetUserId({ receiverId: targetId });
        if (!targetUserId) {
            return res.status(404).json({ success: false, message: 'Target user not found' });
        }
        const interest = await Interest_1.Interest.findOne({
            $or: [
                { sender: userId, receiver: targetUserId },
                { sender: targetUserId, receiver: userId },
            ],
        });
        if (!interest) {
            return res.json({
                success: true,
                data: {
                    hasInterest: false,
                    status: 'NONE',
                    isSender: false,
                    isReceiver: false,
                    interestId: null,
                    canChat: false,
                    targetUserId,
                },
            });
        }
        const interestSenderId = extractEntityId(interest.sender, interest.senderId);
        const interestReceiverId = extractEntityId(interest.receiver, interest.receiverId);
        if (!interestSenderId || !interestReceiverId) {
            return res.status(500).json({
                success: false,
                message: 'Interest record has missing sender or receiver details',
            });
        }
        const isSender = interestSenderId === userId;
        const isReceiver = interestReceiverId === userId;
        const canChat = interest.status === 'ACCEPTED';
        res.json({
            success: true,
            data: {
                hasInterest: true,
                status: interest.status,
                isSender,
                isReceiver,
                interestId: interest._id,
                canChat,
                targetUserId,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Validates whether a candidate notification matches a specific interestId and targetUserId in memory.
 * Requires an existing metadata interest ID and exact string equality before returning a match.
 * Missing metadata, null values, empty IDs, or unrelated IDs must never count as a match.
 */
function isMatchingInterestMeta(n, targetUserId, targetIdStr) {
    if (!n)
        return false;
    const notifUser = String(n.user?._id || n.user?.id || n.user || '').trim();
    if (notifUser && notifUser !== targetUserId) {
        return false;
    }
    let meta = n?.metadata;
    if (typeof meta === 'string') {
        try {
            meta = JSON.parse(meta);
        }
        catch {
            return false;
        }
    }
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
        return false;
    }
    const metaInterestId = meta.interestId;
    if (metaInterestId === null || metaInterestId === undefined) {
        return false;
    }
    const trimmedId = String(metaInterestId).trim();
    if (trimmedId === '' || trimmedId !== targetIdStr) {
        return false;
    }
    return true;
}
/**
 * Safely locates an existing notification for a given user, type, and interestId.
 * Queries by indexed scalar columns (user, type) and verifies interestId in metadata
 * in memory, avoiding Prisma JSON schema filter errors on 'metadata.interestId'.
 *
 * Requirements:
 * - Requires existing metadata interest ID and exact string equality before returning a match.
 * - Missing metadata, null values, empty IDs, or unrelated IDs must never count as a match.
 */
async function findNotificationByInterest(targetUserId, notificationType, interestId) {
    if (!targetUserId || !String(targetUserId).trim())
        return null;
    if (!interestId || !String(interestId).trim())
        return null;
    const cleanUserId = String(targetUserId).trim();
    const targetIdStr = String(interestId).trim();
    // 1. Try findOne with safe scalar fields (user, type)
    try {
        if (typeof Notification_1.Notification.findOne === 'function') {
            const single = await Notification_1.Notification.findOne({
                user: cleanUserId,
                type: notificationType,
            });
            if (single && isMatchingInterestMeta(single, cleanUserId, targetIdStr)) {
                return single;
            }
        }
    }
    catch (_) { }
    // 2. Query recent candidate notifications by indexed user + type and inspect metadata
    try {
        if (typeof Notification_1.Notification.find === 'function') {
            const candidates = await Notification_1.Notification.find({
                user: cleanUserId,
                type: notificationType,
            })
                .sort({ createdAt: 'desc' })
                .limit(50);
            if (Array.isArray(candidates) && candidates.length > 0) {
                const match = candidates.find((n) => isMatchingInterestMeta(n, cleanUserId, targetIdStr));
                if (match)
                    return match;
            }
        }
    }
    catch (_) { }
    return null;
}
/**
 * Accept received interest
 */
async function acceptInterest(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid interest ID' });
        }
        const lockKey = `accept:${String(id)}`;
        while (inFlightInterestTransitions.has(lockKey)) {
            await inFlightInterestTransitions.get(lockKey);
        }
        let releaseLock;
        const lockPromise = new Promise((resolve) => {
            releaseLock = resolve;
        });
        inFlightInterestTransitions.set(lockKey, lockPromise);
        try {
            const interest = await Interest_1.Interest.findById(id);
            if (!interest) {
                return res.status(404).json({ success: false, message: 'Interest not found' });
            }
            const interestReceiverId = extractEntityId(interest.receiver, interest.receiverId);
            const interestSenderId = extractEntityId(interest.sender, interest.senderId);
            if (!interestReceiverId || !interestSenderId) {
                return res.status(500).json({
                    success: false,
                    message: 'Interest record has missing sender or receiver details',
                });
            }
            const isReceiver = interestReceiverId === userId;
            const isAdmin = req.user?.role === 'admin';
            if (!isReceiver && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the recipient can accept this interest request',
                });
            }
            const senderUserId = interestSenderId;
            // Idempotent retry handling: if already accepted, return existing connection safely without duplicate notifications
            if (interest.status === 'ACCEPTED') {
                const existingConv = await Conversation_1.Conversation.findOne({
                    participants: { $all: [senderUserId, userId], $size: 2 },
                });
                // Self-healing idempotency: ensure the sender has received their acceptance notification
                let existingNotification = await findNotificationByInterest(senderUserId, 'INTEREST_ACCEPTED', String(interest._id));
                if (!existingNotification) {
                    const recipientUser = await User_1.User.findById(userId);
                    const recipientProfile = await Profile_1.Profile.findOne({ user: userId });
                    const isNameVisible = recipientProfile?.privacySettings?.nameVisibility !== 'hidden';
                    const recipientName = (isNameVisible && (recipientProfile?.displayName || recipientUser?.fullName))
                        ? (recipientProfile?.displayName || recipientUser?.fullName)
                        : 'Your match';
                    const recipientPhoto = recipientProfile?.primaryPhoto || recipientProfile?.photos?.[0] || '';
                    const recipientProfileId = recipientProfile ? String(recipientProfile._id) : '';
                    existingNotification = await Notification_1.Notification.create({
                        user: senderUserId,
                        type: 'INTEREST_ACCEPTED',
                        title: 'Interest accepted',
                        message: 'Your interest has been accepted. View your connection to see the next steps.',
                        actionUrl: '/interests?tab=accepted',
                        link: '/interests?tab=accepted',
                        read: false,
                        metadata: {
                            interestId: String(interest._id),
                            recipientUserId: userId,
                            recipientName,
                            recipientPhoto,
                            recipientProfileId,
                            type: 'INTEREST_ACCEPTED',
                        },
                    });
                }
                return res.json({
                    success: true,
                    message: 'Interest already accepted',
                    data: {
                        interest,
                        conversationId: existingConv?._id,
                    },
                });
            }
            if (interest.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    message: `Interest request cannot be accepted from current status: ${interest.status}`,
                });
            }
            // Save previous status for compensating rollback if required notification creation fails
            const previousStatus = interest.status;
            // Concurrency guard: Perform atomic conditional update if supported to guarantee single-flight acceptance
            let updateResult = null;
            if (typeof Interest_1.Interest.updateOne === 'function') {
                try {
                    updateResult = await Interest_1.Interest.updateOne({ _id: interest._id, status: 'PENDING' }, { $set: { status: 'ACCEPTED' } });
                }
                catch {
                    // Fall back to document-level save
                }
            }
            if (updateResult && updateResult.modifiedCount === 0) {
                const current = await Interest_1.Interest.findById(id);
                if (current?.status === 'ACCEPTED') {
                    const existingConv = await Conversation_1.Conversation.findOne({
                        $or: [
                            { interest: interest._id },
                            { participants: { $all: [interestSenderId, interestReceiverId], $size: 2 } },
                        ],
                    });
                    return res.json({
                        success: true,
                        message: 'Interest already accepted',
                        data: {
                            interest: current,
                            conversationId: existingConv?._id,
                        },
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: `Interest request cannot be accepted from current status: ${current?.status || interest.status}`,
                });
            }
            // M-1: Remove redundant status writes.
            // If updateResult already persisted the status via updateOne, do not execute a redundant interest.save()
            if (!updateResult || updateResult.modifiedCount === undefined) {
                interest.status = 'ACCEPTED';
                await interest.save();
            }
            else {
                interest.status = 'ACCEPTED';
            }
            let notification;
            let conversation;
            let recipientName = 'Your match';
            let recipientPhoto = '';
            try {
                // Fetch recipient info for sender notification respecting privacy settings
                const recipientUser = await User_1.User.findById(userId);
                const recipientProfile = await Profile_1.Profile.findOne({ user: userId });
                const isNameVisible = recipientProfile?.privacySettings?.nameVisibility !== 'hidden';
                const candidateRecipientName = (recipientProfile?.displayName || recipientUser?.fullName) || '';
                recipientName = (isNameVisible && candidateRecipientName)
                    ? candidateRecipientName
                    : 'Your match';
                recipientPhoto = recipientProfile?.primaryPhoto || recipientProfile?.photos?.[0] || '';
                const recipientProfileId = recipientProfile ? String(recipientProfile._id) : '';
                // Check for existing notification to guarantee retries/concurrency cannot create duplicate notifications
                notification = await findNotificationByInterest(senderUserId, 'INTEREST_ACCEPTED', String(interest._id));
                if (!notification) {
                    notification = await Notification_1.Notification.create({
                        user: senderUserId,
                        type: 'INTEREST_ACCEPTED',
                        title: 'Interest accepted',
                        message: 'Your interest has been accepted. View your connection to see the next steps.',
                        actionUrl: '/interests?tab=accepted',
                        link: '/interests?tab=accepted',
                        read: false,
                        metadata: {
                            interestId: String(interest._id),
                            recipientUserId: userId,
                            recipientName,
                            recipientPhoto,
                            recipientProfileId,
                            type: 'INTEREST_ACCEPTED',
                        },
                    });
                }
                // Ensure active Conversation exists between participants
                conversation = await Conversation_1.Conversation.findOne({
                    participants: { $all: [senderUserId, userId], $size: 2 },
                });
                if (!conversation) {
                    conversation = await Conversation_1.Conversation.create({
                        participants: [senderUserId, userId],
                        interest: interest._id,
                        status: 'ACTIVE',
                        complianceStatus: 'SAFE',
                        messageCount: 0,
                        lastActivityAt: new Date(),
                    });
                }
                else {
                    conversation.status = 'ACTIVE';
                    conversation.interest = interest._id;
                    if (typeof conversation.save === 'function') {
                        await conversation.save();
                    }
                }
            }
            catch (createErr) {
                // H-2: Conditional compensating rollback!
                // Attempt rollback ONLY if the current persisted status remains 'ACCEPTED'.
                // If zero records were modified, another operation changed the state, so do NOT overwrite it.
                // Never call an unconditional stale interest.save().
                try {
                    let rollbackResult = null;
                    if (typeof Interest_1.Interest.updateOne === 'function') {
                        try {
                            rollbackResult = await Interest_1.Interest.updateOne({ _id: interest._id, status: 'ACCEPTED' }, { $set: { status: previousStatus } });
                        }
                        catch (updateOneErr) {
                            if (!updateResult || updateResult.modifiedCount === undefined) {
                                interest.status = previousStatus;
                                if (typeof interest.save === 'function') {
                                    await interest.save();
                                }
                                console.warn(`[InterestController] Successfully rolled back interest ${interest._id} to ${previousStatus} following notification/conversation failure via document save.`);
                                throw createErr;
                            }
                            else {
                                throw updateOneErr;
                            }
                        }
                    }
                    if (rollbackResult && (rollbackResult.modifiedCount === 1 || rollbackResult.matchedCount === 1)) {
                        interest.status = previousStatus;
                        console.warn(`[InterestController] Successfully conditionally rolled back interest ${interest._id} to ${previousStatus} following notification/conversation failure.`);
                    }
                    else if (rollbackResult && rollbackResult.modifiedCount === 0) {
                        console.warn(`[InterestController] Rollback skipped for interest ${interest._id}: persisted status is no longer ACCEPTED (concurrent state change detected across processes).`);
                    }
                    else if (!updateResult || updateResult.modifiedCount === undefined) {
                        // Document fallback when atomic updateOne is not supported or was not used for forward transition
                        interest.status = previousStatus;
                        if (typeof interest.save === 'function') {
                            await interest.save();
                        }
                        console.warn(`[InterestController] Successfully rolled back interest ${interest._id} to ${previousStatus} following notification/conversation failure via document save.`);
                    }
                    else {
                        console.warn(`[InterestController] Conditional rollback could not verify status for interest ${interest._id}. State may require manual reconciliation.`);
                    }
                }
                catch (rollbackErr) {
                    if (rollbackErr === createErr)
                        throw createErr;
                    console.error(`[InterestController] CRITICAL: Compensating rollback database call failed for interest ${interest._id} after notification failure. State may require manual reconciliation:`, rollbackErr);
                }
                throw createErr;
            }
            // Real-time notification via Socket.IO (best effort delivery - durable delivery guaranteed by database record above)
            const io = req.app?.get('io');
            if (io) {
                try {
                    io.to(`user:${senderUserId}`).emit('newNotification', {
                        notification,
                        unreadCountDelta: 1,
                    });
                    io.to(`user:${senderUserId}`).emit('interestAccepted', {
                        interest,
                        conversationId: conversation?._id,
                        recipient: {
                            id: userId,
                            name: recipientName,
                            photo: recipientPhoto,
                        },
                    });
                }
                catch (socketErr) {
                    console.warn('[InterestController] Non-fatal: Socket.IO notification emission failed:', socketErr);
                }
            }
            res.json({
                success: true,
                message: 'Interest accepted successfully. Chat is now available for paid members!',
                data: {
                    interest,
                    conversationId: conversation?._id,
                },
            });
        }
        finally {
            inFlightInterestTransitions.delete(lockKey);
            if (typeof releaseLock === 'function')
                releaseLock();
        }
    }
    catch (error) {
        next(error);
    }
}
/**
 * Decline / Reject received interest
 */
async function declineInterest(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid interest ID' });
        }
        const interest = await Interest_1.Interest.findById(id);
        if (!interest) {
            return res.status(404).json({ success: false, message: 'Interest not found' });
        }
        const interestReceiverId = extractEntityId(interest.receiver, interest.receiverId);
        const interestSenderId = extractEntityId(interest.sender, interest.senderId);
        if (!interestReceiverId || !interestSenderId) {
            return res.status(500).json({
                success: false,
                message: 'Interest record has missing sender or receiver details',
            });
        }
        const isReceiver = interestReceiverId === userId;
        const isAdmin = req.user?.role === 'admin';
        if (!isReceiver && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only the recipient can reject this interest request',
            });
        }
        if (interest.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Interest request is not pending',
            });
        }
        interest.status = 'REJECTED';
        await interest.save();
        // Fetch recipient info
        const recipientUser = await User_1.User.findById(userId);
        const recipientProfile = await Profile_1.Profile.findOne({ user: userId });
        const recipientName = recipientProfile?.displayName || recipientUser?.fullName || 'Candidate';
        // Create database Notification for sender
        const senderUserId = interestSenderId;
        const notification = await Notification_1.Notification.create({
            user: senderUserId,
            type: 'INTEREST_REJECTED',
            title: 'Interest Update',
            message: 'Your interest was not accepted.',
            actionUrl: '/interests',
            link: '/interests',
            read: false,
            metadata: {
                interestId: interest._id,
                recipientUserId: userId,
                type: 'INTEREST_REJECTED',
            },
        });
        const io = req.app?.get('io');
        if (io) {
            io.to(`user:${senderUserId}`).emit('newNotification', {
                notification,
                unreadCountDelta: 1,
            });
            io.to(`user:${senderUserId}`).emit('interestDeclined', { interest });
            io.to(`user:${senderUserId}`).emit('interestRejected', { interest });
        }
        res.json({
            success: true,
            message: 'Interest rejected',
            data: interest,
        });
    }
    catch (error) {
        next(error);
    }
}
exports.rejectInterest = declineInterest;
/**
 * Withdraw an accepted connection (transitions from ACCEPTED to REJECTED)
 */
async function withdrawInterest(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid interest ID' });
        }
        const lockKey = `withdraw:${String(id)}`;
        while (inFlightInterestTransitions.has(lockKey)) {
            await inFlightInterestTransitions.get(lockKey);
        }
        let releaseLock;
        const lockPromise = new Promise((resolve) => {
            releaseLock = resolve;
        });
        inFlightInterestTransitions.set(lockKey, lockPromise);
        try {
            const interest = await Interest_1.Interest.findById(id);
            if (!interest) {
                return res.status(404).json({ success: false, message: 'Interest not found' });
            }
            const interestSenderId = extractEntityId(interest.sender, interest.senderId);
            const interestReceiverId = extractEntityId(interest.receiver, interest.receiverId);
            if (!interestSenderId || !interestReceiverId) {
                return res.status(500).json({
                    success: false,
                    message: 'Interest record has missing sender or receiver details',
                });
            }
            const isParticipant = interestSenderId === userId || interestReceiverId === userId;
            const isAdmin = req.user?.role === 'admin';
            if (!isParticipant && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to withdraw this connection',
                });
            }
            // Determine the other member who must be notified
            const partnerUserId = userId === interestReceiverId ? interestSenderId : interestReceiverId;
            // Idempotency: if already withdrawn / rejected, return safe idempotent success without duplicate notifications
            if (interest.status === 'REJECTED' || interest.status === 'DECLINED') {
                // Self-healing: ensure partner received withdrawal notification
                let existingNotification = await findNotificationByInterest(partnerUserId, 'INTEREST_WITHDRAWN', String(interest._id));
                if (!existingNotification) {
                    const withdrawingUser = await User_1.User.findById(userId);
                    const withdrawingProfile = await Profile_1.Profile.findOne({ user: userId });
                    const isNameVisible = withdrawingProfile?.privacySettings?.nameVisibility !== 'hidden';
                    const withdrawingName = (isNameVisible && (withdrawingProfile?.displayName || withdrawingUser?.fullName))
                        ? (withdrawingProfile?.displayName || withdrawingUser?.fullName)
                        : 'A member';
                    existingNotification = await Notification_1.Notification.create({
                        user: partnerUserId,
                        type: 'INTEREST_WITHDRAWN',
                        title: 'Connection withdrawn',
                        message: `${withdrawingName} has withdrawn the accepted connection.`,
                        actionUrl: '/interests?tab=rejected',
                        link: '/interests?tab=rejected',
                        read: false,
                        metadata: {
                            interestId: String(interest._id),
                            withdrawnByUserId: userId,
                            type: 'INTEREST_WITHDRAWN',
                        },
                    });
                }
                return res.json({
                    success: true,
                    message: 'Connection already withdrawn',
                    data: interest,
                });
            }
            if (interest.status !== 'ACCEPTED') {
                return res.status(400).json({
                    success: false,
                    message: `Only accepted connections can be withdrawn. Current status is ${interest.status}`,
                });
            }
            // Save previous status for compensating rollback if required notification or archiving fails
            const previousStatus = interest.status;
            // Concurrency guard: Perform atomic conditional update if supported to guarantee single-flight withdrawal
            let updateResult = null;
            if (typeof Interest_1.Interest.updateOne === 'function') {
                try {
                    updateResult = await Interest_1.Interest.updateOne({ _id: interest._id, status: 'ACCEPTED' }, { $set: { status: 'REJECTED' } });
                }
                catch {
                    // Fall back to document-level save
                }
            }
            if (updateResult && updateResult.modifiedCount === 0) {
                const current = await Interest_1.Interest.findById(id);
                if (current?.status === 'REJECTED') {
                    return res.json({
                        success: true,
                        message: 'Connection already withdrawn',
                        data: current,
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: `Only accepted connections can be withdrawn. Current status is ${current?.status || interest.status}`,
                });
            }
            // M-1: Remove redundant status writes.
            // If updateResult already persisted the status via updateOne, do not execute a redundant interest.save()
            if (!updateResult || updateResult.modifiedCount === undefined) {
                interest.status = 'REJECTED';
                await interest.save();
            }
            else {
                interest.status = 'REJECTED';
            }
            let notification;
            let withdrawingName = 'A member';
            try {
                // Archive conversation if one exists so chat access is closed
                const conversation = await Conversation_1.Conversation.findOne({
                    $or: [
                        { interest: interest._id },
                        { participants: { $all: [interestSenderId, interestReceiverId], $size: 2 } },
                    ],
                });
                if (conversation && conversation.status === 'ACTIVE') {
                    conversation.status = 'ARCHIVED';
                    await conversation.save().catch(() => null);
                }
                // Fetch withdrawing member details respecting privacy
                const withdrawingUser = await User_1.User.findById(userId);
                const withdrawingProfile = await Profile_1.Profile.findOne({ user: userId });
                const isNameVisible = withdrawingProfile?.privacySettings?.nameVisibility !== 'hidden';
                const candidateWithdrawingName = (withdrawingProfile?.displayName || withdrawingUser?.fullName) || '';
                withdrawingName = (isNameVisible && candidateWithdrawingName)
                    ? candidateWithdrawingName
                    : 'A member';
                // Prevent duplicate notification on retries/concurrency
                notification = await findNotificationByInterest(partnerUserId, 'INTEREST_WITHDRAWN', String(interest._id));
                if (!notification) {
                    notification = await Notification_1.Notification.create({
                        user: partnerUserId,
                        type: 'INTEREST_WITHDRAWN',
                        title: 'Connection withdrawn',
                        message: `${withdrawingName} has withdrawn the accepted connection.`,
                        actionUrl: '/interests?tab=rejected',
                        link: '/interests?tab=rejected',
                        read: false,
                        metadata: {
                            interestId: String(interest._id),
                            withdrawnByUserId: userId,
                            type: 'INTEREST_WITHDRAWN',
                        },
                    });
                }
            }
            catch (withdrawErr) {
                // H-2: Conditional compensating rollback!
                // Attempt rollback ONLY if the current persisted status remains 'REJECTED'.
                // If zero records were modified, another operation changed the state, so do NOT overwrite it.
                // Never call an unconditional stale interest.save().
                try {
                    let rollbackResult = null;
                    if (typeof Interest_1.Interest.updateOne === 'function') {
                        try {
                            rollbackResult = await Interest_1.Interest.updateOne({ _id: interest._id, status: 'REJECTED' }, { $set: { status: previousStatus } });
                        }
                        catch (updateOneErr) {
                            if (!updateResult || updateResult.modifiedCount === undefined) {
                                interest.status = previousStatus;
                                if (typeof interest.save === 'function') {
                                    await interest.save();
                                }
                                console.warn(`[InterestController] Successfully rolled back interest ${interest._id} to ${previousStatus} following withdrawal failure via document save.`);
                                throw withdrawErr;
                            }
                            else {
                                throw updateOneErr;
                            }
                        }
                    }
                    if (rollbackResult && (rollbackResult.modifiedCount === 1 || rollbackResult.matchedCount === 1)) {
                        interest.status = previousStatus;
                        console.warn(`[InterestController] Successfully conditionally rolled back interest ${interest._id} to ${previousStatus} following withdrawal failure.`);
                    }
                    else if (rollbackResult && rollbackResult.modifiedCount === 0) {
                        console.warn(`[InterestController] Rollback skipped for interest ${interest._id}: persisted status is no longer REJECTED (concurrent state change detected across processes).`);
                    }
                    else if (!updateResult || updateResult.modifiedCount === undefined) {
                        // Document fallback when atomic updateOne is not supported or was not used for forward transition
                        interest.status = previousStatus;
                        if (typeof interest.save === 'function') {
                            await interest.save();
                        }
                        console.warn(`[InterestController] Successfully rolled back interest ${interest._id} to ${previousStatus} following withdrawal failure via document save.`);
                    }
                    else {
                        console.warn(`[InterestController] Conditional rollback could not verify status for interest ${interest._id}. State may require manual reconciliation.`);
                    }
                }
                catch (rollbackErr) {
                    if (rollbackErr === withdrawErr)
                        throw withdrawErr;
                    console.error(`[InterestController] CRITICAL: Compensating rollback database call failed for interest ${interest._id} after withdrawal failure. State may require manual reconciliation:`, rollbackErr);
                }
                throw withdrawErr;
            }
            // Real-time notifications via Socket.IO (best effort delivery - durable delivery guaranteed by database record above)
            const io = req.app?.get('io');
            if (io) {
                try {
                    io.to(`user:${partnerUserId}`).emit('newNotification', {
                        notification,
                        unreadCountDelta: 1,
                    });
                    io.to(`user:${partnerUserId}`).emit('interestWithdrawn', {
                        interest,
                        withdrawnBy: userId,
                    });
                    io.to(`user:${userId}`).emit('interestWithdrawn', {
                        interest,
                        withdrawnBy: userId,
                    });
                }
                catch (socketErr) {
                    console.warn('[InterestController] Non-fatal: Socket.IO withdrawal notification emission failed:', socketErr);
                }
            }
            res.json({
                success: true,
                message: 'Connection withdrawn successfully',
                data: interest,
            });
        }
        finally {
            inFlightInterestTransitions.delete(lockKey);
            if (typeof releaseLock === 'function')
                releaseLock();
        }
    }
    catch (error) {
        next(error);
    }
}
/**
 * Generic update (for backward compatibility)
 */
async function updateInterest(req, res, next) {
    try {
        const status = req.body?.status;
        if (status === 'ACCEPTED') {
            return acceptInterest(req, res, next);
        }
        if (status === 'DECLINED' || status === 'REJECTED') {
            return declineInterest(req, res, next);
        }
        if (status === 'WITHDRAWN') {
            return withdrawInterest(req, res, next);
        }
        if (status === 'CANCELLED') {
            const userId = req.user?.userId;
            const { id } = req.params;
            const interest = await Interest_1.Interest.findById(id);
            if (!interest)
                return res.status(404).json({ success: false, message: 'Interest not found' });
            const senderUserId = extractEntityId(interest.sender, interest.senderId);
            if (!senderUserId) {
                return res.status(500).json({ success: false, message: 'Interest record has missing sender' });
            }
            if (senderUserId !== userId && req.user?.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Only sender can cancel' });
            }
            interest.status = 'CANCELLED';
            await interest.save();
            return res.json({ success: true, data: interest });
        }
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get Sent Interests
 */
async function getSentInterests(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const query = { sender: userId };
        if (req.query.status) {
            const s = String(req.query.status).toUpperCase();
            if (s === 'REJECTED' || s === 'DECLINED') {
                query.status = { $in: ['REJECTED', 'DECLINED'] };
            }
            else {
                query.status = s;
            }
        }
        const interests = await Interest_1.Interest.find(query)
            .populate('receiver', 'fullName verificationStatus email')
            .sort({ createdAt: -1 })
            .lean();
        const receiverIds = interests.map((i) => extractEntityId(i.receiver, i.receiverId)).filter(Boolean);
        const profiles = await Profile_1.Profile.find({ user: { $in: receiverIds } })
            .select('user displayName profession specialization degree education city state primaryPhoto photos age dob gender')
            .lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const enriched = interests.map((i) => {
            const rId = extractEntityId(i.receiver, i.receiverId);
            return {
                ...i,
                receiverProfile: rId ? profileMap.get(rId) || null : null,
            };
        });
        res.json({ success: true, data: enriched });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get Received Interests
 */
async function getReceivedInterests(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const query = { receiver: userId };
        if (req.query.status) {
            const s = String(req.query.status).toUpperCase();
            if (s === 'REJECTED' || s === 'DECLINED') {
                query.status = { $in: ['REJECTED', 'DECLINED'] };
            }
            else {
                query.status = s;
            }
        }
        const interests = await Interest_1.Interest.find(query)
            .populate('sender', 'fullName verificationStatus email')
            .sort({ createdAt: -1 })
            .lean();
        const senderIds = interests.map((i) => extractEntityId(i.sender, i.senderId)).filter(Boolean);
        const profiles = await Profile_1.Profile.find({ user: { $in: senderIds } })
            .select('user displayName profession specialization degree education city state primaryPhoto photos age dob gender')
            .lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const enriched = interests.map((i) => {
            const sId = extractEntityId(i.sender, i.senderId);
            return {
                ...i,
                senderProfile: sId ? profileMap.get(sId) || null : null,
            };
        });
        res.json({ success: true, data: enriched });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get Accepted Connections (Interests accepted in either direction)
 */
async function getAcceptedConnections(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const interests = await Interest_1.Interest.find({
            $or: [{ sender: userId }, { receiver: userId }],
            status: 'ACCEPTED',
        })
            .populate('sender', 'fullName verificationStatus email')
            .populate('receiver', 'fullName verificationStatus email')
            .sort({ updatedAt: -1 })
            .lean();
        const otherUserIds = interests.map((i) => {
            const sId = extractEntityId(i.sender, i.senderId);
            const rId = extractEntityId(i.receiver, i.receiverId);
            return sId === String(userId) ? rId : sId;
        }).filter(Boolean);
        const profiles = await Profile_1.Profile.find({ user: { $in: otherUserIds } })
            .select('user displayName profession specialization degree education city state primaryPhoto photos age dob gender')
            .lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const enriched = interests.map((i) => {
            const sId = extractEntityId(i.sender, i.senderId);
            const isSender = sId === String(userId);
            const otherUser = isSender ? i.receiver : i.sender;
            const otherUserId = isSender ? extractEntityId(i.receiver, i.receiverId) : sId;
            const otherProfile = otherUserId ? profileMap.get(otherUserId) || null : null;
            return {
                ...i,
                isSender,
                otherUser,
                otherProfile,
            };
        });
        res.json({ success: true, data: enriched });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=interestController.js.map