import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Report } from '../models/Report';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import mongoose from 'mongoose';

export async function submitReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reporterId = req.user?.userId || (req.user as any)?._id;
    if (!reporterId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { reportedUserId, profileId, reason, details, description, targetType = 'PROFILE', messageSnippet } = req.body;

    if (!reason || String(reason).trim() === '') {
      return res.status(400).json({ success: false, message: 'Please specify a reason for the report.' });
    }

    let targetUserId = reportedUserId;

    // If profileId was supplied instead of reportedUserId, resolve target user from profile
    if (!targetUserId && profileId) {
      if (!mongoose.Types.ObjectId.isValid(profileId)) {
        return res.status(400).json({ success: false, message: 'Invalid profile ID format' });
      }
      const prof = await Profile.findById(profileId);
      if (!prof) {
        return res.status(404).json({ success: false, message: 'Reported profile not found' });
      }
      targetUserId = prof.user;
    }

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'A valid reported user or profile ID is required.' });
    }

    if (String(reporterId) === String(targetUserId)) {
      return res.status(400).json({ success: false, message: 'You cannot report your own account.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Reported user account not found.' });
    }

    // Check duplicate pending report in the last 10 minutes to prevent spamming
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingPending = await Report.findOne({
      reporter: reporterId,
      reportedUser: targetUserId,
      status: 'PENDING',
      createdAt: { $gte: tenMinutesAgo },
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You have recently submitted a report for this user. Our moderation team is currently reviewing it.',
      });
    }

    const report = await Report.create({
      reporter: reporterId,
      reportedUser: targetUserId,
      reportedProfile: profileId && mongoose.Types.ObjectId.isValid(profileId) ? profileId : undefined,
      reason: String(reason).trim(),
      details: (details || description || '').trim(),
      description: (description || details || '').trim(),
      status: 'PENDING',
      targetType: ['PROFILE', 'MESSAGE', 'USER', 'OTHER'].includes(targetType) ? targetType : 'PROFILE',
      messageSnippet: messageSnippet ? String(messageSnippet).trim() : undefined,
      actionTaken: 'NONE',
    });

    res.status(201).json({
      success: true,
      message: 'Your report has been submitted to the safety and moderation team.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}
