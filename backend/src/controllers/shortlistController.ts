import { Response, NextFunction } from 'express';
import { Shortlist } from '../models/Shortlist';
import { Profile } from '../models/Profile';
import { AuthRequest } from '../middleware/authMiddleware';
import { isValidObjectId, serializePublicProfile } from '../utils/securityUtils';

export async function addShortlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { profileId } = req.body;
    if (!isValidObjectId(profileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const profileExists = await Profile.findById(profileId);
    if (!profileExists) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const existing = await Shortlist.findOne({ user: userId, profile: profileId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Profile already shortlisted' });
    }

    const shortlist = await Shortlist.create({ user: userId, profile: profileId });
    res.status(201).json({ success: true, data: shortlist });
  } catch (error) {
    next(error);
  }
}

export async function removeShortlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { profileId } = req.params;
    if (!isValidObjectId(profileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const shortlist = await Shortlist.findOneAndDelete({ user: userId, profile: profileId });
    if (!shortlist) {
      return res.status(404).json({ success: false, message: 'Shortlist entry not found' });
    }

    res.json({ success: true, message: 'Removed from shortlist' });
  } catch (error) {
    next(error);
  }
}

export async function getShortlisted(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const items = await Shortlist.find({ user: userId }).populate({
      path: 'profile',
      populate: { path: 'user', select: 'fullName verificationStatus verified' },
    });

    const sanitizedItems = items.map((item: any) => ({
      _id: item._id,
      user: item.user,
      createdAt: item.createdAt,
      profile: item.profile ? serializePublicProfile(item.profile, { viewerUserId: userId }) : null,
    }));

    res.json({ success: true, data: sanitizedItems });
  } catch (error) {
    next(error);
  }
}
