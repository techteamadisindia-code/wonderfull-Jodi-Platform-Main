import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { Report } from '../models/Report';
import { Verification } from '../models/Verification';
import { Interest } from '../models/Interest';
import { Shortlist } from '../models/Shortlist';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { Notification } from '../models/Notification';
import { Admin } from '../models/Admin';
import { Setting } from '../models/Setting';
import { ContactInquiry } from '../models/ContactInquiry';
import { AuditLog } from '../models/AuditLog';

// Helper for audit logging
async function logAdminAction(adminEmail: string, action: string, details?: string, targetModel?: string, targetId?: string) {
  try {
    await AuditLog.create({
      adminEmail: adminEmail || 'admin@wonderfuljodi.com',
      action,
      details,
      targetModel,
      targetId,
      status: 'SUCCESS',
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}

// 1. Dashboard KPIs & Aggregations
export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const verifiedProfiles = await Profile.countDocuments({ verificationStatus: 'VERIFIED' });
    const pendingVerification = await Verification.countDocuments({ status: 'PENDING' });
    const premiumUsers = await Subscription.countDocuments({ status: 'ACTIVE', plan: { $ne: 'FREE' } });
    
    const revenueAgg = await Payment.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const pendingReports = await Report.countDocuments({ status: 'PENDING' });
    const newInquiries = await ContactInquiry.countDocuments({ status: 'NEW' });
    const totalInterests = await Interest.countDocuments();
    const totalShortlists = await Shortlist.countDocuments();
    const totalMessages = await Message.countDocuments();

    // 7-day registration trend
    const newRegistrations7d = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    const recentUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');

    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'fullName email mobile');

    const recentVerifications = await Verification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'fullName email mobile');

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        verifiedProfiles,
        pendingVerification,
        premiumUsers,
        totalRevenue,
        pendingReports,
        newInquiries,
        totalInterests,
        totalShortlists,
        totalMessages,
        newRegistrations7d,
        recentUsers,
        recentPayments,
        recentVerifications,
      },
    });
  } catch (error) {
    next(error);
  }
}

