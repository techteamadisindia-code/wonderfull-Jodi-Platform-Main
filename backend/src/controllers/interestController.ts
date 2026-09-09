<<<<<<< HEAD
import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Interest } from '../models/Interest';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Block } from '../models/Block';
import { Notification } from '../models/Notification';
import { Conversation } from '../models/Conversation';
import { Subscription } from '../models/Subscription';
import { AuthRequest } from '../middleware/authMiddleware';
import { isValidObjectId } from '../utils/securityUtils';
import { z } from 'zod';

const createInterestSchema = z.object({
  receiverId: z.string().optional(),
  profileId: z.string().optional(),
  targetUserId: z.string().optional(),
});

const updateInterestSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED', 'REJECTED', 'CANCELLED']),
});

/**
 * Helper to resolve target user ID whether given receiverId, profileId, or targetUserId
 */
async function resolveTargetUserId(body: { receiverId?: string; profileId?: string; targetUserId?: string }): Promise<string | null> {
  const rawId = body.receiverId || body.profileId || body.targetUserId;
  if (!rawId || !isValidObjectId(rawId)) {
    return null;
  }

  // Check if it's already a User ID
  const directUser = await User.findById(rawId);
  if (directUser) {
    return String(directUser._id);
  }

  // Check if it's a Profile ID
  const profile = await Profile.findById(rawId);
  if (profile && profile.user) {
    return String(profile.user);
  }

  return null;
}

/**
 * Send Interest from Authenticated User to Target User/Profile
 */
export async function createInterest(req: AuthRequest, res: Response, next: NextFunction) {
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
    const receiverUser = await User.findById(targetUserId);
    if (!receiverUser || !receiverUser.isActive) {
      return res.status(404).json({ success: false, message: 'Candidate not found or inactive' });
    }

    // Enforce recipient's whoCanSendInterest privacy setting
    const targetProfile = await Profile.findOne({ user: targetUserId });
    const interestPrivacy = targetProfile?.privacySettings?.whoCanSendInterest || 'all';

    if (interestPrivacy === 'verified_only') {
      const senderUser = await User.findById(senderUserId);
      const isSenderVerified = senderUser?.verified || senderUser?.verificationStatus === 'VERIFIED';
      if (!isSenderVerified) {
        return res.status(403).json({
          success: false,
          message: 'This doctor only accepts interest requests from verified doctor profiles.',
        });
      }
    } else if (interestPrivacy === 'premium_only') {
      const isSenderPremium =
        req.user?.role === 'admin' ||
        Boolean(
          await Subscription.findOne({
            user: senderUserId,
            status: 'ACTIVE',
            $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
          })
        );
      if (!isSenderPremium) {
        return res.status(403).json({
          success: false,
          message: 'This doctor only accepts interest requests from Premium members.',
        });
      }
    }

    // Verify no block relationship
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: senderUserId, blockedUser: targetUserId },
        { blocker: targetUserId, blockedUser: senderUserId },
      ],
    });
    if (isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot send interest to this member' });
    }

    // Check if interest already exists in either direction
    const existing = await Interest.findOne({
      $or: [
        { sender: senderUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: senderUserId },
      ],
    });

    if (existing) {
      if (existing.sender.toString() === senderUserId) {
        if (existing.status === 'PENDING') {
          return res.status(200).json({
            success: true,
            message: 'Interest already sent to this profile',
            data: existing,
          });
        }
        if (existing.status === 'ACCEPTED') {
          return res.status(200).json({
            success: true,
            message: 'Interest already accepted! You can chat with this member.',
            data: existing,
          });
        }
        // If previously declined or cancelled, allow re-sending
        existing.status = 'PENDING';
        existing.updatedAt = new Date();
        await existing.save();
      } else {
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
          return res.status(200).json({
            success: true,
            message: 'Interest already accepted!',
            data: existing,
          });
        }
      }
    }

    // Fetch sender and receiver profile details
    const senderUser = await User.findById(senderUserId);
    const senderProfile = await Profile.findOne({ user: senderUserId });
    const receiverProfile = await Profile.findOne({ user: targetUserId });
    const senderName = senderProfile?.displayName || senderUser?.fullName || 'A candidate';
    const senderPhoto = senderProfile?.primaryPhoto || senderProfile?.photos?.[0] || '';
    const senderProfileId = senderProfile ? String(senderProfile._id) : '';
    const receiverProfileId = receiverProfile ? String(receiverProfile._id) : '';

    const interest =
      existing && existing.sender.toString() === senderUserId
        ? existing
        : await Interest.create({
            sender: senderUserId,
            receiver: targetUserId,
            senderProfile: senderProfile?._id,
            receiverProfile: receiverProfile?._id,
            status: 'PENDING',
          });

    // Create real database Notification for receiver (matches "❤️ Rushikesh K sent you an interest")
    const notification = await Notification.create({
      user: targetUserId,
      type: 'INTEREST_RECEIVED',
      title: 'New Interest Received',
      message: `❤️ ${senderName} sent you an interest.`,
      actionUrl: senderProfileId ? `/profile/${senderProfileId}` : '/notifications',
      link: senderProfileId ? `/profile/${senderProfileId}` : '/notifications',
      read: false,
      metadata: {
        interestId: interest._id,
        senderUserId,
        senderName,
        senderPhoto,
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
          profileId: senderProfileId,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Interest sent successfully',
      data: interest,
    });
=======
import { Request, Response, NextFunction } from 'express';
import { Interest } from '../models/Interest';
import { AuthRequest } from '../middleware/authMiddleware';

export async function createInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver is required' });
    }
    const existing = await Interest.findOne({ sender: req.user?.userId, receiver: receiverId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Interest already sent' });
    }

    const interest = await Interest.create({ sender: req.user?.userId, receiver: receiverId });
    res.status(201).json({ success: true, data: interest });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  } catch (error) {
    next(error);
  }
}

