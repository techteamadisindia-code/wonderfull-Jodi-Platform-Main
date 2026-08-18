import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { Report } from '../models/Report';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedProfiles = await Profile.countDocuments({ verificationStatus: 'VERIFIED' });
    const premiumUsers = await Subscription.countDocuments({ status: 'ACTIVE', plan: { $ne: 'FREE' } });
    const revenue = await Payment.aggregate([{ $match: { status: 'SUCCESS' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const newRegistrations = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        verifiedProfiles,
        premiumUsers,
        revenue: revenue[0]?.total || 0,
        newRegistrations,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: status === 'active' }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function getPendingVerifications(req: Request, res: Response, next: NextFunction) {
  try {
    const verifications = await Profile.find({ verificationStatus: 'PENDING' }).populate('user', 'fullName email mobile');
    res.json({ success: true, data: verifications });
  } catch (error) {
    next(error);
  }
}

export async function resolveReport(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, { status: 'RESOLVED' }, { new: true });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}