// 2. User Management
export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { search, role, status, page = 1, limit = 50 } = req.query;
    const query: any = {};

    if (role && role !== 'all') {
      query.role = role;
    }
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      const searchStr = String(search).trim();
      query.$or = [
        { fullName: { $regex: searchStr, $options: 'i' } },
        { email: { $regex: searchStr, $options: 'i' } },
        { mobile: { $regex: searchStr, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        users,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const profile = await Profile.findOne({ user: user._id });
    const subscription = await Subscription.findOne({ user: user._id }).sort({ createdAt: -1 });
    const verifications = await Verification.find({ user: user._id }).sort({ createdAt: -1 });
    const payments = await Payment.find({ user: user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        user,
        profile,
        subscription,
        verifications,
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { isActive, status } = req.body;
    const activeValue = typeof isActive === 'boolean' ? isActive : status === 'active';
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: activeValue },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAdminAction(
      req.user?.role || 'admin',
      'USER_STATUS_UPDATED',
      `Updated user ${user.email} status to ${activeValue ? 'ACTIVE' : 'INACTIVE'}`,
      'User',
      String(user._id)
    );

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (role === 'admin') {
      await Admin.findOneAndUpdate(
        { user: user._id },
        { permissions: ['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports'] },
        { upsert: true }
      );
    }

    await logAdminAction(
      req.user?.role || 'admin',
      'USER_ROLE_UPDATED',
      `Updated user ${user.email} role to ${role}`,
      'User',
      String(user._id)
    );

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Profile.deleteMany({ user: user._id });
    await Verification.deleteMany({ user: user._id });
    await Subscription.deleteMany({ user: user._id });
    await Payment.deleteMany({ user: user._id });
    await Interest.deleteMany({ $or: [{ sender: user._id }, { recipient: user._id }] });
    await Shortlist.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    await logAdminAction(
      req.user?.role || 'admin',
      'USER_DELETED',
      `Deleted user account ${user.email}`,
      'User',
      String(user._id)
    );

    res.json({ success: true, message: 'User and all related records deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// 3. Matrimonial Profile Management
export async function getProfiles(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { search, gender, religion, profession, verificationStatus, page = 1, limit = 50 } = req.query;
    const query: any = {};

    if (gender) query.gender = gender;
    if (religion) query.religion = religion;
    if (profession) query.profession = { $regex: String(profession), $options: 'i' };
    if (verificationStatus) query.verificationStatus = verificationStatus;

    if (search) {
      const searchStr = String(search).trim();
      query.$or = [
        { displayName: { $regex: searchStr, $options: 'i' } },
        { profession: { $regex: searchStr, $options: 'i' } },
        { city: { $regex: searchStr, $options: 'i' } },
        { company: { $regex: searchStr, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Profile.countDocuments(query);
    const profiles = await Profile.find(query)
      .populate('user', 'fullName email mobile role isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        profiles,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfileById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await Profile.findById(req.params.id).populate('user', 'fullName email mobile role isActive');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await Profile.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    await logAdminAction(
      req.user?.role || 'admin',
      'PROFILE_UPDATED',
      `Updated profile for ${profile.displayName}`,
      'Profile',
      String(profile._id)
    );

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

// 4. KYC / Degree Verification Queue
export async function getVerifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const verifications = await Verification.find(query)
      .populate('user', 'fullName email mobile verificationStatus verified isActive')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: verifications });
  } catch (error) {
    next(error);
  }
}

export async function approveVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body;
    const verification = await Verification.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED', notes: notes || 'Verified by Administrator' },
      { new: true }
    );

    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification record not found' });
    }

    // Update User & Profile
    await User.findByIdAndUpdate(verification.user, { verified: true, verificationStatus: 'VERIFIED' });
    await Profile.findOneAndUpdate({ user: verification.user }, { verificationStatus: 'VERIFIED' });

    await logAdminAction(
      req.user?.role || 'admin',
      'VERIFICATION_APPROVED',
      `Approved verification for User ID: ${verification.user}`,
      'Verification',
      String(verification._id)
    );

    res.json({ success: true, data: verification, message: 'Verification approved successfully' });
  } catch (error) {
    next(error);
  }
}

export async function rejectVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reason, notes } = req.body;
    const rejectNote = notes || reason || 'Document does not meet matrimonial verification requirements';

    const verification = await Verification.findByIdAndUpdate(
      req.params.id,
      { status: 'REJECTED', notes: rejectNote },
      { new: true }
    );

    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification record not found' });
    }

    // Update User & Profile
    await User.findByIdAndUpdate(verification.user, { verified: false, verificationStatus: 'REJECTED' });
    await Profile.findOneAndUpdate({ user: verification.user }, { verificationStatus: 'REJECTED' });

    await logAdminAction(
      req.user?.role || 'admin',
      'VERIFICATION_REJECTED',
      `Rejected verification for User ID: ${verification.user}. Reason: ${rejectNote}`,
      'Verification',
      String(verification._id)
    );

    res.json({ success: true, data: verification, message: 'Verification marked as rejected' });
  } catch (error) {
    next(error);
  }
}

// 5. Membership & Subscription Management
export async function getMemberships(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { plan, status } = req.query;
    const query: any = {};
    if (plan && plan !== 'ALL') query.plan = plan;
    if (status && status !== 'ALL') query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('user', 'fullName email mobile')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    next(error);
  }
}

export async function updateMembership(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { plan, status, expiryDate } = req.body;
    const updateData: any = {};
    if (plan) updateData.plan = plan;
    if (status) updateData.status = status;
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).populate('user', 'fullName email mobile');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    await logAdminAction(
      req.user?.role || 'admin',
      'MEMBERSHIP_UPDATED',
      `Updated subscription ID: ${subscription._id} for plan ${subscription.plan}`,
      'Subscription',
      String(subscription._id)
    );

    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

// 6. Payment & Billing Transactions
export async function getPayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, provider } = req.query;
    const query: any = {};
    if (status && status !== 'ALL') query.status = status;
    if (provider) query.provider = provider;

    const payments = await Payment.find(query)
      .populate('user', 'fullName email mobile')
      .populate('subscription', 'plan status startDate expiryDate')
      .sort({ createdAt: -1 });

    const totalCollected = await Payment.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      data: {
        payments,
        totalRevenue: totalCollected[0]?.total || 0,
        count: payments.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

// 7. Activity Monitor: Interests, Shortlists, Messages
export async function getInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status && status !== 'ALL') query.status = status;

    const interests = await Interest.find(query)
      .populate('sender', 'fullName email mobile')
      .populate('receiver', 'fullName email mobile')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: interests });
  } catch (error) {
    next(error);
  }
}

export async function getShortlists(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const shortlists = await Shortlist.find()
      .populate('user', 'fullName email mobile')
      .populate({
        path: 'shortlistedProfile',
        select: 'displayName gender profession city religion primaryPhoto',
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: shortlists });
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversations = await Conversation.find()
      .populate('participants', 'fullName email mobile')
      .sort({ updatedAt: -1 });

    const totalMessages = await Message.countDocuments();
    const recentMessages = await Message.find()
      .populate('sender', 'fullName email')
      .populate('recipient', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: {
        conversations,
        totalConversations: conversations.length,
        totalMessages,
        recentMessages,
      },
    });
  } catch (error) {
    next(error);
  }
}