<<<<<<< HEAD
/**
 * Check interest status between authenticated user and target profile/user
 */
export async function checkInterestStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const targetId = req.params.targetId;
    if (!targetId || !isValidObjectId(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid target ID' });
    }

    const targetUserId = await resolveTargetUserId({ receiverId: targetId });
    if (!targetUserId) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    const interest = await Interest.findOne({
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

    const isSender = interest.sender.toString() === userId;
    const isReceiver = interest.receiver.toString() === userId;
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
  } catch (error) {
    next(error);
  }
}

/**
 * Accept received interest
 */
export async function acceptInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid interest ID' });
    }

    const interest = await Interest.findById(id);
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }

    const isReceiver = interest.receiver.toString() === userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isReceiver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can accept this interest request',
      });
    }

    interest.status = 'ACCEPTED';
    await interest.save();

    // Fetch recipient info for sender notification
    const recipientUser = await User.findById(userId);
    const recipientProfile = await Profile.findOne({ user: userId });
    const recipientName = recipientProfile?.displayName || recipientUser?.fullName || 'Your match';
    const recipientPhoto = recipientProfile?.primaryPhoto || recipientProfile?.photos?.[0] || '';
    const recipientProfileId = recipientProfile ? String(recipientProfile._id) : '';

    // Create database Notification for sender
    const senderUserId = interest.sender.toString();
    const notification = await Notification.create({
      user: senderUserId,
      type: 'INTEREST_ACCEPTED',
      title: 'Interest Accepted! 🎉',
      message: `${recipientName} accepted your interest request. You can now chat!`,
      actionUrl: `/messages?user=${userId}`,
      link: `/messages?user=${userId}`,
      read: false,
      metadata: {
        interestId: interest._id,
        recipientUserId: userId,
        recipientName,
        recipientPhoto,
        recipientProfileId,
        type: 'INTEREST_ACCEPTED',
      },
    });

    // Ensure active Conversation exists between participants
    let conversation = await Conversation.findOne({
      participants: { $all: [senderUserId, userId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderUserId, userId],
        interest: interest._id,
        status: 'ACTIVE',
        complianceStatus: 'SAFE',
        messageCount: 0,
        lastActivityAt: new Date(),
      });
    } else {
      conversation.status = 'ACTIVE';
      conversation.interest = interest._id;
      await conversation.save();
    }

    // Real-time notification via Socket.IO
    const io = req.app?.get('io');
    if (io) {
      io.to(`user:${senderUserId}`).emit('newNotification', {
        notification,
        unreadCountDelta: 1,
      });
      io.to(`user:${senderUserId}`).emit('interestAccepted', {
        interest,
        conversationId: conversation._id,
        recipient: {
          id: userId,
          name: recipientName,
          photo: recipientPhoto,
        },
      });
    }

    res.json({
      success: true,
      message: 'Interest accepted successfully. Chat is now available!',
      data: {
        interest,
        conversationId: conversation._id,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Decline received interest
 */
export async function declineInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid interest ID' });
    }

    const interest = await Interest.findById(id);
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }

    const isReceiver = interest.receiver.toString() === userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isReceiver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can decline this interest request',
      });
    }

    interest.status = 'DECLINED';
    await interest.save();

    // Fetch recipient info
    const recipientUser = await User.findById(userId);
    const recipientProfile = await Profile.findOne({ user: userId });
    const recipientName = recipientProfile?.displayName || recipientUser?.fullName || 'Candidate';

    // Create database Notification for sender
    const senderUserId = interest.sender.toString();
    const notification = await Notification.create({
      user: senderUserId,
      type: 'INTEREST_DECLINED',
      title: 'Interest Update',
      message: `${recipientName} declined your interest request.`,
      actionUrl: '/notifications',
      link: '/notifications',
      read: false,
      metadata: {
        interestId: interest._id,
        recipientUserId: userId,
        type: 'INTEREST_DECLINED',
      },
    });

    const io = req.app?.get('io');
    if (io) {
      io.to(`user:${senderUserId}`).emit('newNotification', {
        notification,
        unreadCountDelta: 1,
      });
      io.to(`user:${senderUserId}`).emit('interestDeclined', { interest });
    }

    res.json({
      success: true,
      message: 'Interest declined',
      data: interest,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generic update (for backward compatibility)
 */
export async function updateInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = req.body?.status;
    if (status === 'ACCEPTED') {
      return acceptInterest(req, res, next);
    }
    if (status === 'DECLINED' || status === 'REJECTED') {
      return declineInterest(req, res, next);
    }
    if (status === 'CANCELLED') {
      const userId = req.user?.userId;
      const { id } = req.params;
      const interest = await Interest.findById(id);
      if (!interest) return res.status(404).json({ success: false, message: 'Interest not found' });
      if (interest.sender.toString() !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only sender can cancel' });
      }
      interest.status = 'CANCELLED';
      await interest.save();
      return res.json({ success: true, data: interest });
    }
    return res.status(400).json({ success: false, message: 'Invalid status' });
=======
export async function updateInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const interest = await Interest.findById(req.params.id);
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }
    if (interest.receiver.toString() !== req.user?.userId && interest.sender.toString() !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (status) interest.status = status;
    await interest.save();
    res.json({ success: true, data: interest });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  } catch (error) {
    next(error);
  }
}

