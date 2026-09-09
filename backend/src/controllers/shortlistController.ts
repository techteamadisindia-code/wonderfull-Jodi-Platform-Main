<<<<<<< HEAD
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
=======
import { Request, Response, NextFunction } from 'express';
import { Shortlist } from '../models/Shortlist';
import { AuthRequest } from '../middleware/authMiddleware';

export async function addShortlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ success: false, message: 'Profile ID is required' });
    }
    const existing = await Shortlist.findOne({ user: req.user?.userId, profile: profileId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Profile already shortlisted' });
    }
    const shortlist = await Shortlist.create({ user: req.user?.userId, profile: profileId });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    res.status(201).json({ success: true, data: shortlist });
  } catch (error) {
    next(error);
  }
}

export async function removeShortlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
<<<<<<< HEAD
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

=======
    const shortlist = await Shortlist.findOneAndDelete({ user: req.user?.userId, profile: req.params.profileId });
    if (!shortlist) {
      return res.status(404).json({ success: false, message: 'Shortlist not found' });
    }
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    res.json({ success: true, message: 'Removed from shortlist' });
  } catch (error) {
    next(error);
  }
}

export async function getShortlisted(req: AuthRequest, res: Response, next: NextFunction) {
  try {
<<<<<<< HEAD
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
      profile: item.profile ? serializePublicProfile(item.profile) : null,
    }));

    res.json({ success: true, data: sanitizedItems });
=======
    const items = await Shortlist.find({ user: req.user?.userId }).populate('profile');
    res.json({ success: true, data: items });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  } catch (error) {
    next(error);
  }
}
