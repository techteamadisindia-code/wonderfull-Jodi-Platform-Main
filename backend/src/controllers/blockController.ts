import { Response, NextFunction } from 'express';
import { Block } from '../models/Block';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { isValidObjectId } from '../utils/securityUtils';
import { z } from 'zod';

const blockSchema = z.object({
  blockedUserId: z.string().min(1, 'Blocked User ID is required'),
  reason: z.string().trim().max(500).optional(),
});

export async function blockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { blockedUserId, reason } = blockSchema.parse(req.body);

    if (!isValidObjectId(blockedUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID to block' });
    }

    if (userId === blockedUserId) {
      return res.status(400).json({ success: false, message: 'You cannot block your own account' });
    }

    const userToBlock = await User.findById(blockedUserId);
    if (!userToBlock) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const block = await Block.findOneAndUpdate(
      { blocker: userId, blockedUser: blockedUserId },
      { blocker: userId, blockedUser: blockedUserId, reason },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'User blocked successfully', data: block });
  } catch (error) {
    next(error);
  }
}

export async function unblockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { blockedUserId } = req.params;
    if (!isValidObjectId(blockedUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const block = await Block.findOneAndDelete({ blocker: userId, blockedUser: blockedUserId });
    if (!block) {
      return res.status(404).json({ success: false, message: 'Blocked record not found' });
    }

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getBlockedUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const blocks = await Block.find({ blocker: userId }).populate('blockedUser', 'fullName role');
    res.json({ success: true, data: blocks });
  } catch (error) {
    next(error);
  }
}
