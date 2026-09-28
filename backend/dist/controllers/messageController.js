"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAID_PLANS = void 0;
exports.isUserPaidMember = isUserPaidMember;
exports.sendMessage = sendMessage;
exports.initiateConversation = initiateConversation;
exports.getUserConversations = getUserConversations;
exports.getConversationMessagesForUser = getConversationMessagesForUser;
const mongoose_1 = __importDefault(require("mongoose"));
const Message_1 = require("../models/Message");
const Conversation_1 = require("../models/Conversation");
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const Interest_1 = require("../models/Interest");
const Subscription_1 = require("../models/Subscription");
const Block_1 = require("../models/Block");
const complianceDetector_1 = require("../services/complianceDetector");
exports.PAID_PLANS = [
    'DOCTOR_CONNECT',
    'PREMIUM_MATCH',
    'PRIORITY_MATCHMAKING',
    'EXCLUSIVE_CONCIERGE',
    'PREMIUM',
    'PREMIUM_VIP',
    'GOLD',
    'PLATINUM',
    'DIAMOND',
    'VVIP',
];
/**
 * Helper to check if a user has an active, unexpired paid membership in the database.
 * DO NOT trust client state. Status must be ACTIVE and expiryDate must be in the future.
 */
async function isUserPaidMember(userId) {
    if (!userId || !mongoose_1.default.isValidObjectId(userId))
        return false;
    const now = new Date();
    const activeSub = await Subscription_1.Subscription.findOne({
        user: userId,
        status: 'ACTIVE',
        plan: { $ne: 'FREE', $in: exports.PAID_PLANS },
        $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
    }).sort({ createdAt: -1 });
    return Boolean(activeSub);
}
/**
 * Send a message within a conversation (or to a recipient user).
 * Strict Backend Enforcement:
 * 1. Active Paid Membership required (HTTP 403 PREMIUM_REQUIRED)
 * 2. Accepted Interest relationship required (HTTP 403 INTEREST_NOT_ACCEPTED)
 * 3. Contact information & phone number compliance blocking
 */
