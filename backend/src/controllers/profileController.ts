import { Request, Response, NextFunction } from 'express';
import { Profile } from '../models/Profile';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { z } from 'zod';

const profileSchema = z.object({
  displayName: z.string().min(2),
  gender: z.enum(['Male', 'Female', 'Other']),
  dob: z.string().min(10),
  height: z.string().min(1),
  maritalStatus: z.string().min(1),
  motherTongue: z.string().min(1),
  religion: z.string().min(1),
  caste: z.string().min(1),
  education: z.string().min(1),
  degree: z.string().min(1),
  profession: z.string().min(1),
  country: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(1),
  about: z.string().optional(),
  photos: z.array(z.string()).optional(),
  primaryPhoto: z.string().optional(),
});

export async function getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await Profile.findOne({ user: req.user?.userId }).populate('user', 'fullName email mobile');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await Profile.findById(req.params.id).populate('user', 'fullName email mobile');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function createProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = profileSchema.parse(req.body);
    const existing = await Profile.findOne({ user: req.user?.userId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Profile already exists' });
    }

    const profile = await Profile.create({
      ...data,
      user: req.user?.userId,
      photos: data.photos ?? [],
      primaryPhoto: data.primaryPhoto,
    });
    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile || profile.user.toString() !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const data = profileSchema.partial().parse(req.body);
    Object.assign(profile, data);
    await profile.save();
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function deleteProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile || profile.user.toString() !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await profile.deleteOne();
    await User.findByIdAndUpdate(req.user?.userId, { isActive: false });
    res.json({ success: true, message: 'Profile deleted' });
  } catch (error) {
    next(error);
  }
}