<<<<<<< HEAD
/**
 * Get Sent Interests
 */
export async function getSentInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const interests = await Interest.find({ sender: userId })
      .populate('receiver', 'fullName verificationStatus email')
      .sort({ createdAt: -1 })
      .lean();

    const receiverIds = interests.map((i: any) => i.receiver?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: receiverIds } })
      .select('user displayName profession city state primaryPhoto photos age education')
      .lean();
    const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));

    const enriched = interests.map((i: any) => ({
      ...i,
      receiverProfile: i.receiver ? profileMap.get(String(i.receiver._id)) || null : null,
    }));

    res.json({ success: true, data: enriched });
=======
export async function getSentInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const interests = await Interest.find({ sender: req.user?.userId }).populate('receiver', 'fullName');
    res.json({ success: true, data: interests });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  } catch (error) {
    next(error);
  }
}

<<<<<<< HEAD
/**
 * Get Received Interests
 */
export async function getReceivedInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const interests = await Interest.find({ receiver: userId })
      .populate('sender', 'fullName verificationStatus email')
      .sort({ createdAt: -1 })
      .lean();

    const senderIds = interests.map((i: any) => i.sender?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: senderIds } })
      .select('user displayName profession city state primaryPhoto photos age education')
      .lean();
    const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));

    const enriched = interests.map((i: any) => ({
      ...i,
      senderProfile: i.sender ? profileMap.get(String(i.sender._id)) || null : null,
    }));

    res.json({ success: true, data: enriched });
=======
export async function getReceivedInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const interests = await Interest.find({ receiver: req.user?.userId }).populate('sender', 'fullName');
    res.json({ success: true, data: interests });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  } catch (error) {
    next(error);
  }
}