// 8. Safety & Abuse Moderation Reports
export async function getReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status && status !== 'ALL') query.status = status;

    const reports = await Report.find(query)
      .populate('reporter', 'fullName email mobile')
      .populate('reportedUser', 'fullName email mobile')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
}

export async function resolveReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: 'RESOLVED' },
      { new: true }
    );
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    await logAdminAction(
      req.user?.role || 'admin',
      'REPORT_RESOLVED',
      `Resolved report ID: ${report._id}`,
      'Report',
      String(report._id)
    );

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

export async function dismissReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: 'REJECTED' },
      { new: true }
    );
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    await logAdminAction(
      req.user?.role || 'admin',
      'REPORT_DISMISSED',
      `Dismissed report ID: ${report._id}`,
      'Report',
      String(report._id)
    );

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

// 9. Platform Notifications & Broadcast Announcements
export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await Notification.find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
}

export async function sendNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, message, type = 'SYSTEM', target = 'ALL', userId, link } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    if (target === 'ALL') {
      const users = await User.find({ role: 'user' }).select('_id');
      const docs = users.map((u) => ({
        user: u._id,
        type,
        title,
        message,
        link: link || '/search',
        read: false,
      }));
      await Notification.insertMany(docs);
      await logAdminAction(
        req.user?.role || 'admin',
        'NOTIFICATION_BROADCAST',
        `Broadcasted notification to ${users.length} users: "${title}"`
      );
      res.json({ success: true, message: `Notification broadcasted to ${users.length} users` });
    } else {
      if (!userId) {
        return res.status(400).json({ success: false, message: 'Target userId required' });
      }
      const notif = await Notification.create({
        user: userId,
        type,
        title,
        message,
        link: link || '/search',
        read: false,
      });
      await logAdminAction(
        req.user?.role || 'admin',
        'NOTIFICATION_SENT',
        `Sent individual notification to user ${userId}: "${title}"`
      );
      res.json({ success: true, data: notif });
    }
  } catch (error) {
    next(error);
  }
}

// 10. Admin Accounts & Roles
export async function getAdmins(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });
    const adminDocs = await Admin.find().populate('user', 'fullName email mobile');

    res.json({
      success: true,
      data: {
        admins,
        adminPermissions: adminDocs,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { fullName, email, mobile, password, permissions } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      mobile: mobile || `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: hashedPassword,
      role: 'admin',
      verified: true,
      verificationStatus: 'VERIFIED',
    });

    await Admin.create({
      user: user._id,
      permissions: permissions || ['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports'],
    });

    await logAdminAction(
      req.user?.role || 'admin',
      'ADMIN_CREATED',
      `Created administrator account for ${user.email}`,
      'Admin',
      String(user._id)
    );

    res.json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      message: 'Admin created successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { permissions, fullName, mobile } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    if (fullName || mobile) {
      await User.findByIdAndUpdate(user._id, {
        ...(fullName && { fullName }),
        ...(mobile && { mobile }),
      });
    }

    if (permissions) {
      await Admin.findOneAndUpdate(
        { user: user._id },
        { permissions },
        { upsert: true, new: true }
      );
    }

    await logAdminAction(
      req.user?.role || 'admin',
      'ADMIN_UPDATED',
      `Updated admin settings for ${user.email}`,
      'Admin',
      String(user._id)
    );

    res.json({ success: true, message: 'Admin permissions updated successfully' });
  } catch (error) {
    next(error);
  }
}

// 11. Platform Settings
export async function getSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        siteName: 'Wonderful Jodi',
        supportEmail: 'support@wonderfuljodi.com',
        supportPhone: '+91 98765 43210',
        tollFreeNumber: '+91 1800 200 9090',
      });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const settings = await Setting.findOneAndUpdate({}, { $set: req.body }, { upsert: true, new: true });
    await logAdminAction(
      req.user?.role || 'admin',
      'SETTINGS_UPDATED',
      'Updated platform settings configuration',
      'Setting'
    );
    res.json({ success: true, data: settings, message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
}

// 12. Contact Inquiries
export async function getInquiries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status && status !== 'ALL') query.status = status;

    const inquiries = await ContactInquiry.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: inquiries });
  } catch (error) {
    next(error);
  }
}

export async function updateInquiryStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const inquiry = await ContactInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    res.json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
}

// 13. Audit Trail Logs
export async function getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
}
