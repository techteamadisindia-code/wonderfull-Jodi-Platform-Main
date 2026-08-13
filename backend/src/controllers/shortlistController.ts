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
    res.status(201).json({ success: true, data: shortlist });
  } catch (error) {
    next(error);
  }
}

export async function removeShortlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const shortlist = await Shortlist.findOneAndDelete({ user: req.user?.userId, profile: req.params.profileId });
    if (!shortlist) {
      return res.status(404).json({ success: false, message: 'Shortlist not found' });
    }
    res.json({ success: true, message: 'Removed from shortlist' });
  } catch (error) {
    next(error);
  }
}

export async function getShortlisted(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await Shortlist.find({ user: req.user?.userId }).populate('profile');
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}
