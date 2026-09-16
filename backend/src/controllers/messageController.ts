import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Interest } from '../models/Interest';
import { Subscription } from '../models/Subscription';
import { Block } from '../models/Block';
import { detectCompliance } from '../services/complianceDetector';

export const PAID_PLANS = [
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
export async function isUserPaidMember(userId: string): Promise<boolean> {
  if (!userId || !mongoose.isValidObjectId(userId)) return false;

  const now = new Date();
  const activeSub = await Subscription.findOne({
    user: userId,
    status: 'ACTIVE',
    plan: { $ne: 'FREE', $in: PAID_PLANS },
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
export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
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

    let conversation: any = null;
    let actualReceiverId = receiverId;

    // Resolve receiver from profileId if passed
    if (!actualReceiverId && profileId && mongoose.isValidObjectId(profileId)) {
      const targetProfile = await Profile.findById(profileId);
      if (targetProfile && targetProfile.user) {
        actualReceiverId = String(targetProfile.user);
      }
    }

    if (conversationId && mongoose.isValidObjectId(conversationId)) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }

      // Verify participant
      const isParticipant = conversation.participants.some((p: any) => String(p) === String(senderId));
      if (!isParticipant && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation' });
      }

      // Determine recipient from conversation participants
      if (!actualReceiverId) {
        const other = conversation.participants.find((p: any) => String(p) !== String(senderId));
        actualReceiverId = other ? String(other) : null;
      }
    } else if (actualReceiverId && mongoose.isValidObjectId(actualReceiverId)) {
      // Find or prepare conversation
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, actualReceiverId], $size: 2 },
      });
    } else {
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
    const senderUser = await User.findById(senderId);
    if (
      !senderUser ||
      !senderUser.isActive ||
      ['Suspended', 'Blocked', 'Deleted'].includes(senderUser.status as any) ||
      senderUser.isDeleted
    ) {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently restricted from messaging due to account status.',
      });
    }

    // Verify recipient user exists and is active
    const receiverUser = await User.findById(actualReceiverId);
    if (
      !receiverUser ||
      !receiverUser.isActive ||
      ['Suspended', 'Blocked', 'Deleted'].includes(receiverUser.status as any) ||
      receiverUser.isDeleted
    ) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found or account is deactivated/restricted.',
      });
    }

    // Check if blocked
    const isBlocked = await Block.findOne({
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
    const interest = await Interest.findOne({
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
      conversation = await Conversation.create({
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
    const complianceResult = detectCompliance(cleanContent);

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
    const message = await Message.create({
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
    await Conversation.findByIdAndUpdate(conversation._id, {
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

    const populatedMessage = await Message.findById(message._id)
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
  } catch (error) {
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
export async function initiateConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const senderId = req.user?.userId;
    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { targetUserId, receiverId, profileId } = req.body;
    let actualReceiverId = targetUserId || receiverId;

    if (!actualReceiverId && profileId && mongoose.isValidObjectId(profileId)) {
      const profile = await Profile.findById(profileId);
      if (profile && profile.user) {
        actualReceiverId = String(profile.user);
      }
    }

    if (!actualReceiverId || !mongoose.isValidObjectId(actualReceiverId)) {
      return res.status(400).json({ success: false, message: 'Valid target user or profile is required' });
    }

    if (String(senderId) === String(actualReceiverId)) {
      return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
    }

    // ─── 1. ACCEPTED INTEREST REQUIRED ───
    const interest = await Interest.findOne({
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
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, actualReceiverId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
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
  } catch (error) {
    next(error);
  }
}

/**
 * Get user conversations list with other participant profiles
 */
export async function getUserConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const isPaid = req.user?.role === 'admin' || (await isUserPaidMember(String(userId)));

    const conversations = await Conversation.find({
      participants: userId,
      status: { $ne: 'ARCHIVED' },
    })
      .populate('participants', 'fullName email verificationStatus')
      .populate('interest', 'status')
      .sort({ lastActivityAt: -1 })
      .lean();

    const otherUserIds = conversations
      .flatMap((c: any) => c.participants || [])
      .map((u: any) => u?._id)
      .filter((id: any) => id && String(id) !== String(userId));

    const profiles = await Profile.find({ user: { $in: otherUserIds } })
      .select('user displayName profession specialization degree education city state primaryPhoto photos age dob')
      .lean();
    const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));

    const enriched = await Promise.all(
      conversations.map(async (c: any) => {
        const otherParticipant = c.participants?.find((p: any) => String(p._id) !== String(userId));
        const otherProfile = otherParticipant ? profileMap.get(String(otherParticipant._id)) : null;

        // Count messages sent by authenticated user in this conversation
        const sentCount = await Message.countDocuments({
          conversation: c._id,
          sender: userId,
        });

        // Count unread messages received in this conversation
        const unreadCount = await Message.countDocuments({
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
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Get messages inside a conversation for the authenticated user
 */
export async function getConversationMessagesForUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
    })
      .populate('participants', 'fullName email verificationStatus')
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Mark messages sent by the other user as read
    await Message.updateMany(
      { conversation: id, receiver: userId, read: false },
      { $set: { read: true } }
    );

    const messages = await Message.find({ conversation: id })
      .populate('sender', 'fullName')
      .populate('receiver', 'fullName')
      .sort({ createdAt: 1 })
      .lean();

    const conv = conversation as any;
    const otherParticipant = conv?.participants?.find((p: any) => String(p._id) !== String(userId));
    const otherProfile = otherParticipant
      ? await Profile.findOne({ user: otherParticipant._id }).select('displayName primaryPhoto photos profession specialization degree education city state').lean()
      : null;

    const isPaid = req.user?.role === 'admin' || (await isUserPaidMember(String(userId)));
    const sentCount = await Message.countDocuments({
      conversation: id,
      sender: userId,
    });

    const otherUserData = otherParticipant
      ? {
          ...otherParticipant,
          displayName: (otherProfile as any)?.displayName || otherParticipant.fullName,
          primaryPhoto: (otherProfile as any)?.primaryPhoto || (otherProfile as any)?.photos?.[0] || '',
          profession: (otherProfile as any)?.profession || 'Doctor / Professional',
          specialization: (otherProfile as any)?.specialization,
          degree: (otherProfile as any)?.degree,
          city: (otherProfile as any)?.city,
          state: (otherProfile as any)?.state,
          profileId: (otherProfile as any)?._id,
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
  } catch (error) {
    next(error);
  }
}