async function sendMessage(req, res, next) {
    try {
        const senderId = req.user?.userId;
        if (!senderId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        // ─── 1. STRICT MEMBERSHIP VALIDATION ───
        const isPaid = req.user?.role === 'admin' || (await isUserPaidMember(String(senderId)));
        if (!isPaid) {
            return res.status(403).json({
                success: false,
                code: 'PREMIUM_REQUIRED',
                message: 'Active paid membership required to start chat.',
            });
        }
        const { conversationId, receiverId, profileId, content } = req.body;
        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ success: false, message: 'Message content is required' });
        }
        const cleanContent = content.trim().slice(0, 5000);
        let conversation = null;
        let actualReceiverId = receiverId;
        // Resolve receiver from profileId if passed
        if (!actualReceiverId && profileId && mongoose_1.default.isValidObjectId(profileId)) {
            const targetProfile = await Profile_1.Profile.findById(profileId);
            if (targetProfile && targetProfile.user) {
                actualReceiverId = String(targetProfile.user);
            }
        }
        if (conversationId && mongoose_1.default.isValidObjectId(conversationId)) {
            conversation = await Conversation_1.Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ success: false, message: 'Conversation not found' });
            }
            // Verify participant
            const isParticipant = conversation.participants.some((p) => String(p) === String(senderId));
            if (!isParticipant && req.user?.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation' });
            }
            // Determine recipient from conversation participants
            if (!actualReceiverId) {
                const other = conversation.participants.find((p) => String(p) !== String(senderId));
                actualReceiverId = other ? String(other) : null;
            }
        }
        else if (actualReceiverId && mongoose_1.default.isValidObjectId(actualReceiverId)) {
            // Find or prepare conversation
            conversation = await Conversation_1.Conversation.findOne({
                participants: { $all: [senderId, actualReceiverId], $size: 2 },
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'A valid conversationId, receiverId, or profileId is required',
            });
        }
        if (!actualReceiverId) {
            return res.status(400).json({ success: false, message: 'Unable to identify recipient user' });
        }
        if (String(senderId) === String(actualReceiverId)) {
            return res.status(400).json({ success: false, message: 'Cannot message yourself' });
        }
        // Verify sender is active and not restricted
        const senderUser = await User_1.User.findById(senderId);
        if (!senderUser ||
            !senderUser.isActive ||
            ['Suspended', 'Blocked', 'Deleted'].includes(senderUser.status) ||
            senderUser.isDeleted) {
            return res.status(403).json({
                success: false,
                message: 'Your account is currently restricted from messaging due to account status.',
            });
        }
        // Verify recipient user exists and is active
        const receiverUser = await User_1.User.findById(actualReceiverId);
        if (!receiverUser ||
            !receiverUser.isActive ||
            ['Suspended', 'Blocked', 'Deleted'].includes(receiverUser.status) ||
            receiverUser.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found or account is deactivated/restricted.',
            });
        }
        // Check if blocked
        const isBlocked = await Block_1.Block.findOne({
            $or: [
                { blocker: senderId, blockedUser: actualReceiverId },
                { blocker: actualReceiverId, blockedUser: senderId },
            ],
        });
        if (isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot message this member as communication is blocked.',
            });
        }
        // ─── 2. CHAT ACCESS CHECK: ACCEPTED INTEREST REQUIRED ───
        const interest = await Interest_1.Interest.findOne({
            $or: [
                { sender: senderId, receiver: actualReceiverId },
                { sender: actualReceiverId, receiver: senderId },
            ],
        });
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin) {
            if (!interest || interest.status !== 'ACCEPTED') {
                return res.status(403).json({
                    success: false,
                    code: 'INTEREST_NOT_ACCEPTED',
                    message: 'Chat is available only after the interest is accepted.',
                });
            }
        }
        // Ensure conversation exists in DB
        if (!conversation) {
            conversation = await Conversation_1.Conversation.create({
                participants: [senderId, actualReceiverId],
                interest: interest?._id,
                status: 'ACTIVE',
                complianceStatus: 'SAFE',
                messageCount: 0,
                lastActivityAt: new Date(),
            });
        }
        // Check if conversation itself is blocked
        if (conversation.status === 'BLOCKED' || conversation.complianceStatus === 'BLOCKED') {
            return res.status(403).json({
                success: false,
                message: 'This conversation has been restricted by platform safety moderation',
            });
        }
        // ─── 3. MESSAGE MODERATION & CONTACT INFO DETECTION ───
        const complianceResult = (0, complianceDetector_1.detectCompliance)(cleanContent);
        if (complianceResult.status === 'FLAGGED') {
            return res.status(400).json({
                success: false,
                code: 'CONTACT_INFO_BLOCKED',
                message: 'Sharing direct contact information (phone numbers, email addresses, or social media handles) is not allowed. Please use Wonderful Jodi chat.',
                category: complianceResult.category,
                reason: complianceResult.reason,
            });
        }
        // ─── 4. PERSIST MESSAGE ───
        const message = await Message_1.Message.create({
            conversation: conversation._id,
            sender: senderId,
            receiver: actualReceiverId,
            content: cleanContent,
            read: false,
            moderationStatus: complianceResult.status,
            moderationCategory: complianceResult.category,
            moderationConfidence: complianceResult.confidence,
            moderationScore: complianceResult.score,
            flaggedReason: complianceResult.reason,
            moderatedAt: new Date(),
        });
        // Update conversation metadata
        await Conversation_1.Conversation.findByIdAndUpdate(conversation._id, {
            lastMessage: cleanContent,
            lastActivityAt: new Date(),
            $inc: { messageCount: 1 },
            interest: interest?._id || conversation.interest,
            status: 'ACTIVE',
        });
        // ─── 5. EMIT REAL-TIME NOTIFICATIONS ───
        const io = req.app?.get('io');
        if (io) {
            const socketPayload = {
                room: String(conversation._id),
                message: {
                    _id: message._id,
                    conversation: message.conversation,
                    sender: senderId,
                    receiver: actualReceiverId,
                    content: message.content,
                    moderationStatus: message.moderationStatus,
                    createdAt: message.createdAt,
                },
            };
            io.to(String(conversation._id)).emit('receiveMessage', socketPayload);
            io.to(`user:${actualReceiverId}`).emit('newChatMessage', {
                conversationId: conversation._id,
                senderId,
                message: cleanContent,
            });
        }
        const populatedMessage = await Message_1.Message.findById(message._id)
            .populate('sender', 'fullName email')
            .populate('receiver', 'fullName email')
            .lean();
        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: {
                message: populatedMessage,
                stats: {
                    isPaid,
                    isPremium: isPaid,
                    canSendMessage: isPaid,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Initiate / Get Conversation with a user or profile
 * Backend must enforce:
 * 1. Both users exist
 * 2. Interest status = ACCEPTED
 * 3. Caller has active, unexpired paid membership
 */
async function initiateConversation(req, res, next) {
    try {
        const senderId = req.user?.userId;
        if (!senderId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { targetUserId, receiverId, profileId } = req.body;
        let actualReceiverId = targetUserId || receiverId;
        if (!actualReceiverId && profileId && mongoose_1.default.isValidObjectId(profileId)) {
            const profile = await Profile_1.Profile.findById(profileId);
            if (profile && profile.user) {
                actualReceiverId = String(profile.user);
            }
        }
        if (!actualReceiverId || !mongoose_1.default.isValidObjectId(actualReceiverId)) {
            return res.status(400).json({ success: false, message: 'Valid target user or profile is required' });
        }
        if (String(senderId) === String(actualReceiverId)) {
            return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
        }
        // ─── 1. ACCEPTED INTEREST REQUIRED ───
        const interest = await Interest_1.Interest.findOne({
            $or: [
                { sender: senderId, receiver: actualReceiverId },
                { sender: actualReceiverId, receiver: senderId },
            ],
        });
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin && (!interest || interest.status !== 'ACCEPTED')) {
            return res.status(403).json({
                success: false,
                code: 'INTEREST_NOT_ACCEPTED',
                message: 'Chat is available only after the interest is accepted.',
                status: interest ? interest.status : 'NONE',
            });
        }
        // ─── 2. ACTIVE PAID MEMBERSHIP REQUIRED ───
        const isPaid = isAdmin || (await isUserPaidMember(String(senderId)));
        if (!isPaid) {
            return res.status(403).json({
                success: false,
                code: 'PREMIUM_REQUIRED',
                message: 'Active paid membership required to start chat.',
            });
        }
        // ─── 3. EXACTLY ONE CONVERSATION ───
        let conversation = await Conversation_1.Conversation.findOne({
            participants: { $all: [senderId, actualReceiverId], $size: 2 },
        });
        if (!conversation) {
            conversation = await Conversation_1.Conversation.create({
                participants: [senderId, actualReceiverId],
                interest: interest?._id,
                status: 'ACTIVE',
                complianceStatus: 'SAFE',
                messageCount: 0,
                lastActivityAt: new Date(),
            });
        }
        res.json({
            success: true,
            data: {
                conversationId: conversation._id,
                conversation,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get user conversations list with other participant profiles
 */
async function getUserConversations(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const isPaid = req.user?.role === 'admin' || (await isUserPaidMember(String(userId)));
        const conversations = await Conversation_1.Conversation.find({
            participants: userId,
            status: { $ne: 'ARCHIVED' },
        })
            .populate('participants', 'fullName email verificationStatus')
            .populate('interest', 'status')
            .sort({ lastActivityAt: -1 })
            .lean();
        const otherUserIds = conversations
            .flatMap((c) => c.participants || [])
            .map((u) => u?._id)
            .filter((id) => id && String(id) !== String(userId));
        const profiles = await Profile_1.Profile.find({ user: { $in: otherUserIds } })
            .select('user displayName profession specialization degree education city state primaryPhoto photos age dob')
            .lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const enriched = await Promise.all(conversations.map(async (c) => {
            const otherParticipant = c.participants?.find((p) => String(p._id) !== String(userId));
            const otherProfile = otherParticipant ? profileMap.get(String(otherParticipant._id)) : null;
            // Count messages sent by authenticated user in this conversation
            const sentCount = await Message_1.Message.countDocuments({
                conversation: c._id,
                sender: userId,
            });
            // Count unread messages received in this conversation
            const unreadCount = await Message_1.Message.countDocuments({
                conversation: c._id,
                receiver: userId,
                read: false,
            });
            return {
                ...c,
                otherUser: otherParticipant
                    ? {
                        ...otherParticipant,
                        displayName: otherProfile?.displayName || otherParticipant.fullName,
                        primaryPhoto: otherProfile?.primaryPhoto || otherProfile?.photos?.[0] || '',
                        profession: otherProfile?.profession || 'Doctor / Professional',
                        specialization: otherProfile?.specialization,
                        degree: otherProfile?.degree,
                        city: otherProfile?.city,
                        state: otherProfile?.state,
                        profileId: otherProfile?._id,
                    }
                    : null,
                stats: {
                    messagesSentByMe: sentCount,
                    isPaid,
                    isPremium: isPaid,
                    canSendMessage: isPaid,
                    unreadCount,
                },
            };
        }));
        res.json({ success: true, data: enriched });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get messages inside a conversation for the authenticated user
 */
async function getConversationMessagesForUser(req, res, next) {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        }
        const conversation = await Conversation_1.Conversation.findOne({
            _id: id,
            participants: userId,
        })
            .populate('participants', 'fullName email verificationStatus')
            .lean();
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        // Mark messages sent by the other user as read
        await Message_1.Message.updateMany({ conversation: id, receiver: userId, read: false }, { $set: { read: true } });
        const messages = await Message_1.Message.find({ conversation: id })
            .populate('sender', 'fullName')
            .populate('receiver', 'fullName')
            .sort({ createdAt: 1 })
            .lean();
        const conv = conversation;
        const otherParticipant = conv?.participants?.find((p) => String(p._id) !== String(userId));
        const otherProfile = otherParticipant
            ? await Profile_1.Profile.findOne({ user: otherParticipant._id }).select('displayName primaryPhoto photos profession specialization degree education city state').lean()
            : null;
        const isPaid = req.user?.role === 'admin' || (await isUserPaidMember(String(userId)));
        const sentCount = await Message_1.Message.countDocuments({
            conversation: id,
            sender: userId,
        });
        const otherUserData = otherParticipant
            ? {
                ...otherParticipant,
                displayName: otherProfile?.displayName || otherParticipant.fullName,
                primaryPhoto: otherProfile?.primaryPhoto || otherProfile?.photos?.[0] || '',
                profession: otherProfile?.profession || 'Doctor / Professional',
                specialization: otherProfile?.specialization,
                degree: otherProfile?.degree,
                city: otherProfile?.city,
                state: otherProfile?.state,
                profileId: otherProfile?._id,
            }
            : null;
        res.json({
            success: true,
            data: {
                conversation,
                otherUser: otherUserData,
                messages,
                stats: {
                    messagesSentByMe: sentCount,
                    isPaid,
                    isPremium: isPaid,
                    canSendMessage: isPaid,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=messageController.js.map