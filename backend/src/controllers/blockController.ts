import { Response, NextFunction } from 'express';
import { Block } from '../models/Block';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { AuthRequest } from '../middleware/authMiddleware';
import { isValidObjectId } from '../utils/securityUtils';
import mongoose from 'mongoose';

// Helper to resolve User ID whether given a User ID or a Profile ID
async function resolveTargetUserId(idOrProfileId: string): Promise<string | null> {
  if (!isValidObjectId(idOrProfileId)) return null;

  // Check if it's already a valid User ID
  const directUser = await User.findById(idOrProfileId).select('_id');
  if (directUser) return String(directUser._id);

  // Check if it's a Profile ID
  const profile = await Profile.findById(idOrProfileId).select('user');
  if (profile && profile.user) return String(profile.user);

  return null;
}

export async function blockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { blockedUserId, profileId, reason } = req.body;
    const targetId = blockedUserId || profileId;

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'A blockedUserId or profileId is required' });
    }

    const resolvedUserId = await resolveTargetUserId(targetId);
    if (!resolvedUserId) {
      return res.status(404).json({ success: false, message: 'User or profile to block not found' });
    }

    if (String(userId) === String(resolvedUserId)) {
      return res.status(400).json({ success: false, message: 'You cannot block your own profile' });
    }

    const block = await Block.findOneAndUpdate(
      { blocker: userId, blockedUser: resolvedUserId },
      { blocker: userId, blockedUser: resolvedUserId, reason: (reason || '').trim().slice(0, 500) },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'Profile blocked successfully', data: block });
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

    const rawId = req.params.blockedUserId || req.params.id;
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Invalid target ID' });
    }

    const resolvedUserId = await resolveTargetUserId(rawId);
    if (!resolvedUserId) {
      return res.status(404).json({ success: false, message: 'User or profile not found' });
    }

    const block = await Block.findOneAndDelete({ blocker: userId, blockedUser: resolvedUserId });
    if (!block) {
      return res.status(404).json({ success: false, message: 'Blocked record not found' });
    }

    res.json({ success: true, message: 'Profile unblocked successfully' });
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

    const blocks = await Block.find({ blocker: userId })
      .sort({ createdAt: -1 })
      .populate('blockedUser', 'fullName email verificationStatus isActive')
      .lean();

    const blockedUserIds = blocks.map((b: any) => b.blockedUser?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: blockedUserIds } })
      .select('user displayName primaryPhoto photos education degree profession city state verificationStatus')
      .lean();

    const profileMap = new Map();
    profiles.forEach((p: any) => {
      profileMap.set(String(p.user), p);
    });

    const enrichedBlocks = blocks.map((b: any) => {
      const uId = b.blockedUser?._id ? String(b.blockedUser._id) : null;
      const prof = uId ? profileMap.get(uId) : null;
      return {
        _id: b._id,
        blocker: b.blocker,
        blockedUser: b.blockedUser,
        profile: prof || null,
        reason: b.reason || '',
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });

    res.json({ success: true, data: enrichedBlocks });
  } catch (error) {
    next(error);
  }
}

export const blockProfileById = blockUser;
export const unblockProfileById = unblockUser;
export const getBlockedProfiles = getBlockedUsers;

