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
  if (profile) {
    const u = profile.user || (profile as any).userId;
    if (u) return String(u._id || u.id || u);
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

    let block: any = null;
    try {
      block = await Block.findOneAndUpdate(
        { blocker: userId, blockedUser: resolvedUserId },
        { blocker: userId, blockedUser: resolvedUserId, reason: (reason || '').trim().slice(0, 500) },
        { upsert: true, new: true }
      );
    } catch (blockDbErr: any) {
      console.error('[BlockController] Error blocking user (table schema error):', blockDbErr?.message);
      return res.status(503).json({
        success: false,
        message: 'Profile blocking service is currently unavailable. Please contact support.',
      });
    }

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

    let block: any = null;
    try {
      block = await Block.findOneAndDelete({ blocker: userId, blockedUser: resolvedUserId });
    } catch (unblockDbErr: any) {
      console.error('[BlockController] Error unblocking user (table schema error):', unblockDbErr?.message);
      return res.status(503).json({
        success: false,
        message: 'Profile unblocking service is currently unavailable. Please contact support.',
      });
    }

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

    let blocks: any[] = [];
    try {
      blocks = await Block.find({ blocker: userId })
        .sort({ createdAt: -1 })
        .populate('blockedUser', 'fullName email verificationStatus isActive')
        .lean();
    } catch (dbErr: any) {
      console.error('[BlockController] Error fetching blocked users (database/schema error):', dbErr?.message);
      return res.status(503).json({
        success: false,
        message: 'Blocked profiles list is temporarily unavailable. Please try again later.',
      });
    }

    const blockedUserIds = blocks.map((b: any) => b.blockedUser?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: blockedUserIds } })
      .select('user displayName primaryPhoto photos education degree profession city state verificationStatus')
      .lean();

    const profileMap = new Map();
    profiles.forEach((p: any) => {
      const u = p.user ? String(p.user._id || p.user.id || p.user) : String(p.userId || '');
      if (u) profileMap.set(u, p);
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

