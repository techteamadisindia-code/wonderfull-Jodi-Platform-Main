import { Response, NextFunction } from 'express';
import { Block } from '../models/Block';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { AuthRequest } from '../middleware/authMiddleware';
import { isValidObjectId } from '../utils/securityUtils';
import { findCanonicalProfile } from './profileController';
import mongoose from '../db/prismaBridge';

// Helper to resolve User ID whether given a User ID, Profile ID, or Candidate ID (e.g. WJ-100092)
async function resolveTargetUserId(idOrProfileId: string): Promise<string | null> {
  const rawId = (idOrProfileId || '').trim();
  if (!rawId || rawId.length < 3 || rawId.length > 50) return null;

  // 1. Check canonical profile resolution (handles candidateId like WJ-100092, profile _id, legacy WJ-[hex])
  const profile = await findCanonicalProfile(rawId);
  if (profile && profile.user) {
    return String(profile.user._id || profile.user.id || profile.user);
  }

  // 2. Direct User lookup if rawId matches ObjectId or UUID format
  if (isValidObjectId(rawId) || /^[0-9a-fA-F]{24}$/.test(rawId) || /^[A-Za-z0-9_-]{20,36}$/.test(rawId)) {
    const directUser = await User.findById(rawId).select('_id');
    if (directUser) return String(directUser._id || directUser.id);
  }

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

