import mongoose from '../db/prismaBridge';
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
import { Broadcast } from '../models/Broadcast';
import { Admin } from '../models/Admin';
import { Setting } from '../models/Setting';
import { MembershipPlan } from '../models/MembershipPlan';
import { ContactInquiry } from '../models/ContactInquiry';
import { AuditLog } from '../models/AuditLog';
import { RefreshToken } from '../models/RefreshToken';
import { SecurityLog } from '../models/SecurityLog';
import { escapeRegex, isValidObjectId } from '../utils/securityUtils';
import { invalidateMaintenanceCache } from '../middleware/maintenanceMiddleware';
import {
  getRecipientCount as countRecipients,
  createAndDispatchBroadcast,
  sanitizeActionUrl,
} from '../services/notificationBroadcastService';
import { DailyUserVisit } from '../models/DailyUserVisit';
import { Registration } from '../models/Registration';
import { validateDateOfBirth, validateMedicalQualification } from '../utils/doctorValidation';
import { getFormattedVisitDate } from '../services/visitTrackingService';
import { detectCompliance } from '../services/complianceDetector';
import { findCanonicalProfile } from './profileController';
import { prisma, generateObjectId } from '../db/client';
import {
  withAdminLifecycleGuard,
  AdminLifecycleLockError,
} from '../utils/adminLifecycleGuard';

// Helper for audit logging
async function logAdminAction(
  adminEmail: string,
  action: string,
  details?: string,
  targetModel?: string,
  targetId?: string,
  extraParams?: {
    adminId?: any;
    adminName?: string;
    targetProfileId?: any;
    targetUserId?: any;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
    relatedReportId?: any;
    metadata?: Record<string, any>;
  }
) {
  try {
    await AuditLog.create({
      adminEmail: adminEmail || 'admin@wonderfuljodi.com',
      adminId: extraParams?.adminId,
      adminName: extraParams?.adminName,
      action,
      details,
      targetModel,
      targetId,
      targetProfileId: extraParams?.targetProfileId,
      targetUserId: extraParams?.targetUserId,
      previousStatus: extraParams?.previousStatus,
      newStatus: extraParams?.newStatus,
      reason: extraParams?.reason,
      relatedReportId: extraParams?.relatedReportId,
      metadata: extraParams?.metadata,
      status: 'SUCCESS',
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}

// Data masking helpers for least-privilege administrative access
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '••••••••';
  const parts = email.split('@');
  if (parts.length !== 2) return '••••••••';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}${'•'.repeat(Math.min(name.length - 2, 5))}${name[name.length - 1]}@${domain}`;
}

export function maskMobile(mobile: string): string {
  if (!mobile || typeof mobile !== 'string') return '••••••••••';
  const clean = mobile.trim();
  if (clean.length <= 5) return '••••••';
  const prefix = clean.slice(0, 3);
  const suffix = clean.slice(-2);
  return `${prefix}•••••${suffix}`;
}

/**
 * Redacts private address components when caller lacks privateInfo.view permission.
 * Redacts formattedAddress and completely removes/omits addressLine1, addressLine2, landmark, pincode.
 * Preserves approved location metadata (country, state, city, village, IDs) without mutating shared DB objects.
 */
export function redactPrivateAddress(locationObj: any) {
  if (!locationObj) return locationObj;
  if (typeof locationObj === 'string') {
    return '[Private Address - View Permission Required]';
  }
  if (typeof locationObj !== 'object') return locationObj;
  const redacted = { ...locationObj };
  const hasPrivateData = Boolean(
    redacted.formattedAddress ||
    redacted.addressLine1 ||
    redacted.addressLine2 ||
    redacted.landmark ||
    redacted.pincode
  );

  if (hasPrivateData) {
    redacted.formattedAddress = '[Private Address - View Permission Required]';
  }
  delete redacted.addressLine1;
  delete redacted.addressLine2;
  delete redacted.landmark;
  delete redacted.pincode;
  return redacted;
}


// 1. Dashboard KPIs & Aggregations
export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedProfiles,
      pendingVerification,
      premiumUsers,
      revenueAgg,
      pendingReports,
      newInquiries,
      totalInterests,
      pendingInterests,
      acceptedInterests,
      rejectedInterests,
      activeConversations,
      totalShortlists,
      totalMessages,
      newRegistrations7d,
      recentUsers,
      recentPayments,
      recentVerifications,
      todayVisitedUsers,
      incompleteRegistrations,
      completedRegistrations,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      User.countDocuments({ role: 'user', isActive: false }),
      Profile.countDocuments({ verificationStatus: 'VERIFIED' }),
      Verification.countDocuments({ status: 'PENDING' }),
      Subscription.countDocuments({ status: 'ACTIVE', plan: { $ne: 'FREE' } }),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            gross: {
              $sum: {
                $cond: [{ $in: ['$status', ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED']] }, '$amount', 0],
              },
            },
            refunds: { $sum: '$refundAmount' },
          },
        },
      ]),
      Report.countDocuments({ status: 'PENDING' }),
      ContactInquiry.countDocuments({ status: 'NEW' }),
      Interest.countDocuments(),
      Interest.countDocuments({ status: 'PENDING' }),
      Interest.countDocuments({ status: 'ACCEPTED' }),
      Interest.countDocuments({ status: { $in: ['REJECTED', 'DECLINED'] } }),
      Conversation.countDocuments({ status: 'ACTIVE' }),
      Shortlist.countDocuments(),
      Message.countDocuments(),
      User.countDocuments({
        role: 'user',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(10).select('-password'),
      Payment.find().sort({ createdAt: -1 }).limit(6).populate('user', 'fullName email mobile'),
      Verification.find().sort({ createdAt: -1 }).limit(6).populate('user', 'fullName email mobile'),
      DailyUserVisit.countDocuments({ visitDate: getFormattedVisitDate() }),
      Registration.countDocuments({ status: { $in: ['STARTED', 'IN_PROGRESS'] }, isDeleted: false }),
      Registration.countDocuments({ status: 'COMPLETED', isDeleted: false }),
    ]);

    const totalRevenue = Math.max(0, (revenueAgg[0]?.gross || 0) - (revenueAgg[0]?.refunds || 0));
    const { getCachedMaintenanceConfig } = await import('../middleware/maintenanceMiddleware');
    const maintenanceConfig = await getCachedMaintenanceConfig();

    const formattedRecentUsers = recentUsers.map((u: any) => ({
      _id: u._id,
      userId: u._id,
      name: u.fullName,
      fullName: u.fullName,
      email: u.email,
      mobile: u.mobile,
      role: u.role,
      verified: u.verified,
      verificationStatus: u.verificationStatus,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        verifiedProfiles,
        pendingVerification,
        premiumUsers,
        totalRevenue,
        pendingReports,
        newInquiries,
        totalInterests,
        pendingInterests,
        acceptedInterests,
        rejectedInterests,
        activeConversations,
        totalShortlists,
        totalMessages,
        newRegistrations7d,
        todayVisitedUsers,
        incompleteRegistrations,
        completedRegistrations,
        recentUsers: formattedRecentUsers,
        recentPayments,
        recentVerifications,
        maintenanceMode: maintenanceConfig.enabled,
      },
    });
  } catch (error) {
    next(error);
  }
}

// 1b. Daily Visited Users Analytics (GET /api/admin/analytics/daily-visits)
export async function getDailyVisitsAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rawDays = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const allowedDays = [7, 14, 30, 90];
    const days = allowedDays.includes(rawDays) ? rawDays : (rawDays > 0 && rawDays <= 365 ? rawDays : 7);

    const now = new Date();
    const todayDate = getFormattedVisitDate(now);

    // Build complete consecutive date range
    const dateList: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dateList.push(getFormattedVisitDate(d));
    }
    const startDate = dateList[0];

    // Database aggregation grouping by visitDate
    const visitAgg = await DailyUserVisit.aggregate([
      {
        $match: {
          visitDate: { $gte: startDate, $lte: todayDate },
        },
      },
      {
        $group: {
          _id: '$visitDate',
          uniqueVisitors: { $addToSet: '$user' },
          totalHits: { $sum: '$visitCount' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          uniqueVisitors: { $size: '$uniqueVisitors' },
          totalHits: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    const aggMap = new Map<string, { uniqueVisitors: number; totalHits: number }>();
    for (const item of visitAgg) {
      aggMap.set(item.date, {
        uniqueVisitors: item.uniqueVisitors || 0,
        totalHits: item.totalHits || 0,
      });
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const timelineData = dateList.map((dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const dayName = dayNames[dateObj.getUTCDay()];
      const monthName = monthNames[m - 1];
      const displayLabel = `${dayName} ${d}`;
      const fullLabel = `${d} ${monthName} ${y}`;
      const record = aggMap.get(dateStr) || { uniqueVisitors: 0, totalHits: 0 };

      return {
        date: dateStr,
        dayName,
        displayLabel,
        fullLabel,
        uniqueVisitors: record.uniqueVisitors,
        totalHits: record.totalHits,
        isToday: dateStr === todayDate,
      };
    });

    // Unique distinct users across the whole selected period
    const distinctUniqueUsers = (
      await DailyUserVisit.distinct('user', {
        visitDate: { $gte: startDate, $lte: todayDate },
      })
    ).length;

    const todayRecord = aggMap.get(todayDate);
    const todayCount = todayRecord ? todayRecord.uniqueVisitors : 0;

    const yesterdayObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDate = getFormattedVisitDate(yesterdayObj);
    const yesterdayRecord = aggMap.get(yesterdayDate);
    const yesterdayCount = yesterdayRecord ? yesterdayRecord.uniqueVisitors : 0;

    let percentChangeVsYesterday = 0;
    let comparisonStatus: 'INCREASE' | 'DECREASE' | 'UNCHANGED' | 'FIRST_VISITS' | 'NO_DATA' = 'NO_DATA';
    let comparisonText = 'No previous-day comparison';

    if (yesterdayCount > 0) {
      percentChangeVsYesterday = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
      if (percentChangeVsYesterday > 0) {
        comparisonStatus = 'INCREASE';
        comparisonText = `+${percentChangeVsYesterday}% vs yesterday`;
      } else if (percentChangeVsYesterday < 0) {
        comparisonStatus = 'DECREASE';
        comparisonText = `${percentChangeVsYesterday}% vs yesterday`;
      } else {
        comparisonStatus = 'UNCHANGED';
        comparisonText = '0% vs yesterday';
      }
    } else if (todayCount > 0) {
      percentChangeVsYesterday = 100;
      comparisonStatus = 'FIRST_VISITS';
      comparisonText = 'First visits vs yesterday';
    } else {
      percentChangeVsYesterday = 0;
      comparisonStatus = 'UNCHANGED';
      comparisonText = 'No change vs yesterday';
    }

    const dailyVisitsSum = timelineData.reduce((acc, curr) => acc + curr.uniqueVisitors, 0);
    const dailyAverage = Number((dailyVisitsSum / days).toFixed(1));

    res.json({
      success: true,
      data: {
        period: days,
        startDate,
        endDate: todayDate,
        today: todayCount,
        yesterday: yesterdayCount,
        percentChangeVsYesterday,
        comparisonStatus,
        comparisonText,
        dailyVisitsSum,
        totalDailyVisitsSum: dailyVisitsSum,
        distinctUniqueUsers,
        uniqueUsersAcrossPeriod: distinctUniqueUsers,
        dailyAverage,
        averageDailyVisitors: dailyAverage,
        data: timelineData,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardVerifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const verifications = await Verification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'fullName email mobile');
    res.json({ success: true, data: verifications });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardTransactions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const transactions = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'fullName email mobile');
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardRecentUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const users = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-password');
    const formattedUsers = users.map((u: any) => ({
      _id: u._id,
      userId: u._id,
      name: u.fullName,
      fullName: u.fullName,
      email: u.email,
      mobile: u.mobile,
      role: u.role,
      isActive: u.isActive,
      accountStatus: u.isActive ? 'active' : 'suspended',
      verificationStatus: u.verificationStatus || (u.verified ? 'VERIFIED' : 'UNVERIFIED'),
      verified: u.verified || u.verificationStatus === 'VERIFIED',
      createdAt: u.createdAt,
      registeredAt: u.createdAt,
    }));
    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardInquiries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const inquiries = await ContactInquiry.find()
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, data: inquiries });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('reporter', 'fullName email')
      .populate('reportedUser', 'fullName email');
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardRevenue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const revenueAgg = await Payment.aggregate([
      {
        $group: {
          _id: null,
          gross: {
            $sum: {
              $cond: [{ $in: ['$status', ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED']] }, '$amount', 0],
            },
          },
          refunds: { $sum: '$refundAmount' },
        },
      },
    ]);
    const totalRevenue = Math.max(0, (revenueAgg[0]?.gross || 0) - (revenueAgg[0]?.refunds || 0));
    res.json({ success: true, totalRevenue });
  } catch (error) {
    next(error);
  }
}

// 2. User Management
export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { search, role, status, gender, registrationStatus, page = 1, limit = 25 } = req.query;
    const query: any = {};

    if (role && role !== 'all') {
      query.role = role;
    }
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Gender filter support (Profile holds authoritative gender)
    let genderUserIds: string[] | null = null;
    let genderUserIdsNin: string[] | null = null;
    if (gender && gender !== 'all') {
      if (gender === 'not_recorded' || gender === 'Not recorded') {
        const profilesWithGender = await Profile.find({ gender: { $exists: true, $ne: null } }).select('user gender').lean();
        const recordedSet = new Set(
          profilesWithGender
            .filter((p: any) => p.gender && String(p.gender).trim() !== '' && String(p.gender).toLowerCase() !== 'not recorded')
            .map((p: any) => String(p.user))
            .filter(Boolean)
        );
        genderUserIdsNin = Array.from(recordedSet);
      } else {
        const safeGenderRegex = new RegExp(`^${escapeRegex(String(gender))}$`, 'i');
        const profilesWithGender = await Profile.find({ gender: safeGenderRegex }).select('user').lean();
        const genderSet = new Set(
          profilesWithGender.map((p: any) => String(p.user)).filter(Boolean)
        );
        genderUserIds = Array.from(genderSet);
      }
    }

    // Registration status filter support
    let regStatusUserIdsIn: string[] | null = null;
    let regStatusUserIdsNin: string[] | null = null;
    if (registrationStatus && registrationStatus !== 'all') {
      const [completedProfiles, completedRegs] = await Promise.all([
        Profile.distinct('user'),
        Registration.distinct('user', { status: 'COMPLETED', isDeleted: false }),
      ]);
      const completedUserSet = new Set([
        ...completedProfiles.map((id: any) => String(id)),
        ...completedRegs.filter(Boolean).map((id: any) => String(id)),
      ]);

      if (registrationStatus === 'complete') {
        regStatusUserIdsIn = Array.from(completedUserSet);
      } else if (registrationStatus === 'incomplete') {
        const activeDrafts = await Registration.distinct('user', {
          status: { $in: ['STARTED', 'IN_PROGRESS', 'ABANDONED'] },
          isDeleted: false,
        });
        regStatusUserIdsIn = activeDrafts.filter((id) => !completedUserSet.has(String(id))).map(String);
      } else if (registrationStatus === 'pending') {
        const allRegisteredOrDrafted = await Promise.all([
          Profile.distinct('user'),
          Registration.distinct('user', { isDeleted: false }),
        ]);
        const anyActivitySet = new Set([
          ...allRegisteredOrDrafted[0].map(String),
          ...allRegisteredOrDrafted[1].filter(Boolean).map(String),
        ]);
        regStatusUserIdsNin = Array.from(anyActivitySet);
      }
    }

    // Combine ID-based filters
    const idFilters: any[] = [];
    if (genderUserIds !== null) {
      idFilters.push({ _id: { $in: genderUserIds } });
    }
    if (genderUserIdsNin !== null) {
      idFilters.push({ _id: { $nin: genderUserIdsNin } });
    }
    if (regStatusUserIdsIn !== null) {
      idFilters.push({ _id: { $in: regStatusUserIdsIn } });
    }
    if (regStatusUserIdsNin !== null) {
      idFilters.push({ _id: { $nin: regStatusUserIdsNin } });
    }

    if (search) {
      const searchStr = String(search).trim();
      const safeSearch = escapeRegex(searchStr);
      const orConditions: any[] = [
        { fullName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { mobile: { $regex: safeSearch, $options: 'i' } },
      ];
      if (isValidObjectId(searchStr)) {
        orConditions.push({ _id: searchStr });
      }
      query.$or = orConditions;
    }

    if (idFilters.length > 0) {
      if (query.$and) {
        query.$and.push(...idFilters);
      } else {
        query.$and = idFilters;
      }
    }

    const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
    const pageNumber = Math.max(1, Number(page) || 1);
    const skip = (pageNumber - 1) * pageSize;

    const [total, rawUsers] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    const userIds = rawUsers.map((u: any) => u._id);

    // Batch fetch associated profiles, active memberships, and registrations
    const [profiles, subscriptions, registrations] = await Promise.all([
      Profile.find({ user: { $in: userIds } })
        .select('_id user candidateId displayName gender primaryPhoto photos verificationStatus lastActiveAt')
        .lean(),
      Subscription.find({ user: { $in: userIds }, status: 'ACTIVE' })
        .select('user plan')
        .lean(),
      Registration.find({ user: { $in: userIds }, isDeleted: false })
        .select('user registrationId status currentStep completionPercentage')
        .lean(),
    ]);

    const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));
    const subscriptionMap = new Map(subscriptions.map((s: any) => [String(s.user), s]));
    const registrationMap = new Map(registrations.map((r: any) => [String(r.user), r]));

    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');
    const canViewPrivate = isSuperAdmin || callerPerms.includes('privateInfo.view');

    const users = rawUsers.map((u: any) => {
      const p = profileMap.get(String(u._id));
      const s = subscriptionMap.get(String(u._id));
      const r = registrationMap.get(String(u._id));

      // Determine real registration status
      let regStatus: 'Complete' | 'Incomplete' | 'Pending' = 'Pending';
      if (p || r?.status === 'COMPLETED') {
        regStatus = 'Complete';
      } else if (r?.status === 'STARTED' || r?.status === 'IN_PROGRESS' || r?.status === 'ABANDONED') {
        regStatus = 'Incomplete';
      } else {
        regStatus = 'Pending';
      }

      const userObj = {
        ...u,
        gender: p?.gender || u.gender || null,
        registrationStatus: regStatus,
        registrationId: r?.registrationId || null,
        candidateId: p?.candidateId || null,
        profileId: p?._id ? String(p._id) : undefined,
        profilePhoto: p?.primaryPhoto || p?.photos?.[0] || '',
        displayName: p?.displayName || u.fullName,
        lastActiveAt: p?.lastActiveAt || u.updatedAt || u.createdAt,
        membershipPlan: s?.plan || 'FREE',
      };

      if (!canViewPrivate) {
        userObj.email = u.email ? maskEmail(u.email) : undefined;
        userObj.mobile = u.mobile ? maskMobile(u.mobile) : undefined;
      }
      return userObj;
    });

    res.json({
      success: true,
      data: {
        users,
        total,
        page: pageNumber,
        pages: Math.ceil(total / pageSize) || 1,
        limit: pageSize,
        canViewPrivateContact: canViewPrivate,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const profile = await Profile.findOne({ user: user._id });
    const subscription = await Subscription.findOne({ user: user._id }).sort({ createdAt: -1 });
    const verifications = await Verification.find({ user: user._id }).sort({ createdAt: -1 });
    const payments = await Payment.find({ user: user._id }).sort({ createdAt: -1 });

    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');
    const canViewPrivate = isSuperAdmin || callerPerms.includes('privateInfo.view');
    const canEditPrivate = isSuperAdmin || callerPerms.includes('privateInfo.edit');

    const userObj = user ? (typeof user.toObject === 'function' ? user.toObject() : { ...user }) : null;
    const profileObj = profile ? (typeof profile.toObject === 'function' ? profile.toObject() : { ...profile }) : null;

    if (!canViewPrivate) {
      if (userObj) {
        userObj.email = userObj.email ? maskEmail(userObj.email) : undefined;
        userObj.mobile = userObj.mobile ? maskMobile(userObj.mobile) : undefined;
      }
      if (profileObj?.currentLocation) {
        profileObj.currentLocation = redactPrivateAddress(profileObj.currentLocation);
      }
      if (profileObj?.nativePlaceDetails) {
        profileObj.nativePlaceDetails = redactPrivateAddress(profileObj.nativePlaceDetails);
      }
    }

    res.json({
      success: true,
      data: {
        user: userObj,
        profile: profileObj,
        subscription,
        verifications,
        payments,
        canViewPrivateContact: canViewPrivate,
        canEditPrivateContact: canEditPrivate,
        isPrivateContactMasked: !canViewPrivate,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const { isActive, status, reason } = req.body;
    const activeValue = typeof isActive === 'boolean' ? isActive : status === 'active';

    const callerId = String(req.user?.userId || req.user?._id || req.user?.id || '');

    const existingUser = await User.findById(id).select('-password');
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Safeguards when deactivating an account
    if (!activeValue && existingUser.isActive) {
      // 1. Cannot deactivate currently logged-in administrator
      if (String(existingUser._id) === callerId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate currently logged-in administrator',
        });
      }

      // 2. Protect Super Admin accounts from deactivation
      const adminRecord = await Admin.findOne({ user: existingUser._id });
      if (adminRecord?.permissions?.includes('all')) {
        return res.status(400).json({
          success: false,
          message: 'Super Admin accounts are protected and cannot be deactivated',
        });
      }

      // 3. Protect last active administrator under concurrency guard
      if (existingUser.role === 'admin') {
        try {
          await withAdminLifecycleGuard(async (tx?: any) => {
            let freshActiveAdminCount: number;
            if (tx && typeof tx.user?.count === 'function') {
              freshActiveAdminCount = await tx.user.count({
                where: {
                  role: 'admin',
                  isActive: true,
                  isDeleted: false,
                },
              });
            } else {
              freshActiveAdminCount = await User.countDocuments({
                role: 'admin',
                isActive: true,
                isDeleted: { $ne: true },
              });
            }

            if (freshActiveAdminCount <= 1) {
              throw new Error('LAST_ACTIVE_ADMIN');
            }

            if (tx && typeof tx.user?.update === 'function') {
              await tx.user.update({
                where: { id: String(existingUser._id) },
                data: {
                  isActive: false,
                  status: 'Suspended',
                },
              });
              if (tx.refreshToken?.updateMany) {
                await tx.refreshToken.updateMany({
                  where: { userId: String(existingUser._id) },
                  data: { isRevoked: true, isUsed: true },
                });
              }
              existingUser.isActive = false;
              existingUser.status = 'Suspended';
            } else {
              existingUser.isActive = false;
              existingUser.status = 'Suspended';
              existingUser.suspensionReason = reason ? String(reason).slice(0, 200) : 'Administrative deactivation';
              existingUser.suspendedAt = new Date();
              existingUser.suspendedBy = callerId;
              await existingUser.save();

              await RefreshToken.updateMany(
                { user: existingUser._id },
                { $set: { isRevoked: true, isUsed: true } }
              );
            }
          });
        } catch (guardErr: any) {
          if (guardErr?.message === 'LAST_ACTIVE_ADMIN') {
            return res.status(400).json({
              success: false,
              message: 'Cannot deactivate the last active administrator account',
            });
          }
          if (guardErr instanceof AdminLifecycleLockError || guardErr?.code === 'LOCK_TIMEOUT') {
            return res.status(409).json({
              success: false,
              message: 'Administrator status update locked due to concurrent modifications. Please retry.',
            });
          }
          throw guardErr;
        }

        const adminEmail = (req as any).user?.email || 'admin@wonderfuljodi.com';
        const reasonText = reason ? ' (Reason: ' + String(reason).slice(0, 200) + ')' : '';
        await logAdminAction(
          adminEmail,
          'ACCOUNT_DEACTIVATED',
          'Updated user ' + existingUser.email + ' status to INACTIVE' + reasonText,
          'User',
          String(existingUser._id)
        );

        await SecurityLog.create({
          user: existingUser._id,
          identifier: existingUser.email,
          eventType: 'ADMIN_ACTION',
          status: 'SUCCESS',
          details: {
            action: 'ACCOUNT_DEACTIVATED',
            adminId: callerId,
            reason: reason || undefined,
          },
        });

        return res.json({
          success: true,
          data: existingUser,
          message: 'Account deactivated successfully',
        });
      }
    }

    // Standard activation or non-admin deactivation path
    const updatePayload: any = { isActive: activeValue };
    if (!activeValue) {
      updatePayload.status = 'Suspended';
      updatePayload.suspensionReason = reason ? String(reason).slice(0, 200) : 'Administrative deactivation';
      updatePayload.suspendedAt = new Date();
      updatePayload.suspendedBy = callerId;
    } else {
      updatePayload.status = 'Active';
    }

    let user: any;
    if (prisma && typeof prisma.$transaction === 'function') {
      user = await prisma.$transaction(async (userTx: any) => {
        if (userTx.user?.update) {
          await userTx.user.update({
            where: { id },
            data: {
              isActive: activeValue,
              status: activeValue ? 'Active' : 'Suspended',
            },
          });
          if (!activeValue && userTx.refreshToken?.updateMany) {
            await userTx.refreshToken.updateMany({
              where: { userId: id },
              data: { isRevoked: true, isUsed: true },
            });
          }
          return await User.findById(id).select('-password');
        } else {
          const u = await User.findByIdAndUpdate(id, updatePayload, { new: true }).select('-password');
          if (u && !activeValue) {
            await RefreshToken.updateMany({ user: u._id }, { isRevoked: true, isUsed: true });
          }
          return u;
        }
      });
    } else {
      user = await User.findByIdAndUpdate(id, updatePayload, { new: true }).select('-password');
      if (user && !activeValue) {
        await RefreshToken.updateMany({ user: user._id }, { isRevoked: true, isUsed: true });
      }
    }

    const adminEmail = (req as any).user?.email || 'admin@wonderfuljodi.com';
    const reasonText = reason ? ' (Reason: ' + String(reason).slice(0, 200) + ')' : '';

    await logAdminAction(
      adminEmail,
      activeValue ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED',
      'Updated user ' + user.email + ' status to ' + (activeValue ? 'ACTIVE' : 'INACTIVE') + reasonText,
      'User',
      String(user._id)
    );

    await SecurityLog.create({
      user: user._id,
      identifier: user.email,
      eventType: 'ADMIN_ACTION',
      status: 'SUCCESS',
      details: {
        action: activeValue ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED',
        adminId: req.user?.userId,
        reason: reason || undefined,
      },
    });

    res.json({
      success: true,
      data: user,
      message: 'Account ' + (activeValue ? 'reactivated' : 'deactivated') + ' successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk User Account Activation / Deactivation
 * Enforces Super Admin, self-deactivation, and last active admin protection
 */
export async function bulkUpdateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userIds, status, isActive, reason } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty array of userIds is required for bulk status management.',
      });
    }

    if (userIds.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Bulk status update batch size cannot exceed 500 accounts per operation.',
      });
    }

    // Require an explicit, valid target state
    if (isActive === undefined && status === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Target state is required. Provide either "isActive" (boolean) or "status" ("active" | "deactivated").',
      });
    }

    let activeFromFlag: boolean | undefined = undefined;
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Invalid isActive value. Must be a boolean (true or false).',
        });
      }
      activeFromFlag = isActive;
    }

    let activeFromStatus: boolean | undefined = undefined;
    let canonicalStatusName: string | undefined = undefined;
    if (status !== undefined) {
      if (typeof status !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value. Must be a string ("active" or "deactivated").',
        });
      }

      const normalizedStatus = status.trim().toLowerCase();
      if (normalizedStatus === 'active') {
        activeFromStatus = true;
        canonicalStatusName = 'Active';
      } else if (
        normalizedStatus === 'deactivated' ||
        normalizedStatus === 'inactive' ||
        normalizedStatus === 'suspended'
      ) {
        activeFromStatus = false;
        canonicalStatusName = 'Suspended';
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid status "${status}". Supported values are "active" and "deactivated" (or "suspended" / "inactive").`,
        });
      }
    }

    // Reject ambiguous or contradictory combinations of isActive and status
    if (activeFromFlag !== undefined && activeFromStatus !== undefined) {
      if (activeFromFlag !== activeFromStatus) {
        return res.status(400).json({
          success: false,
          message: `Contradictory state: isActive is ${activeFromFlag} but status is "${status}".`,
        });
      }
    }

    const targetActive: boolean = activeFromFlag !== undefined ? activeFromFlag : (activeFromStatus as boolean);
    const targetStatus: string = canonicalStatusName || (targetActive ? 'Active' : 'Suspended');

    const callerId = String(req.user?.userId || req.user?._id || req.user?.id || '');
    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';

    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrator privileges are required to perform bulk status operations.',
      });
    }

    const successful: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    const uniqueIds = Array.from(new Set(userIds.map((id) => String(id).trim())));
    const validIds: string[] = [];

    for (const id of uniqueIds) {
      if (!isValidObjectId(id)) {
        failed.push({ id, reason: 'Invalid user ID format' });
      } else {
        validIds.push(id);
      }
    }

    const targetUsers = await User.find({ _id: { $in: validIds } }).lean();
    const targetUserMap = new Map(targetUsers.map((u: any) => [String(u._id), u]));

    // Fetch Super Admin user IDs to protect them
    const adminRecords = await Admin.find({}).lean();
    const superAdminUserIds = new Set(
      adminRecords
        .filter((a: any) => a.permissions?.includes('all'))
        .map((a: any) => String(a.user))
    );

    const eligibleIdsToUpdate: string[] = [];

    for (const id of validIds) {
      const userDoc = targetUserMap.get(id);

      if (!userDoc) {
        failed.push({ id, reason: 'User not found in system' });
        continue;
      }

      // Safeguard 1: Do not deactivate currently logged-in administrator
      if (!targetActive && id === callerId) {
        failed.push({
          id,
          reason: 'Cannot deactivate currently logged-in administrator',
        });
        continue;
      }

      // Safeguard 2: Protect Super Admin accounts from deactivation
      if (!targetActive && superAdminUserIds.has(id)) {
        failed.push({
          id,
          reason: 'Super Admin accounts are protected and cannot be deactivated',
        });
        continue;
      }

      // If account already has target status, mark as success without needing DB write
      if (userDoc.isActive === targetActive) {
        successful.push(id);
        continue;
      }

      eligibleIdsToUpdate.push(id);
      successful.push(id);
    }

    // Apply updates to eligible accounts
    if (eligibleIdsToUpdate.length > 0) {
      const updateData: any = {
        isActive: targetActive,
        status: targetActive ? 'Active' : 'Suspended',
      };
      if (!targetActive) {
        updateData.suspensionReason = reason ? String(reason).slice(0, 200) : 'Administrative bulk deactivation';
        updateData.suspendedAt = new Date();
        updateData.suspendedBy = callerId;
      }

      // Concurrency protection: if deactivating any active administrators, serialize via withAdminLifecycleGuard
      const adminIdsInUpdate = !targetActive
        ? eligibleIdsToUpdate.filter(
            (id) => targetUserMap.get(id)?.role === 'admin' && targetUserMap.get(id)?.isActive
          )
        : [];

      if (adminIdsInUpdate.length > 0) {
        try {
          await withAdminLifecycleGuard(async (tx?: any) => {
            // Fresh active administrator query inside the serialized lock
            let freshActiveAdminCount: number;
            if (tx && typeof tx.user?.count === 'function') {
              freshActiveAdminCount = await tx.user.count({
                where: {
                  role: 'admin',
                  isActive: true,
                  isDeleted: false,
                },
              });
            } else {
              freshActiveAdminCount = await User.countDocuments({
                role: 'admin',
                isActive: true,
                isDeleted: { $ne: true },
              });
            }

            let availableBudget = freshActiveAdminCount;

            for (const adminId of adminIdsInUpdate) {
              if (availableBudget <= 1) {
                // Reject deactivation: would leave system without an active administrator account
                const uIdx = eligibleIdsToUpdate.indexOf(adminId);
                if (uIdx > -1) eligibleIdsToUpdate.splice(uIdx, 1);
                const sIdx = successful.indexOf(adminId);
                if (sIdx > -1) successful.splice(sIdx, 1);
                failed.push({
                  id: adminId,
                  reason: 'Cannot deactivate administrator: would leave system without an active administrator account',
                });
              } else {
                availableBudget--;
              }
            }

            if (eligibleIdsToUpdate.length > 0) {
              if (tx && typeof tx.user?.updateMany === 'function') {
                await tx.user.updateMany({
                  where: { id: { in: eligibleIdsToUpdate } },
                  data: {
                    isActive: targetActive,
                    status: targetStatus,
                  },
                });
                if (!targetActive && tx.refreshToken?.updateMany) {
                  await tx.refreshToken.updateMany({
                    where: { userId: { in: eligibleIdsToUpdate } },
                    data: { isRevoked: true, isUsed: true },
                  });
                }
              } else {
                await User.updateMany({ _id: { $in: eligibleIdsToUpdate } }, { $set: updateData });
                if (!targetActive) {
                  await RefreshToken.updateMany(
                    { user: { $in: eligibleIdsToUpdate } },
                    { $set: { isRevoked: true, isUsed: true } }
                  );
                }
              }
            }
          });
        } catch (guardErr: any) {
          // Concurrency lock failure / timeout: FAIL CLOSED for all administrator accounts
          for (const adminId of adminIdsInUpdate) {
            const uIdx = eligibleIdsToUpdate.indexOf(adminId);
            if (uIdx > -1) eligibleIdsToUpdate.splice(uIdx, 1);
            const sIdx = successful.indexOf(adminId);
            if (sIdx > -1) successful.splice(sIdx, 1);
            failed.push({
              id: adminId,
              reason: 'Cannot deactivate administrator: concurrency lock acquisition failed (fail-closed)',
            });
          }

          // Process remaining regular users in the mixed batch, ensuring atomic update & session revocation
          if (eligibleIdsToUpdate.length > 0) {
            try {
              if (prisma && typeof prisma.$transaction === 'function') {
                await prisma.$transaction(async (userTx: any) => {
                  if (userTx.user?.updateMany) {
                    await userTx.user.updateMany({
                      where: { id: { in: eligibleIdsToUpdate } },
                      data: {
                        isActive: targetActive,
                        status: targetStatus,
                      },
                    });
                    if (!targetActive && userTx.refreshToken?.updateMany) {
                      await userTx.refreshToken.updateMany({
                        where: { userId: { in: eligibleIdsToUpdate } },
                        data: { isRevoked: true, isUsed: true },
                      });
                    }
                  } else {
                    await User.updateMany({ _id: { $in: eligibleIdsToUpdate } }, { $set: updateData });
                    if (!targetActive) {
                      await RefreshToken.updateMany(
                        { user: { $in: eligibleIdsToUpdate } },
                        { $set: { isRevoked: true, isUsed: true } }
                      );
                    }
                  }
                });
              } else {
                await User.updateMany({ _id: { $in: eligibleIdsToUpdate } }, { $set: updateData });
                if (!targetActive) {
                  await RefreshToken.updateMany(
                    { user: { $in: eligibleIdsToUpdate } },
                    { $set: { isRevoked: true, isUsed: true } }
                  );
                }
              }
            } catch (regUserErr: any) {
              // If regular-user mutation or session revocation fails, do NOT report success!
              for (const regId of eligibleIdsToUpdate) {
                const sIdx = successful.indexOf(regId);
                if (sIdx > -1) successful.splice(sIdx, 1);
                failed.push({
                  id: regId,
                  reason: 'Failed to update account status due to database error',
                });
              }
              eligibleIdsToUpdate.length = 0;
            }
          }
        }
      } else {
        // Regular user activation or deactivation - direct execution without admin lock contention
        try {
          if (prisma && typeof prisma.$transaction === 'function') {
            await prisma.$transaction(async (userTx: any) => {
              if (userTx.user?.updateMany) {
                await userTx.user.updateMany({
                  where: { id: { in: eligibleIdsToUpdate } },
                  data: {
                    isActive: targetActive,
                    status: targetStatus,
                  },
                });
                if (!targetActive && userTx.refreshToken?.updateMany) {
                  await userTx.refreshToken.updateMany({
                    where: { userId: { in: eligibleIdsToUpdate } },
                    data: { isRevoked: true, isUsed: true },
                  });
                }
              } else {
                await User.updateMany({ _id: { $in: eligibleIdsToUpdate } }, { $set: updateData });
                if (!targetActive) {
                  await RefreshToken.updateMany(
                    { user: { $in: eligibleIdsToUpdate } },
                    { $set: { isRevoked: true, isUsed: true } }
                  );
                }
              }
            });
          } else {
            await User.updateMany({ _id: { $in: eligibleIdsToUpdate } }, { $set: updateData });
            if (!targetActive) {
              await RefreshToken.updateMany(
                { user: { $in: eligibleIdsToUpdate } },
                { $set: { isRevoked: true, isUsed: true } }
              );
            }
          }
        } catch (regUserErr: any) {
          for (const regId of eligibleIdsToUpdate) {
            const sIdx = successful.indexOf(regId);
            if (sIdx > -1) successful.splice(sIdx, 1);
            failed.push({
              id: regId,
              reason: 'Failed to update account status due to database error',
            });
          }
          eligibleIdsToUpdate.length = 0;
        }
      }

      if (eligibleIdsToUpdate.length > 0) {
        const actionType = targetActive ? 'BULK_ACCOUNT_REACTIVATED' : 'BULK_ACCOUNT_DEACTIVATED';
        const reasonText = reason ? ' (Reason: ' + String(reason).slice(0, 200) + ')' : '';
        await logAdminAction(
          adminEmail,
          actionType,
          'Bulk ' + (targetActive ? 'reactivated' : 'deactivated') + ' ' + eligibleIdsToUpdate.length + ' user account(s)' + reasonText,
          'User',
          callerId,
          {
            metadata: {
              affectedCount: eligibleIdsToUpdate.length,
              action: targetActive ? 'activate' : 'deactivate',
            },
          }
        );

        await SecurityLog.create({
          user: callerId,
          identifier: adminEmail,
          eventType: 'ADMIN_ACTION',
          status: 'SUCCESS',
          details: {
            action: actionType,
            affectedUserIds: eligibleIdsToUpdate,
            reason: reason || undefined,
          },
        });
      }
    }

    return res.json({
      success: true,
      message: 'Bulk status update completed: ' + successful.length + ' processed, ' + failed.length + ' failed.',
      data: {
        action: targetActive ? 'active' : 'deactivated',
        totalRequested: uniqueIds.length,
        successCount: successful.length,
        failedCount: failed.length,
        successful,
        failed,
      },
    });
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

    const callerId = String(req.user?.userId || req.user?._id || req.user?.id || '');
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Demoting an admin to regular user
    if (targetUser.role === 'admin' && role === 'user') {
      if (String(targetUser._id) === callerId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote currently logged-in administrator',
        });
      }

      const superAdminRecord = await Admin.findOne({ user: targetUser._id });
      if (superAdminRecord?.permissions?.includes('all')) {
        return res.status(400).json({
          success: false,
          message: 'Super Admin accounts cannot be demoted',
        });
      }

      if (targetUser.isActive) {
        try {
          await withAdminLifecycleGuard(async (tx?: any) => {
            let freshActiveAdminCount: number;
            if (tx && typeof tx.user?.count === 'function') {
              freshActiveAdminCount = await tx.user.count({
                where: {
                  role: 'admin',
                  isActive: true,
                  isDeleted: false,
                },
              });
            } else {
              freshActiveAdminCount = await User.countDocuments({
                role: 'admin',
                isActive: true,
                isDeleted: { $ne: true },
              });
            }

            if (freshActiveAdminCount <= 1) {
              throw new Error('LAST_ACTIVE_ADMIN');
            }

            if (tx && typeof tx.user?.update === 'function') {
              await tx.user.update({
                where: { id: String(targetUser._id) },
                data: { role },
              });
              targetUser.role = role;
            } else {
              targetUser.role = role;
              await targetUser.save();
            }
          });
        } catch (guardErr: any) {
          if (guardErr?.message === 'LAST_ACTIVE_ADMIN') {
            return res.status(400).json({
              success: false,
              message: 'Cannot demote administrator: would leave system without an active administrator account',
            });
          }
          if (guardErr instanceof AdminLifecycleLockError || guardErr?.code === 'LOCK_TIMEOUT') {
            return res.status(409).json({
              success: false,
              message: 'Administrator role update locked due to concurrent modifications. Please retry.',
            });
          }
          throw guardErr;
        }
      } else {
        targetUser.role = role;
        await targetUser.save();
      }
    } else {
      targetUser.role = role;
      await targetUser.save();
    }

    if (role === 'admin') {
      await Admin.findOneAndUpdate(
        { user: targetUser._id },
        { permissions: ['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports'] },
        { upsert: true }
      );
    }

    await logAdminAction(
      req.user?.role || 'admin',
      'USER_ROLE_UPDATED',
      'Updated user ' + targetUser.email + ' role to ' + role,
      'User',
      String(targetUser._id)
    );

    res.json({ success: true, data: targetUser });
  } catch (error) {
    next(error);
  }
}


/**
 * Atomic user deletion helper.
 * If an active database transaction `tx` is provided, executes all child record cleanups
 * and user record deletion inside that transaction.
 * Otherwise, wraps all operations inside a standalone interactive `prisma.$transaction`.
 * In case of any database error, rolls back all deletions atomically (fail-closed).
 */
async function executeAtomicUserDeletion(userId: string, tx?: any): Promise<void> {
  const targetId = String(userId);

  if (tx && typeof tx.user?.delete === 'function') {
    if (tx.profile?.deleteMany) await tx.profile.deleteMany({ where: { userId: targetId } });
    if (tx.verification?.deleteMany) await tx.verification.deleteMany({ where: { userId: targetId } });
    if (tx.subscription?.deleteMany) await tx.subscription.deleteMany({ where: { userId: targetId } });
    if (tx.payment?.deleteMany) await tx.payment.deleteMany({ where: { userId: targetId } });
    if (tx.interest?.deleteMany) {
      await tx.interest.deleteMany({
        where: { OR: [{ senderId: targetId }, { receiverId: targetId }] },
      });
    }
    if (tx.shortlist?.deleteMany) await tx.shortlist.deleteMany({ where: { userId: targetId } });
    if (tx.refreshToken?.deleteMany) await tx.refreshToken.deleteMany({ where: { userId: targetId } });
    if (tx.admin?.deleteMany) await tx.admin.deleteMany({ where: { userId: targetId } });
    await tx.user.delete({ where: { id: targetId } });
    return;
  }

  if (prisma && typeof prisma.$transaction === 'function') {
    await prisma.$transaction(async (innerTx: any) => {
      if (innerTx.profile?.deleteMany) await innerTx.profile.deleteMany({ where: { userId: targetId } });
      if (innerTx.verification?.deleteMany) await innerTx.verification.deleteMany({ where: { userId: targetId } });
      if (innerTx.subscription?.deleteMany) await innerTx.subscription.deleteMany({ where: { userId: targetId } });
      if (innerTx.payment?.deleteMany) await innerTx.payment.deleteMany({ where: { userId: targetId } });
      if (innerTx.interest?.deleteMany) {
        await innerTx.interest.deleteMany({
          where: { OR: [{ senderId: targetId }, { receiverId: targetId }] },
        });
      }
      if (innerTx.shortlist?.deleteMany) await innerTx.shortlist.deleteMany({ where: { userId: targetId } });
      if (innerTx.refreshToken?.deleteMany) await innerTx.refreshToken.deleteMany({ where: { userId: targetId } });
      if (innerTx.admin?.deleteMany) await innerTx.admin.deleteMany({ where: { userId: targetId } });
      await innerTx.user.delete({ where: { id: targetId } });
    });
    return;
  }

  // Fallback for non-Prisma / test mock environments
  await Profile.deleteMany({ user: targetId });
  await Verification.deleteMany({ user: targetId });
  await Subscription.deleteMany({ user: targetId });
  await Payment.deleteMany({ user: targetId });
  await Interest.deleteMany({ $or: [{ sender: targetId }, { receiver: targetId }] });
  await Shortlist.deleteMany({ user: targetId });
  await RefreshToken.deleteMany({ user: targetId });
  await Admin.deleteMany({ user: targetId });
  await User.findByIdAndDelete(targetId);
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const callerId = String(req.user?.userId || req.user?._id || req.user?.id || '');
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Protecting administrator accounts from deletion
    if (user.role === 'admin') {
      if (String(user._id) === callerId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete currently logged-in administrator',
        });
      }

      const superAdminRecord = await Admin.findOne({ user: user._id });
      if (superAdminRecord?.permissions?.includes('all')) {
        return res.status(400).json({
          success: false,
          message: 'Super Admin accounts cannot be deleted',
        });
      }

      if (user.isActive) {
        try {
          await withAdminLifecycleGuard(async (tx?: any) => {
            let freshActiveAdminCount: number;
            if (tx && typeof tx.user?.count === 'function') {
              freshActiveAdminCount = await tx.user.count({
                where: {
                  role: 'admin',
                  isActive: true,
                  isDeleted: false,
                },
              });
            } else {
              freshActiveAdminCount = await User.countDocuments({
                role: 'admin',
                isActive: true,
                isDeleted: { $ne: true },
              });
            }

            if (freshActiveAdminCount <= 1) {
              throw new Error('LAST_ACTIVE_ADMIN');
            }

            await executeAtomicUserDeletion(String(user._id), tx);
          });
        } catch (guardErr: any) {
          if (guardErr?.message === 'LAST_ACTIVE_ADMIN') {
            return res.status(400).json({
              success: false,
              message: 'Cannot delete the last active administrator account',
            });
          }
          if (guardErr instanceof AdminLifecycleLockError || guardErr?.code === 'LOCK_TIMEOUT') {
            return res.status(409).json({
              success: false,
              message: 'Administrator deletion locked due to concurrent modifications. Please retry.',
            });
          }
          throw guardErr;
        }

        await logAdminAction(
          req.user?.role || 'admin',
          'USER_DELETED',
          'Deleted user account ' + user.email,
          'User',
          String(user._id)
        );

        return res.json({ success: true, message: 'User and all related records deleted successfully' });
      }
    }

    // Standard non-admin or inactive admin atomic deletion
    await executeAtomicUserDeletion(String(user._id));

    await logAdminAction(
      req.user?.role || 'admin',
      'USER_DELETED',
      'Deleted user account ' + user.email,
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

    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');
    const canViewPrivate = isSuperAdmin || callerPerms.includes('privateInfo.view');

    const sanitizedProfiles = profiles.map((p: any) => {
      const pObj = typeof p.toObject === 'function' ? p.toObject() : { ...p };
      if (!canViewPrivate) {
        if (pObj.user) {
          pObj.user = {
            ...pObj.user,
            email: pObj.user.email ? maskEmail(pObj.user.email) : undefined,
            mobile: pObj.user.mobile ? maskMobile(pObj.user.mobile) : undefined,
          };
        }
        if (pObj.currentLocation) {
          pObj.currentLocation = redactPrivateAddress(pObj.currentLocation);
        }
        if (pObj.nativePlaceDetails) {
          pObj.nativePlaceDetails = redactPrivateAddress(pObj.nativePlaceDetails);
        }
      }
      return pObj;
    });

    res.json({
      success: true,
      data: {
        profiles: sanitizedProfiles,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        canViewPrivateContact: canViewPrivate,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfileById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rawId = (req.params.id || '').trim();
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Invalid profile or user ID' });
    }

    // Helper to calculate age from DOB
    const calculateAge = (dob: string | Date | undefined): number | null => {
      if (!dob) return null;
      const bDate = new Date(dob);
      if (isNaN(bDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - bDate.getFullYear();
      const m = today.getMonth() - bDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    };

    // Attempt to locate Profile by Profile ID or Candidate ID
    let profile: any = null;
    let user: any = null;

    if (isValidObjectId(rawId)) {
      profile = await Profile.findById(rawId)
        .populate('currentLocation.countryId', 'name code')
        .populate('currentLocation.stateId', 'name code')
        .populate('currentLocation.districtId', 'name')
        .populate('currentLocation.cityId', 'name type pincode')
        .populate('nativePlaceDetails.countryId', 'name code')
        .populate('nativePlaceDetails.stateId', 'name code')
        .populate('nativePlaceDetails.districtId', 'name')
        .populate('nativePlaceDetails.cityId', 'name type pincode')
        .populate('communityDetails.religionId', 'name')
        .populate('communityDetails.casteId', 'name category')
        .populate('communityDetails.subCasteId', 'name')
        .populate('languageDetails.motherTongueId', 'name nativeNames')
        .populate('languageDetails.otherLanguagesIds', 'name nativeNames');
    }

    if (!profile) {
      const canonical = await findCanonicalProfile(rawId);
      if (canonical) {
        const canonicalId = String(canonical._id || canonical.id);
        if (isValidObjectId(canonicalId)) {
          profile = await Profile.findById(canonicalId)
            .populate('currentLocation.countryId', 'name code')
            .populate('currentLocation.stateId', 'name code')
            .populate('currentLocation.districtId', 'name')
            .populate('currentLocation.cityId', 'name type pincode')
            .populate('nativePlaceDetails.countryId', 'name code')
            .populate('nativePlaceDetails.stateId', 'name code')
            .populate('nativePlaceDetails.districtId', 'name')
            .populate('nativePlaceDetails.cityId', 'name type pincode')
            .populate('communityDetails.religionId', 'name')
            .populate('communityDetails.casteId', 'name category')
            .populate('communityDetails.subCasteId', 'name')
            .populate('languageDetails.motherTongueId', 'name nativeNames')
            .populate('languageDetails.otherLanguagesIds', 'name nativeNames');
        } else {
          profile = canonical;
        }
      }
    }

    if (profile) {
      user = await User.findById(profile.userId || profile.user).select('-password');
    } else if (isValidObjectId(rawId)) {
      // Maybe rawId is a User ID
      user = await User.findById(rawId).select('-password');
      if (user) {
        profile = await Profile.findOne({ $or: [{ userId: user._id }, { user: user._id }] })
          .populate('currentLocation.countryId', 'name code')
          .populate('currentLocation.stateId', 'name code')
          .populate('currentLocation.districtId', 'name')
          .populate('currentLocation.cityId', 'name type pincode')
          .populate('nativePlaceDetails.countryId', 'name code')
          .populate('nativePlaceDetails.stateId', 'name code')
          .populate('nativePlaceDetails.districtId', 'name')
          .populate('nativePlaceDetails.cityId', 'name type pincode')
          .populate('communityDetails.religionId', 'name')
          .populate('communityDetails.casteId', 'name category')
          .populate('communityDetails.subCasteId', 'name')
          .populate('languageDetails.motherTongueId', 'name nativeNames')
          .populate('languageDetails.otherLanguagesIds', 'name nativeNames');
      }
    }

    if (!profile && !user) {
      return res.status(404).json({ success: false, message: 'Profile or User not found' });
    }

    const userId = user?._id || profile?.userId || profile?.user;
    const profileId = profile?._id;

    // Concurrently fetch all auxiliary admin review data
    const [verifications, subscriptions, payments, reports, auditLogs] = await Promise.all([
      userId ? Verification.find({ user: userId }).sort({ createdAt: -1 }) : [],
      userId ? Subscription.find({ user: userId }).sort({ createdAt: -1 }) : [],
      userId ? Payment.find({ user: userId }).sort({ createdAt: -1 }) : [],
      Report.find({
        $or: [
          ...(userId ? [{ reportedUser: userId }] : []),
          ...(profileId ? [{ reportedProfile: profileId }] : []),
        ],
      })
        .populate('reporter', 'fullName email mobile')
        .populate('moderator', 'fullName email')
        .sort({ createdAt: -1 }),
      AuditLog.find({
        $or: [
          ...(profileId ? [{ targetProfileId: profileId }] : []),
          ...(userId ? [{ targetUserId: userId }] : []),
        ],
      }).sort({ createdAt: -1 }),
    ]);

    const activeSubscription =
      subscriptions.find((s: any) => s.status === 'ACTIVE') || subscriptions[0] || null;

    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');
    const canViewPrivate = isSuperAdmin || callerPerms.includes('privateInfo.view');
    const canEditPrivate = isSuperAdmin || callerPerms.includes('privateInfo.edit');

    const profileObj = profile ? (typeof profile.toObject === 'function' ? profile.toObject() : profile) : null;
    let userObj = user ? (typeof user.toObject === 'function' ? user.toObject() : user) : null;

    // Safely parse JSON strings if stored in Prisma as text
    if (profileObj) {
      if (typeof profileObj.currentLocation === 'string') {
        try { profileObj.currentLocation = JSON.parse(profileObj.currentLocation); } catch (e) {}
      }
      if (typeof profileObj.nativePlaceDetails === 'string') {
        try { profileObj.nativePlaceDetails = JSON.parse(profileObj.nativePlaceDetails); } catch (e) {}
      }
      if (typeof profileObj.communityDetails === 'string') {
        try { profileObj.communityDetails = JSON.parse(profileObj.communityDetails); } catch (e) {}
      }
      if (typeof profileObj.horoscope === 'string') {
        try { profileObj.horoscope = JSON.parse(profileObj.horoscope); } catch (e) {}
      }
      if (!profileObj.horoscope) {
        profileObj.horoscope = {};
      }

      // 1. Calculate Age
      const computedAge = profileObj.age ?? calculateAge(profileObj.dob || userObj?.dob);
      if (computedAge !== null) {
        profileObj.age = computedAge;
        profileObj.calculatedAge = computedAge;
      }

      // 2. Resolve Sub-Caste fallback
      const resolvedSubCaste =
        profileObj.subCaste ||
        profileObj.communityDetails?.subCasteText ||
        (typeof profileObj.communityDetails?.subCasteId === 'object' ? profileObj.communityDetails?.subCasteId?.name : null) ||
        profileObj.communityDetails?.subCaste ||
        profileObj.casteAndGotra?.subCaste ||
        '';
      profileObj.subCaste = resolvedSubCaste;

      // 3. Resolve Pincode fallback
      const resolvedPincode =
        profileObj.currentLocation?.pincode ||
        (typeof profileObj.currentLocation?.cityId === 'object' ? profileObj.currentLocation?.cityId?.pincode : null) ||
        profileObj.nativePlaceDetails?.pincode ||
        (typeof profileObj.nativePlaceDetails?.cityId === 'object' ? profileObj.nativePlaceDetails?.cityId?.pincode : null) ||
        profileObj.pincode ||
        profileObj.address?.pincode ||
        '';
      if (resolvedPincode) {
        if (!profileObj.currentLocation) profileObj.currentLocation = {};
        if (!profileObj.currentLocation.pincode) profileObj.currentLocation.pincode = resolvedPincode;
        profileObj.pincode = resolvedPincode;
      }

      // 4. Resolve Native Place fallback
      const resolvedNativePlace =
        profileObj.nativePlace ||
        (canViewPrivate ? profileObj.nativePlaceDetails?.formattedAddress : null) ||
        profileObj.nativePlaceDetails?.city ||
        profileObj.nativePlaceDetails?.village ||
        profileObj.familyDetails?.nativePlace ||
        profileObj.familyDetails?.ancestralOrigin ||
        '';
      profileObj.nativePlace = resolvedNativePlace;

      // 5. Resolve Pada / Charan & Lagna fallback
      const horo = profileObj.horoscope;
      const pada = horo.pada ?? horo.charan ?? (profileObj as any).pada ?? (profileObj as any).charan ?? null;
      const lagna = horo.lagna || horo.ascendant || horo.lagnaRashi || (profileObj as any).lagna || null;
      if (pada !== null && pada !== undefined) {
        horo.pada = pada;
        horo.charan = pada;
      }
      if (lagna) {
        horo.lagna = lagna;
      }
    }

    if (!canViewPrivate) {
      if (userObj) {
        userObj = {
          ...userObj,
          email: userObj.email ? maskEmail(userObj.email) : undefined,
          mobile: userObj.mobile ? maskMobile(userObj.mobile) : undefined,
        };
      }
      if (profileObj) {
        const rawNativeFormatted = profileObj.nativePlaceDetails?.formattedAddress;

        if (profileObj.currentLocation) {
          profileObj.currentLocation = redactPrivateAddress(profileObj.currentLocation);
        }
        if (profileObj.nativePlaceDetails) {
          profileObj.nativePlaceDetails = redactPrivateAddress(profileObj.nativePlaceDetails);
        }
        if (profileObj.address) {
          profileObj.address = redactPrivateAddress(profileObj.address);
        }

        // Scrub root-level private residential pincode and address aliases
        delete profileObj.pincode;
        delete (profileObj as any).pinCode;
        delete (profileObj as any).postalCode;
        delete (profileObj as any).zipCode;

        // Ensure nativePlace does NOT expose formattedAddress or detailed residential street address
        if (
          profileObj.nativePlace &&
          (profileObj.nativePlace === rawNativeFormatted ||
            profileObj.nativePlace.includes('[Private Address') ||
            (rawNativeFormatted && profileObj.nativePlace === rawNativeFormatted))
        ) {
          profileObj.nativePlace =
            profileObj.nativePlaceDetails?.city ||
            profileObj.nativePlaceDetails?.village ||
            profileObj.familyDetails?.nativePlace ||
            profileObj.familyDetails?.ancestralOrigin ||
            '';
        }
      }
    }

    if (profileObj && !profileObj.user && userObj) {
      profileObj.user = userObj;
    }

    const responsePayload = {
      ...(profileObj || {}),
      profile: profileObj,
      user: userObj,
      canViewPrivateContact: canViewPrivate,
      canEditPrivateContact: canEditPrivate,
      isPrivateContactMasked: !canViewPrivate,
      verifications: verifications || [],
      subscription: activeSubscription,
      subscriptions: subscriptions || [],
      payments: payments || [],
      reports: reports || [],
      auditLogs: auditLogs || [],
      adminNotes: profileObj?.adminNotes || [],
    };

    res.json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    next(error);
  }
}

export async function addProfileAdminNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid profile or user ID' });
    }

    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }

    let profile = await Profile.findById(id);
    let user = profile ? await User.findById(profile.user) : await User.findById(id);
    if (!profile && user) {
      profile = await Profile.findOne({ user: user._id });
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const adminId = req.user?.userId;
    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminName = (req.user as any)?.fullName || adminEmail;
    const cleanNote = note.trim();

    const noteItem = {
      note: cleanNote,
      adminId,
      adminEmail,
      adminName,
      createdAt: new Date(),
    };

    if (!profile.adminNotes) {
      profile.adminNotes = [];
    }
    profile.adminNotes.unshift(noteItem as any);
    await profile.save();

    await logAdminAction(
      adminEmail,
      'ADMIN_NOTE_ADDED',
      `Added internal note to profile ${profile._id}: "${cleanNote.slice(0, 80)}${cleanNote.length > 80 ? '...' : ''}"`,
      'Profile',
      String(profile._id),
      {
        adminId,
        adminName,
        targetProfileId: profile._id,
        targetUserId: user?._id,
        reason: cleanNote,
      }
    );

    res.json({
      success: true,
      message: 'Admin note added successfully',
      data: profile.adminNotes,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const targetId = req.params.id;

    // 1. Resolve target profile (by Profile._id or User._id)
    let profile = null;
    if (mongoose.Types.ObjectId.isValid(targetId) || isValidObjectId(targetId)) {
      profile = await Profile.findById(targetId);
      if (!profile) {
        profile = await Profile.findOne({ $or: [{ userId: targetId }, { user: targetId }] });
      }
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const user = await User.findById(profile.userId || profile.user);

    // 2. Strict Backend Authorization Check for Profile Edits & Private Contact Info
    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');
    const canEditPrivate = isSuperAdmin || callerPerms.includes('privateInfo.edit');
    const canEditProfiles = isSuperAdmin || callerPerms.includes('profiles');
    const canViewPrivate = isSuperAdmin || callerPerms.includes('privateInfo.view') || canEditPrivate;

    if (!isSuperAdmin && !canEditProfiles && !canEditPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions to modify matrimonial profiles.',
      });
    }

    // A. Protected Full Name fields (Only Super Admin may modify name)
    const nameFieldKeys = ['name', 'fullname', 'firstname', 'lastname', 'displayname'];
    const attemptedNameField = Object.keys(req.body).find((key) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
      return nameFieldKeys.includes(normalizedKey);
    });

    if (attemptedNameField && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Name fields are protected and cannot be modified by standard administrators.',
        protectedField: attemptedNameField,
      });
    }

    // B. Private Contact & Contract Fields (Requires privateInfo.edit or Super Admin)
    const privateContactKeys = ['email', 'phone', 'mobile', 'mobilenumber'];
    const attemptedTopContact = Object.keys(req.body).find((key) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
      return privateContactKeys.includes(normalizedKey);
    });
    const attemptedNestedContact =
      req.body.user && typeof req.body.user === 'object'
        ? Object.keys(req.body.user).find((key) => {
            const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
            return privateContactKeys.includes(normalizedKey);
          })
        : null;
    const attemptedAddressContact =
      (req.body.currentLocation && req.body.currentLocation.formattedAddress !== undefined) ||
      (req.body.nativePlaceDetails && req.body.nativePlaceDetails.formattedAddress !== undefined);

    const isAttemptingPrivateContactEdit = !!(attemptedTopContact || attemptedNestedContact || attemptedAddressContact);

    // Rule: View permission must NEVER imply Edit permission.
    // Edit permission must be checked independently on every relevant backend mutation endpoint.
    // Administrators without privateInfo.edit (and not superadmin) must receive HTTP 403.
    if (isAttemptingPrivateContactEdit && !canEditPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: privateInfo.edit permission required to modify private contact information.',
        attemptedField: attemptedTopContact || attemptedNestedContact || 'formattedAddress',
      });
    }

    // Handle User model updates if authorized and private contact edit is requested
    let userContactUpdated = false;
    let oldEmail = user?.email;
    let oldMobile = user?.mobile;

    if (canEditPrivate && user) {
      const newEmail = req.body.email || (req.body.user && req.body.user.email);
      if (newEmail !== undefined && newEmail !== null) {
        const trimmedEmail = String(newEmail).toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          return res.status(400).json({ success: false, message: 'Invalid email address format.' });
        }
        if (trimmedEmail !== user.email) {
          const existingEmailUser = await User.findOne({
            email: trimmedEmail,
            _id: { $ne: user._id },
          });
          if (existingEmailUser) {
            return res.status(400).json({ success: false, message: 'Email address is already in use by another account.' });
          }
          user.email = trimmedEmail;
          userContactUpdated = true;
        }
      }

      const newMobile = req.body.mobile || req.body.phone || (req.body.user && (req.body.user.mobile || req.body.user.phone));
      if (newMobile !== undefined && newMobile !== null) {
        const trimmedMobile = String(newMobile).trim();
        if (trimmedMobile.length < 8) {
          return res.status(400).json({ success: false, message: 'Mobile number must be at least 8 digits.' });
        }
        if (trimmedMobile !== user.mobile) {
          const existingMobileUser = await User.findOne({
            mobile: trimmedMobile,
            _id: { $ne: user._id },
          });
          if (existingMobileUser) {
            return res.status(400).json({ success: false, message: 'Mobile number is already in use by another account.' });
          }
          user.mobile = trimmedMobile;
          userContactUpdated = true;
        }
      }

      if (isSuperAdmin && (req.body.fullName || req.body.name)) {
        user.fullName = (req.body.fullName || req.body.name).trim();
        userContactUpdated = true;
      }

      if (userContactUpdated) {
        await user.save();
      }
    }

    // 3. Explicitly Whitelist Editable Fields (Do NOT pass req.body directly into the database update)
    const updateData: Record<string, any> = {};

    // Address updates for authorized administrators
    if (canEditPrivate) {
      if (req.body.currentLocation && req.body.currentLocation.formattedAddress !== undefined) {
        updateData.currentLocation = {
          ...(profile.currentLocation || {}),
          ...req.body.currentLocation,
          formattedAddress: req.body.currentLocation.formattedAddress,
        };
      }
      if (req.body.nativePlaceDetails && req.body.nativePlaceDetails.formattedAddress !== undefined) {
        updateData.nativePlaceDetails = {
          ...(profile.nativePlaceDetails || {}),
          ...req.body.nativePlaceDetails,
          formattedAddress: req.body.nativePlaceDetails.formattedAddress,
        };
      }
    }

    // Personal Details
    if (req.body.gender !== undefined) updateData.gender = req.body.gender;
    if (req.body.dob !== undefined) updateData.dob = req.body.dob;
    if (req.body.dateOfBirth !== undefined) updateData.dob = req.body.dateOfBirth;
    if (req.body.maritalStatus !== undefined) updateData.maritalStatus = req.body.maritalStatus;
    if (req.body.height !== undefined) updateData.height = req.body.height;
    if (req.body.religion !== undefined) updateData.religion = req.body.religion;
    if (req.body.caste !== undefined) updateData.caste = req.body.caste;
    if (req.body.subCaste !== undefined) updateData.subCaste = req.body.subCaste;
    if (req.body.motherTongue !== undefined) updateData.motherTongue = req.body.motherTongue;
    if (req.body.city !== undefined) updateData.city = req.body.city;
    if (req.body.state !== undefined) updateData.state = req.body.state;
    if (req.body.country !== undefined) updateData.country = req.body.country;

    // Professional Details
    if (req.body.education !== undefined) updateData.education = req.body.education;
    if (req.body.qualification !== undefined) updateData.education = req.body.qualification;
    if (req.body.degree !== undefined) updateData.degree = req.body.degree;
    if (req.body.profession !== undefined) updateData.profession = req.body.profession;
    if (req.body.specialization !== undefined) updateData.additionalQualification = req.body.specialization;
    if (req.body.additionalQualification !== undefined) updateData.additionalQualification = req.body.additionalQualification;
    if (req.body.company !== undefined) updateData.company = req.body.company;
    if (req.body.workplace !== undefined) updateData.company = req.body.workplace;
    if (req.body.workLocation !== undefined) updateData.workLocation = req.body.workLocation;
    if (req.body.workType !== undefined) updateData.workType = req.body.workType;
    if (req.body.annualIncome !== undefined) updateData.annualIncome = req.body.annualIncome;
    if (req.body.medicalRegistrationNumber !== undefined) updateData.medicalRegistrationNumber = req.body.medicalRegistrationNumber;
    if (req.body.medicalCouncil !== undefined) updateData.medicalCouncil = req.body.medicalCouncil;
    if (req.body.medicalCollege !== undefined) updateData.medicalCollege = req.body.medicalCollege;
    if (req.body.institution !== undefined) updateData.medicalCollege = req.body.institution;
    if (req.body.college !== undefined) updateData.medicalCollege = req.body.college;
    if (req.body.currentHospital !== undefined) updateData.currentHospital = req.body.currentHospital;
    if (req.body.graduationYear !== undefined) updateData.graduationYear = req.body.graduationYear;
    if (req.body.medicalUniversity !== undefined) updateData.medicalUniversity = req.body.medicalUniversity;
    if (req.body.stateMedicalCouncil !== undefined) updateData.stateMedicalCouncil = req.body.stateMedicalCouncil;
    if (req.body.registrationYear !== undefined) updateData.registrationYear = req.body.registrationYear;
    if (req.body.currentlyPracticing !== undefined) updateData.currentlyPracticing = req.body.currentlyPracticing;
    if (req.body.medicalQualifications && typeof req.body.medicalQualifications === 'object') {
      updateData.medicalQualifications = {
        ...(profile.medicalQualifications || {}),
        ...req.body.medicalQualifications,
      };
    }

    // Family Details
    if (req.body.familyType !== undefined) updateData.familyType = req.body.familyType;
    if (req.body.familyStatus !== undefined) updateData.familyStatus = req.body.familyStatus;
    if (req.body.familyValues !== undefined) updateData.familyValues = req.body.familyValues;
    if (req.body.fatherOccupation !== undefined) updateData.fatherOccupation = req.body.fatherOccupation;
    if (req.body.motherOccupation !== undefined) updateData.motherOccupation = req.body.motherOccupation;
    if (req.body.siblings !== undefined) updateData.siblings = req.body.siblings;
    if (req.body.nativePlace !== undefined) updateData.nativePlace = req.body.nativePlace;
    if (req.body.familyLocation !== undefined) updateData.familyLocation = req.body.familyLocation;
    if (req.body.familyBackground && typeof req.body.familyBackground === 'object') {
      updateData.familyBackground = {
        ...(profile.familyBackground || {}),
        ...req.body.familyBackground,
      };
    }

    // Horoscope Details
    if (req.body.horoscope && typeof req.body.horoscope === 'object') {
      updateData.horoscope = {
        ...(profile.horoscope || {}),
        ...req.body.horoscope,
      };
    } else if (req.body.manglik !== undefined) {
      updateData.horoscope = {
        ...(profile.horoscope || {}),
        manglik: req.body.manglik,
      };
    }

    // Profile Details & Bio
    if (req.body.about !== undefined) updateData.about = req.body.about;
    if (req.body.bio !== undefined) updateData.about = req.body.bio;
    if (req.body.foodPreference !== undefined) updateData.foodPreference = req.body.foodPreference;
    if (req.body.smoking !== undefined) updateData.smoking = req.body.smoking;
    if (req.body.drinking !== undefined) updateData.drinking = req.body.drinking;
    if (req.body.lifestyleInterests && typeof req.body.lifestyleInterests === 'object') {
      updateData.lifestyleInterests = {
        ...(profile.lifestyleInterests || {}),
        ...req.body.lifestyleInterests,
      };
    }
    if (req.body.partnerPreferences && typeof req.body.partnerPreferences === 'object') {
      updateData.partnerPreferences = {
        ...(profile.partnerPreferences || {}),
        ...req.body.partnerPreferences,
      };
    }

    // Admin Controls / Status
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.profileStatus !== undefined) updateData.status = req.body.profileStatus;
    if (req.body.verificationStatus !== undefined) updateData.verificationStatus = req.body.verificationStatus;
    if (req.body.kycStatus !== undefined) updateData.verificationStatus = req.body.kycStatus;

    // 4. Handle Account / User Status (if admin provided accountStatus)
    let userChanged = false;
    let oldAccountStatus = user ? user.status : undefined;
    const requestedAccountStatus = req.body.accountStatus;
    if (user && requestedAccountStatus) {
      if (user.status !== requestedAccountStatus) {
        user.status = requestedAccountStatus;
        if (requestedAccountStatus === 'Active') {
          user.isActive = true;
          user.isDeleted = false;
        } else if (requestedAccountStatus === 'Suspended' || requestedAccountStatus === 'Blocked') {
          user.isActive = false;
        } else if (requestedAccountStatus === 'Deleted') {
          user.isDeleted = true;
          user.isActive = false;
        }
        userChanged = true;
      }
      delete updateData.accountStatus;
    }

    // 5. Field validations
    if (updateData.dob !== undefined) {
      if (!updateData.dob || (typeof updateData.dob === 'string' && !updateData.dob.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Date of birth cannot be empty.',
        });
      }
      const dobResult = validateDateOfBirth(updateData.dob, updateData.gender || profile.gender);
      if (!dobResult.isValid) {
        return res.status(400).json({
          success: false,
          message: dobResult.error || 'Date of birth year must be exactly 4 digits.',
        });
      }
      updateData.dob = dobResult.parsedDate || new Date(dobResult.formattedDate!);
    }

    if (updateData.education || updateData.degree) {
      const qualToCheck = updateData.education || updateData.degree;
      if (qualToCheck && typeof qualToCheck === 'string' && qualToCheck.trim()) {
        const qualResult = validateMedicalQualification(qualToCheck);
        if (!qualResult.isValid) {
          return res.status(400).json({
            success: false,
            message: qualResult.error || 'Please select a valid medical/doctor qualification.',
          });
        }
      }
    }

    // 6. Handle nested objects merge
    if (updateData.partnerPreferences && typeof updateData.partnerPreferences === 'object') {
      updateData.partnerPreferences = {
        ...(profile.partnerPreferences || {}),
        ...updateData.partnerPreferences,
      };
    }
    if (updateData.lifestyleInterests && typeof updateData.lifestyleInterests === 'object') {
      updateData.lifestyleInterests = {
        ...(profile.lifestyleInterests || {}),
        ...updateData.lifestyleInterests,
      };
    }
    if (updateData.horoscope && typeof updateData.horoscope === 'object') {
      updateData.horoscope = {
        ...(profile.horoscope || {}),
        ...updateData.horoscope,
      };
    }
    if (updateData.familyBackground && typeof updateData.familyBackground === 'object') {
      updateData.familyBackground = {
        ...(profile.familyBackground || {}),
        ...updateData.familyBackground,
      };
    }
    if (updateData.medicalQualifications && typeof updateData.medicalQualifications === 'object') {
      updateData.medicalQualifications = {
        ...(profile.medicalQualifications || {}),
        ...updateData.medicalQualifications,
      };
    }

    // 7. Track diff for audit logging
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    for (const [key, newVal] of Object.entries(updateData)) {
      const oldVal = (profile as any)[key];
      const oldStr = oldVal instanceof Date ? oldVal.toISOString().slice(0, 10) : JSON.stringify(oldVal ?? '');
      const newStr = newVal instanceof Date ? newVal.toISOString().slice(0, 10) : JSON.stringify(newVal ?? '');
      if (oldStr !== newStr) {
        changes.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
    if (userChanged && user) {
      changes.push({
        field: 'accountStatus',
        oldValue: oldAccountStatus,
        newValue: user.status,
      });
    }

    // 8. Persist changes
    Object.assign(profile, updateData);
    await profile.save();

    if (userChanged && user) {
      await user.save();
    }

    // 9. Record in Admin Audit Log
    const changedFieldNames = changes.map((c) => c.field);
    if (changes.length > 0) {
      const adminNameStr = req.user?.email ? req.user.email.split('@')[0] : 'Administrator';
      await logAdminAction(
        req.user?.email || 'admin@wonderfuljodi.com',
        'PROFILE_EDITED',
        `Admin modified profile for ${profile.displayName || user?.fullName || profile._id}: ${changedFieldNames.join(', ')}`,
        'Profile',
        String(profile._id),
        {
          adminId: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
          adminName: adminNameStr,
          targetProfileId: profile._id,
          targetUserId: profile.user,
          previousStatus: profile.status,
          newStatus: updateData.status || profile.status,
          metadata: {
            fieldsChanged: changedFieldNames,
            changes,
          },
        }
      );
    }

    if (userContactUpdated || attemptedAddressContact) {
      await logAdminAction(
        req.user?.email || 'admin@wonderfuljodi.com',
        'PRIVATE_CONTACT_UPDATED',
        `Admin updated private contact information for candidate ${profile.displayName || profile.candidateId || profile._id}`,
        'Profile',
        String(profile._id),
        {
          adminId: callerId,
          adminName: req.user?.fullName || (req.user?.email ? req.user.email.split('@')[0] : 'Administrator'),
          targetProfileId: profile._id,
          targetUserId: user?._id || profile.userId || profile.user,
          reason: 'Authorized administrator updated private contact details',
          metadata: {
            userContactUpdated,
            addressContactUpdated: !!attemptedAddressContact,
          },
        }
      );
    }

    const userObj = user ? (typeof user.toObject === 'function' ? user.toObject() : { ...user }) : undefined;
    const profileObj = typeof profile.toObject === 'function' ? profile.toObject() : { ...profile };

    if (!canViewPrivate) {
      if (userObj) {
        userObj.email = userObj.email ? maskEmail(userObj.email) : undefined;
        userObj.mobile = userObj.mobile ? maskMobile(userObj.mobile) : undefined;
      }
      if (profileObj.currentLocation) {
        profileObj.currentLocation = redactPrivateAddress(profileObj.currentLocation);
      }
      if (profileObj.nativePlaceDetails) {
        profileObj.nativePlaceDetails = redactPrivateAddress(profileObj.nativePlaceDetails);
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        ...profileObj,
        user: userObj,
      },
      changesCount: changes.length,
    });
  } catch (error) {
    next(error);
  }
}

// 4. KYC / Degree Verification Queue
export async function getVerifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, documentType, search } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '25'), 10) || 25));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = String(status).toUpperCase();
    }
    if (documentType && documentType !== 'ALL') {
      query.documentType = String(documentType).toUpperCase();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(safeSearch, 'i');

      // Find matching users first
      const matchingUsers = await User.find({
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { mobile: searchRegex },
        ],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      const searchConditions: any[] = [
        { documentName: searchRegex },
        { user: { $in: userIds } },
      ];

      if (isValidObjectId(search.trim())) {
        searchConditions.push({ _id: search.trim() });
      }

      query.$or = searchConditions;
    }

    const [total, verifications] = await Promise.all([
      Verification.countDocuments(query),
      Verification.find(query)
        .populate('user', 'fullName email mobile verificationStatus verified isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: verifications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getVerificationById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid verification ID' });
    }

    const verification = await Verification.findById(id).populate(
      'user',
      'fullName email mobile verificationStatus verified isActive createdAt'
    );

    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification record not found' });
    }

    // Also fetch associated user profile and previous verification history
    const [profile, history] = await Promise.all([
      Profile.findOne({ user: verification.user._id }),
      Verification.find({ user: verification.user._id, _id: { $ne: verification._id } }).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        ...verification.toObject(),
        profile,
        history,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function approveVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid verification ID' });
    }

    const currentDoc = await Verification.findById(id);
    if (!currentDoc) {
      return res.status(404).json({ success: false, message: 'Verification record not found' });
    }

    // Concurrency Protection
    if (currentDoc.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `This verification record has already been reviewed (Current status: ${currentDoc.status}).`,
        currentStatus: currentDoc.status,
      });
    }

    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminId = req.user?.userId;
    const adminNote = notes?.trim() || 'Verified and approved by Administrator after document credential audit';

    const targetUserId = String(currentDoc.user || (currentDoc as any).userId || '').trim();
    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Verification record does not contain a valid associated user ID.',
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target candidate user account linked to this verification was not found.',
      });
    }

    const now = new Date();
    if (prisma && typeof prisma.$transaction === 'function') {
      try {
        await prisma.$transaction(async (tx: any) => {
          const updateResult = await tx.verification.updateMany({
            where: { id, status: 'PENDING' },
            data: {
              status: 'APPROVED',
              reviewedAt: now,
              reviewedById: adminId && isValidObjectId(adminId) ? adminId : null,
              reviewedByEmail: adminEmail,
              adminNotes: adminNote,
            },
          });

          if (updateResult.count === 0) {
            throw new Error('CONCURRENCY_CONFLICT_OR_REVIEWED');
          }

          await tx.user.update({
            where: { id: targetUserId },
            data: {
              verified: true,
              verificationStatus: 'VERIFIED',
            },
          });

          if (tx.profile?.updateMany) {
            await tx.profile.updateMany({
              where: { userId: targetUserId },
              data: {
                verificationStatus: 'VERIFIED',
              },
            });
          }

          if (tx.notification?.create) {
            await tx.notification.create({
              data: {
                id: generateObjectId(),
                userId: targetUserId,
                type: 'VERIFICATION',
                title: 'Verification Approved',
                message: `Your ${currentDoc.documentType.replace(/_/g, ' ')} (${currentDoc.documentName || 'Document'}) has been successfully verified. Your profile now proudly displays the verified badge.`,
                actionUrl: '/profile',
                read: false,
              },
            });
          }
        });
      } catch (txErr: any) {
        if (txErr.message === 'CONCURRENCY_CONFLICT_OR_REVIEWED') {
          const reloaded = await Verification.findById(id);
          return res.status(409).json({
            success: false,
            message: `This verification record has already been reviewed (Current status: ${reloaded?.status || 'REVIEWED'}).`,
            currentStatus: reloaded?.status,
          });
        }
        console.error('[AdminVerification] Approval transaction failed:', txErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to complete verification approval transaction. Please retry.',
        });
      }
    } else {
      currentDoc.status = 'APPROVED';
      currentDoc.reviewedAt = now;
      if (adminId && isValidObjectId(adminId)) {
        currentDoc.reviewedBy = adminId as any;
      }
      currentDoc.reviewedByEmail = adminEmail;
      currentDoc.adminNotes = adminNote;
      await currentDoc.save();

      await User.findByIdAndUpdate(targetUserId, { verified: true, verificationStatus: 'VERIFIED' });
      await Profile.findOneAndUpdate({ user: targetUserId }, { verificationStatus: 'VERIFIED' });
    }

    // Immutable Audit Log
    await logAdminAction(
      adminEmail,
      'VERIFICATION_APPROVED',
      `Approved ${currentDoc.documentType} verification for User ID: ${targetUserId}. Notes: ${adminNote}`,
      'Verification',
      String(currentDoc._id)
    );

    // User Notification
    try {
      await Notification.create({
        user: targetUserId,
        type: 'VERIFICATION',
        title: 'Verification Approved',
        message: `Your ${currentDoc.documentType.replace(/_/g, ' ')} (${currentDoc.documentName || 'Document'}) has been successfully verified. Your profile now proudly displays the verified badge.`,
        actionUrl: '/profile',
        read: false,
      });
    } catch (notifErr) {
      console.error('Failed to create user verification approval notification:', notifErr);
    }

    const populated = await Verification.findById(currentDoc._id).populate(
      'user',
      'fullName email mobile verificationStatus verified isActive'
    );

    res.json({
      success: true,
      data: populated,
      message: 'Verification approved successfully. User status updated to VERIFIED.',
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason, rejectionReason, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid verification ID' });
    }

    const selectedReason = (rejectionReason || reason || '').trim();
    if (!selectedReason) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is mandatory to guide the user for re-submission.',
      });
    }

    const currentDoc = await Verification.findById(id);
    if (!currentDoc) {
      return res.status(404).json({ success: false, message: 'Verification record not found' });
    }

    // Concurrency Protection
    if (currentDoc.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `This verification record has already been reviewed (Current status: ${currentDoc.status}).`,
        currentStatus: currentDoc.status,
      });
    }

    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminId = req.user?.userId;
    const adminNote = notes?.trim() || selectedReason;

    const targetUserId = String(currentDoc.user || (currentDoc as any).userId || '').trim();
    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Verification record does not contain a valid associated user ID.',
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target candidate user account linked to this verification was not found.',
      });
    }

    const now = new Date();
    if (prisma && typeof prisma.$transaction === 'function') {
      try {
        await prisma.$transaction(async (tx: any) => {
          const updateResult = await tx.verification.updateMany({
            where: { id, status: 'PENDING' },
            data: {
              status: 'REJECTED',
              reviewedAt: now,
              reviewedById: adminId && isValidObjectId(adminId) ? adminId : null,
              reviewedByEmail: adminEmail,
              rejectionReason: selectedReason,
              adminNotes: adminNote,
            },
          });

          if (updateResult.count === 0) {
            throw new Error('CONCURRENCY_CONFLICT_OR_REVIEWED');
          }

          const remainingApprovedCount = await tx.verification.count({
            where: {
              userId: targetUserId,
              status: 'APPROVED',
              id: { not: id },
            },
          });

          if (remainingApprovedCount === 0) {
            await tx.user.update({
              where: { id: targetUserId },
              data: {
                verified: false,
                verificationStatus: 'REJECTED',
              },
            });

            if (tx.profile?.updateMany) {
              await tx.profile.updateMany({
                where: { userId: targetUserId },
                data: {
                  verificationStatus: 'REJECTED',
                },
              });
            }
          }

          if (tx.notification?.create) {
            await tx.notification.create({
              data: {
                id: generateObjectId(),
                userId: targetUserId,
                type: 'VERIFICATION',
                title: 'Verification Requires Attention',
                message: `Your submitted ${currentDoc.documentType.replace(/_/g, ' ')} could not be verified. Reason: ${selectedReason}. Please visit your profile verification page to upload a new document.`,
                actionUrl: '/profile/verification',
                read: false,
              },
            });
          }
        });
      } catch (txErr: any) {
        if (txErr.message === 'CONCURRENCY_CONFLICT_OR_REVIEWED') {
          const reloaded = await Verification.findById(id);
          return res.status(409).json({
            success: false,
            message: `This verification record has already been reviewed (Current status: ${reloaded?.status || 'REVIEWED'}).`,
            currentStatus: reloaded?.status,
          });
        }
        console.error('[AdminVerification] Rejection transaction failed:', txErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to complete verification rejection transaction. Please retry.',
        });
      }
    } else {
      currentDoc.status = 'REJECTED';
      currentDoc.reviewedAt = now;
      if (adminId && isValidObjectId(adminId)) {
        currentDoc.reviewedBy = adminId as any;
      }
      currentDoc.reviewedByEmail = adminEmail;
      currentDoc.rejectionReason = selectedReason;
      currentDoc.adminNotes = adminNote;
      await currentDoc.save();

      const remainingApproved = await Verification.countDocuments({
        user: targetUserId,
        status: 'APPROVED',
        _id: { $ne: currentDoc._id },
      });

      if (remainingApproved === 0) {
        await User.findByIdAndUpdate(targetUserId, { verified: false, verificationStatus: 'REJECTED' });
        await Profile.findOneAndUpdate({ user: targetUserId }, { verificationStatus: 'REJECTED' });
      }
    }

    // Immutable Audit Log
    await logAdminAction(
      adminEmail,
      'VERIFICATION_REJECTED',
      `Rejected ${currentDoc.documentType} verification for User ID: ${targetUserId}. Reason: ${selectedReason}. Notes: ${adminNote}`,
      'Verification',
      String(currentDoc._id)
    );

    // User Notification
    try {
      await Notification.create({
        user: targetUserId,
        type: 'VERIFICATION',
        title: 'Verification Requires Attention',
        message: `Your submitted ${currentDoc.documentType.replace(/_/g, ' ')} could not be verified. Reason: ${selectedReason}. Please visit your profile verification page to upload a new document.`,
        actionUrl: '/profile/verification',
        read: false,
      });
    } catch (notifErr) {
      console.error('Failed to create user verification rejection notification:', notifErr);
    }

    const populated = await Verification.findById(currentDoc._id).populate(
      'user',
      'fullName email mobile verificationStatus verified isActive'
    );

    res.json({
      success: true,
      data: populated,
      message: 'Verification marked as rejected and notification dispatched to user.',
    });
  } catch (error) {
    next(error);
  }
}

export async function approveAllUserVerifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { notes } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const pendingDocs = await Verification.find({ user: userId, status: 'PENDING' });
    if (!pendingDocs.length) {
      return res.status(400).json({ success: false, message: 'No pending verification documents found for this user.' });
    }

    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminId = req.user?.userId;
    const adminNote = notes?.trim() || 'All submitted credentials audited and approved by Administrator';

    for (const doc of pendingDocs) {
      doc.status = 'APPROVED';
      doc.reviewedAt = new Date();
      if (adminId && isValidObjectId(adminId)) {
        doc.reviewedBy = adminId as any;
      }
      doc.reviewedByEmail = adminEmail;
      doc.adminNotes = adminNote;
      await doc.save();

      await logAdminAction(
        adminEmail,
        'VERIFICATION_APPROVED',
        `Approved ${doc.documentType} verification for User ID: ${userId}. Notes: ${adminNote}`,
        'Verification',
        String(doc._id)
      );
    }

    // Update User & Profile Status to VERIFIED
    await User.findByIdAndUpdate(userId, { verified: true, verificationStatus: 'VERIFIED' });
    await Profile.findOneAndUpdate({ user: userId }, { verificationStatus: 'VERIFIED' });

    try {
      await Notification.create({
        user: userId,
        type: 'VERIFICATION',
        title: 'All Credentials Verified & Approved',
        message: 'All your submitted verification credentials have been approved by the administration. Your profile now proudly displays the verified doctor badge.',
        actionUrl: '/profile',
        read: false,
      });
    } catch (notifErr) {
      console.error('Failed to create user verification approval notification:', notifErr);
    }

    const allDocs = await Verification.find({ user: userId }).populate(
      'user',
      'fullName email mobile verificationStatus verified isActive'
    );

    res.json({
      success: true,
      data: allDocs,
      message: `Successfully approved all ${pendingDocs.length} verification document(s). User is now verified.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectAllUserVerifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { reason, rejectionReason, notes } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const selectedReason = (rejectionReason || reason || '').trim() || 'Documents do not meet matrimonial verification requirements';
    const pendingDocs = await Verification.find({ user: userId, status: 'PENDING' });
    if (!pendingDocs.length) {
      return res.status(400).json({ success: false, message: 'No pending verification documents found for this user.' });
    }

    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminId = req.user?.userId;
    const adminNote = notes?.trim() || selectedReason;

    for (const doc of pendingDocs) {
      doc.status = 'REJECTED';
      doc.reviewedAt = new Date();
      if (adminId && isValidObjectId(adminId)) {
        doc.reviewedBy = adminId as any;
      }
      doc.reviewedByEmail = adminEmail;
      doc.rejectionReason = selectedReason;
      doc.adminNotes = adminNote;
      await doc.save();

      await logAdminAction(
        adminEmail,
        'VERIFICATION_REJECTED',
        `Rejected ${doc.documentType} verification for User ID: ${userId}. Reason: ${selectedReason}. Notes: ${adminNote}`,
        'Verification',
        String(doc._id)
      );
    }

    const remainingApproved = await Verification.countDocuments({
      user: userId,
      status: 'APPROVED',
    });

    if (remainingApproved === 0) {
      await User.findByIdAndUpdate(userId, { verified: false, verificationStatus: 'REJECTED' });
      await Profile.findOneAndUpdate({ user: userId }, { verificationStatus: 'REJECTED' });
    }

    try {
      await Notification.create({
        user: userId,
        type: 'VERIFICATION',
        title: 'Verification Requires Attention',
        message: `Your submitted credentials could not be verified. Reason: ${selectedReason}. Please visit your profile verification center to submit clear documents.`,
        actionUrl: '/profile/verification',
        read: false,
      });
    } catch (notifErr) {
      console.error('Failed to create user verification rejection notification:', notifErr);
    }

    const allDocs = await Verification.find({ user: userId }).populate(
      'user',
      'fullName email mobile verificationStatus verified isActive'
    );

    res.json({
      success: true,
      data: allDocs,
      message: `Rejected ${pendingDocs.length} verification document(s) for user.`,
    });
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

    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');
    const canViewPrivate = isSuperAdmin || callerPerms.includes('privateInfo.view');

    const sanitizedSubs = subscriptions.map((s: any) => {
      const sObj = typeof s.toObject === 'function' ? s.toObject() : { ...s };
      if (!canViewPrivate && sObj.user) {
        sObj.user = {
          ...sObj.user,
          email: sObj.user.email ? maskEmail(sObj.user.email) : undefined,
          mobile: sObj.user.mobile ? maskMobile(sObj.user.mobile) : undefined,
        };
      }
      return sObj;
    });

    res.json({ success: true, data: sanitizedSubs, canViewPrivateContact: canViewPrivate });
  } catch (error) {
    next(error);
  }
}

export async function updateMembership(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    if (!callerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Super Administrators can modify subscription memberships.',
      });
    }

    const existingSub = await Subscription.findById(req.params.id);
    if (!existingSub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const {
      plan,
      planId,
      status,
      expiryDate,
      durationDays,
      reason,
      preserveCredits,
      additionalCredits,
      contactRequestsRemaining,
    } = req.body;
    const updateData: any = {};

    const planIdentifier = planId || plan;
    if (planIdentifier) {
      let matchedPlan: any = null;
      if (isValidObjectId(planIdentifier)) {
        matchedPlan = await MembershipPlan.findById(planIdentifier);
      }
      if (!matchedPlan) {
        matchedPlan = await MembershipPlan.findOne({
          $or: [
            { slug: String(planIdentifier).toLowerCase().trim() },
            { planId: String(planIdentifier).trim() },
            { key: String(planIdentifier).toUpperCase().trim() },
            { name: String(planIdentifier).trim() },
          ],
        });
      }
      if (!matchedPlan) {
        const fallbackPlans = [
          { name: 'Standard Free', slug: 'free', durationDays: 3650, contactRequestLimit: 0 },
          { name: 'Basic Doctor Connect', slug: 'basic-doctor-connect', durationDays: 30, contactRequestLimit: 15 },
          { name: 'Premium Match', slug: 'premium-match', durationDays: 180, contactRequestLimit: 60 },
          { name: 'Priority Matchmaking', slug: 'priority-matchmaking', durationDays: 180, contactRequestLimit: 120 },
          { name: 'Elite Assisted VIP', slug: 'elite-assisted-vip', durationDays: 365, contactRequestLimit: 300 },
        ];
        matchedPlan = fallbackPlans.find(
          (p) =>
            p.slug === String(planIdentifier).toLowerCase().trim() ||
            p.name.toLowerCase() === String(planIdentifier).toLowerCase().trim()
        );
      }

      if (!matchedPlan) {
        return res.status(404).json({ success: false, message: 'Specified membership plan was not found.' });
      }

      updateData.plan = matchedPlan.name;
      updateData.planId = String(matchedPlan._id || matchedPlan.planId || matchedPlan.slug);

      // Recalculate duration and expiry if not explicitly passed
      if (!expiryDate) {
        const days = durationDays ? Number(durationDays) : (matchedPlan.durationDays || 30);
        updateData.expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      // Contact credit preservation and reset rules:
      // 1. Explicit contactRequestsRemaining provided: set exact number
      // 2. preserveCredits === true: retain user's existing unused credits
      // 3. additionalCredits: add onto user's existing unused credits
      // 4. default approved rule on plan change: reset to the new plan's default credit limit
      if (contactRequestsRemaining !== undefined) {
        updateData.contactRequestsRemaining = Math.max(0, Number(contactRequestsRemaining));
      } else if (preserveCredits === true || preserveCredits === 'true') {
        updateData.contactRequestsRemaining = existingSub.contactRequestsRemaining ?? matchedPlan.contactRequestLimit ?? 0;
      } else if (additionalCredits !== undefined && !isNaN(Number(additionalCredits))) {
        updateData.contactRequestsRemaining = Math.max(
          0,
          (existingSub.contactRequestsRemaining || 0) + Number(additionalCredits)
        );
      } else if (matchedPlan.contactRequestLimit !== undefined) {
        updateData.contactRequestsRemaining = matchedPlan.contactRequestLimit;
      }
    }

    if (status) updateData.status = status;
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);

    // Strictly disallow fabricating payment records or gateway identifiers
    delete (updateData as any).payment;
    delete (updateData as any).paymentId;
    delete (updateData as any).paymentGateway;
    delete (updateData as any).razorpayPaymentId;
    delete (updateData as any).transactionId;

    const previousSnapshot = {
      plan: existingSub.plan,
      planId: existingSub.planId,
      status: existingSub.status,
      expiryDate: existingSub.expiryDate,
      contactRequestsRemaining: existingSub.contactRequestsRemaining,
    };

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).populate('user', 'fullName email mobile');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Write to permanent AuditLog and logAdminAction with compensating rollback on failure
    try {
      await AuditLog.create({
        adminUser: callerId,
        adminId: callerId,
        adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
        adminName: req.user?.fullName || req.user?.email,
        action: 'MEMBERSHIP_PLAN_CHANGED',
        targetModel: 'Subscription',
        targetId: String(subscription._id),
        targetUserId: subscription.user?._id || subscription.user,
        previousStatus: existingSub.plan,
        newStatus: subscription.plan,
        reason: reason || 'Super Admin manual plan modification',
        details: `Plan changed from ${existingSub.plan} to ${subscription.plan} by Super Admin`,
        status: 'SUCCESS',
        metadata: {
          previousPlan: existingSub.plan,
          newPlan: subscription.plan,
          updatedFields: Object.keys(updateData),
          adminEmail: req.user?.email,
        },
      });

      await logAdminAction(
        req.user?.email || 'admin@wonderfuljodi.com',
        'MEMBERSHIP_UPDATED',
        `Super Admin updated subscription ID: ${subscription._id} from ${existingSub.plan} to plan ${subscription.plan}`,
        'Subscription',
        String(subscription._id),
        {
          adminId: callerId,
          metadata: {
            previousPlan: existingSub.plan,
            newPlan: subscription.plan,
            updatedFields: Object.keys(updateData),
          },
        }
      );
    } catch (auditErr: any) {
      console.error(
        '[Membership] CRITICAL: Audit log persistence failed. Rolling back membership update:',
        auditErr?.message
      );
      // Revert subscription back to previous state to prevent unaudited state changes
      await Subscription.findByIdAndUpdate(req.params.id, { $set: previousSnapshot });
      return res.status(500).json({
        success: false,
        message: 'Failed to record administrative audit log. Membership update was rolled back for compliance.',
      });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}

/**
 * Super Admin-Only Manual Paid Membership Grant
 * Creates or extends an ACTIVE Subscription for candidate without fabricating fake payment transactions.
 * Strictly checks that caller is Super Admin. Records permanent audit trail in AuditLog.
 */
export async function grantMembershipBySuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 1. Strict Super Admin Authorization Gate
    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Super Administrators can manually grant paid memberships.',
      });
    }

    const { userId, planId, durationDays, durationMonths, grantReason, extendExisting } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Target User ID, Candidate ID, or email is required.' });
    }
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Membership Plan ID, name, or slug is required.' });
    }
    if (!grantReason || typeof grantReason !== 'string' || grantReason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'A detailed grant reason is required (minimum 5 characters) for audit trail compliance.',
      });
    }

    // 2. Validate Target User
    let targetUser = null;
    if (isValidObjectId(userId)) {
      targetUser = await User.findById(userId);
    }
    if (!targetUser) {
      const prof = await Profile.findOne({ candidateId: String(userId).trim() });
      if (prof) {
        targetUser = await User.findById(prof.userId || prof.user);
      } else {
        targetUser = await User.findOne({ email: String(userId).toLowerCase().trim() });
      }
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    if (targetUser.isDeleted) {
      return res.status(400).json({ success: false, message: 'Cannot grant membership to a deleted or deactivated user.' });
    }

    // 3. Validate Plan
    let plan: any = null;
    if (isValidObjectId(planId)) {
      plan = await MembershipPlan.findById(planId);
    }
    if (!plan) {
      plan = await MembershipPlan.findOne({
        $or: [
          { slug: String(planId).toLowerCase().trim() },
          { planId: String(planId).trim() },
          { key: String(planId).toUpperCase().trim() },
          { name: String(planId).trim() },
        ],
      });
    }
    if (!plan) {
      const fallbackPlans = [
        { name: 'Basic Doctor Connect', slug: 'basic-doctor-connect', durationDays: 30, contactRequestLimit: 15 },
        { name: 'Premium Match', slug: 'premium-match', durationDays: 180, contactRequestLimit: 60 },
        { name: 'Priority Matchmaking', slug: 'priority-matchmaking', durationDays: 180, contactRequestLimit: 120 },
        { name: 'Elite Assisted VIP', slug: 'elite-assisted-vip', durationDays: 365, contactRequestLimit: 300 },
      ];
      plan = fallbackPlans.find(
        (p) =>
          p.slug === String(planId).toLowerCase().trim() ||
          p.name.toLowerCase() === String(planId).toLowerCase().trim()
      );
    }

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Specified membership plan was not found.' });
    }

    // 4. Calculate Duration & Expiration
    let days = Number(durationDays);
    if (!days || isNaN(days) || days <= 0) {
      if (durationMonths && Number(durationMonths) > 0) {
        days = Number(durationMonths) * 30;
      } else {
        days = plan.durationDays || 30;
      }
    }

    const contactCredits = plan.contactRequestLimit || 30;
    const now = new Date();

    const existingActiveSub = await Subscription.findOne({
      user: targetUser._id,
      status: 'ACTIVE',
    });

    let subscription: any = null;
    let isExtended = false;

    if (existingActiveSub && (extendExisting === true || extendExisting === 'true')) {
      const baseDate =
        existingActiveSub.expiryDate && existingActiveSub.expiryDate > now
          ? existingActiveSub.expiryDate
          : now;
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      existingActiveSub.expiryDate = newExpiry;
      existingActiveSub.contactRequestsRemaining = (existingActiveSub.contactRequestsRemaining || 0) + contactCredits;
      existingActiveSub.paymentReference = `SUPERADMIN_MANUAL_GRANT_${req.user?.email || 'admin'}_${Date.now()}`;
      await existingActiveSub.save();
      subscription = existingActiveSub;
      isExtended = true;
    } else {
      if (existingActiveSub) {
        existingActiveSub.status = 'CANCELLED';
        await existingActiveSub.save();
      }

      const expiryDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      subscription = await Subscription.create({
        user: targetUser._id,
        userId: targetUser._id,
        plan: plan.name,
        planId: String(plan._id || plan.planId || plan.slug),
        status: 'ACTIVE',
        startDate: now,
        expiryDate,
        contactRequestsRemaining: contactCredits,
        contactRequestsUsed: 0,
        paymentReference: `SUPERADMIN_MANUAL_GRANT_${req.user?.email || 'admin'}_${Date.now()}`,
      });
    }

    // CRITICAL SECURITY & PAYMENT INTEGRITY:
    // Do NOT create any Payment record or bypass payment processor.
    // Manually granted plans must be clearly distinguished from verified paid transactions.

    // 5. Write Comprehensive Audit Log
    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'MEMBERSHIP_MANUALLY_GRANTED',
      `Super Admin manually granted ${plan.name} (${days} days) to user ${targetUser.email}. Reason: ${grantReason.trim()}`,
      'Subscription',
      String(subscription._id),
      {
        adminId: callerId,
        adminName: req.user?.fullName || req.user?.email,
        targetUserId: targetUser._id,
        reason: grantReason.trim(),
        metadata: {
          planName: plan.name,
          planId: plan._id || plan.slug,
          durationDays: days,
          expiryDate: subscription.expiryDate,
          contactCreditsGranted: contactCredits,
          isExtended,
          grantReason: grantReason.trim(),
          grantedBySuperAdmin: req.user?.email,
          manualGrant: true,
        },
      }
    );

    res.json({
      success: true,
      message: `Successfully ${isExtended ? 'extended' : 'granted'} ${plan.name} membership for ${targetUser.fullName || targetUser.email}.`,
      data: {
        subscriptionId: subscription._id,
        userId: targetUser._id,
        userEmail: targetUser.email,
        plan: plan.name,
        status: subscription.status,
        startDate: subscription.startDate,
        expiryDate: subscription.expiryDate,
        contactRequestsRemaining: subscription.contactRequestsRemaining,
        isExtended,
        paymentReference: subscription.paymentReference,
      },
    });
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
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    // Status filter query
    const baseQuery: any = {};
    if (status && status !== 'ALL') {
      if (status === 'DECLINED') {
        baseQuery.status = { $in: ['DECLINED', 'REJECTED'] };
      } else {
        baseQuery.status = status;
      }
    }

    // Compute status counts across all records for the tabs
    const [allCount, pendingCount, acceptedCount, declinedCount] = await Promise.all([
      Interest.countDocuments({}),
      Interest.countDocuments({ status: 'PENDING' }),
      Interest.countDocuments({ status: 'ACCEPTED' }),
      Interest.countDocuments({ status: { $in: ['DECLINED', 'REJECTED'] } }),
    ]);

    const counts = {
      ALL: allCount,
      PENDING: pendingCount,
      ACCEPTED: acceptedCount,
      DECLINED: declinedCount,
    };

    // If search term provided, find matching user / profile IDs first
    let userFilterQuery: any = baseQuery;
    if (search && String(search).trim()) {
      const searchStr = String(search).trim();
      const safeSearch = escapeRegex(searchStr);

      const [matchingUsers, matchingProfiles] = await Promise.all([
        User.find({
          $or: [
            { fullName: { $regex: safeSearch, $options: 'i' } },
            { email: { $regex: safeSearch, $options: 'i' } },
          ],
        })
          .select('_id')
          .lean(),
        Profile.find({
          $or: [
            { displayName: { $regex: safeSearch, $options: 'i' } },
            { profession: { $regex: safeSearch, $options: 'i' } },
            { city: { $regex: safeSearch, $options: 'i' } },
          ],
        })
          .select('user')
          .lean(),
      ]);

      const matchedUserIds = [
        ...matchingUsers.map((u: any) => u._id),
        ...matchingProfiles.map((p: any) => p.user),
      ];

      userFilterQuery = {
        ...baseQuery,
        $or: [
          { sender: { $in: matchedUserIds } },
          { receiver: { $in: matchedUserIds } },
        ],
      };
    }

    const sortOption: any = {};
    const sortField = sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt';
    sortOption[sortField] = sortOrder === 'asc' ? 1 : -1;

    const [total, rawInterests] = await Promise.all([
      Interest.countDocuments(userFilterQuery),
      Interest.find(userFilterQuery)
        .populate('sender', 'fullName email mobile')
        .populate('receiver', 'fullName email mobile')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber)
        .lean(),
    ]);

    const userIds = [
      ...rawInterests.map((i: any) => i.sender?._id),
      ...rawInterests.map((i: any) => i.receiver?._id || (i as any).recipient?._id),
    ].filter(Boolean);

    const profiles = await Profile.find({ user: { $in: userIds } })
      .select('user displayName profession city primaryPhoto photos verificationStatus')
      .lean();

    const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));

    const interests = rawInterests.map((i: any) => {
      const sProf = profileMap.get(String(i.sender?._id));
      const rUser = i.receiver || (i as any).recipient;
      const rProf = profileMap.get(String(rUser?._id));

      return {
        ...i,
        sender: i.sender
          ? {
              ...i.sender,
              displayName: sProf?.displayName || i.sender.fullName,
              profession: sProf?.profession,
              city: sProf?.city,
              primaryPhoto: sProf?.primaryPhoto || sProf?.photos?.[0],
              verificationStatus: sProf?.verificationStatus,
            }
          : null,
        recipient: rUser
          ? {
              ...rUser,
              displayName: rProf?.displayName || rUser.fullName,
              profession: rProf?.profession,
              city: rProf?.city,
              primaryPhoto: rProf?.primaryPhoto || rProf?.photos?.[0],
              verificationStatus: rProf?.verificationStatus,
            }
          : null,
        receiver: rUser
          ? {
              ...rUser,
              displayName: rProf?.displayName || rUser.fullName,
              profession: rProf?.profession,
              city: rProf?.city,
              primaryPhoto: rProf?.primaryPhoto || rProf?.photos?.[0],
              verificationStatus: rProf?.verificationStatus,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: {
        interests,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber) || 1,
        },
        counts,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInterestStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid match interest ID format' });
    }

    const validStatuses = ['PENDING', 'ACCEPTED', 'DECLINED', 'REJECTED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const interest = await Interest.findById(id);
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Match interest not found' });
    }

    const oldStatus = interest.status;
    interest.status = status;
    await interest.save();

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'INTEREST_STATUS_UPDATED',
      `Updated interest ${id} status from ${oldStatus} to ${status}`,
      'Interest',
      String(id)
    );

    const populated = await Interest.findById(id)
      .populate('sender', 'fullName email mobile')
      .populate('receiver', 'fullName email mobile')
      .lean();

    res.json({
      success: true,
      message: `Interest status successfully changed to ${status}`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getShortlists(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      profession,
      city,
      community,
      verification,
      from,
      to,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    const query: any = {};

    // 1. Date Range Filter
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const fromDate = new Date(from as string);
        if (!isNaN(fromDate.getTime())) query.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to as string);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = toDate;
        }
      }
    }

    // 2. Profile-specific Filters (profession, city, community, verification)
    const profileConditions: any = {};
    if (profession && profession !== 'ALL') {
      profileConditions.profession = new RegExp(`^${String(profession).trim()}$`, 'i');
    }
    if (city && city !== 'ALL') {
      profileConditions.city = new RegExp(`^${String(city).trim()}$`, 'i');
    }
    if (community && community !== 'ALL') {
      const commStr = String(community).trim();
      profileConditions.$or = [
        { religion: new RegExp(`^${commStr}$`, 'i') },
        { caste: new RegExp(`^${commStr}$`, 'i') },
      ];
    }
    if (verification && verification !== 'ALL') {
      profileConditions.verificationStatus = String(verification).trim();
    }

    // 3. Search Query handling across User (name, email, mobile) and Profile (name, profession, city, religion)
    if (search && String(search).trim() !== '') {
      const searchRegex = new RegExp(String(search).trim(), 'i');

      const [matchingUsers, matchingProfiles] = await Promise.all([
        User.find({
          $or: [{ fullName: searchRegex }, { email: searchRegex }, { mobile: searchRegex }],
        }).select('_id'),
        Profile.find({
          $and: [
            profileConditions,
            {
              $or: [
                { displayName: searchRegex },
                { profession: searchRegex },
                { city: searchRegex },
                { religion: searchRegex },
                { caste: searchRegex },
              ],
            },
          ],
        }).select('_id'),
      ]);

      const userIds = matchingUsers.map((u) => u._id);
      const profileIds = matchingProfiles.map((p) => p._id);

      query.$or = [
        { user: { $in: userIds } },
        { profile: { $in: profileIds } },
      ];
    } else if (Object.keys(profileConditions).length > 0) {
      const matchingProfiles = await Profile.find(profileConditions).select('_id');
      const profileIds = matchingProfiles.map((p) => p._id);
      query.profile = { $in: profileIds };
    }

    // 4. Sorting logic
    const sortOption: any = {};
    const sortField = String(sortBy);
    if (['createdAt', 'updatedAt'].includes(sortField)) {
      sortOption[sortField] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOption.createdAt = -1;
    }

    // 5. Query execution with pagination
    const [total, rawShortlists, filterProfessions, filterCities, filterReligions] = await Promise.all([
      Shortlist.countDocuments(query),
      Shortlist.find(query)
        .populate({
          path: 'user',
          select: 'fullName email mobile verificationStatus isActive createdAt',
        })
        .populate({
          path: 'profile',
          select:
            'displayName gender dob education degree profession company annualIncome city state country religion caste subCaste primaryPhoto photos verificationStatus maritalStatus height motherTongue about',
        })
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Profile.distinct('profession'),
      Profile.distinct('city'),
      Profile.distinct('religion'),
    ]);

    // 6. Fetch bookmarker profiles for photos & avatars
    const bookmarkerUserIds = rawShortlists.map((s: any) => s.user?._id).filter(Boolean);
    const bookmarkerProfiles = await Profile.find({ user: { $in: bookmarkerUserIds } })
      .select('user primaryPhoto photos displayName')
      .lean();
    const bookmarkerProfileMap = new Map(bookmarkerProfiles.map((p: any) => [String(p.user), p]));

    const shortlists = rawShortlists.map((item: any) => {
      const bProf = bookmarkerProfileMap.get(String(item.user?._id));
      return {
        _id: item._id,
        user: item.user
          ? {
              _id: item.user._id,
              fullName: item.user.fullName,
              email: item.user.email,
              mobile: item.user.mobile,
              verificationStatus: item.user.verificationStatus,
              isActive: item.user.isActive,
              photo: bProf?.primaryPhoto || bProf?.photos?.[0] || null,
            }
          : null,
        shortlistedProfile: item.profile
          ? {
              _id: item.profile._id,
              displayName: item.profile.displayName,
              gender: item.profile.gender,
              dob: item.profile.dob,
              height: item.profile.height,
              education: item.profile.education,
              degree: item.profile.degree,
              profession: item.profile.profession,
              company: item.profile.company,
              annualIncome: item.profile.annualIncome,
              city: item.profile.city,
              state: item.profile.state,
              country: item.profile.country,
              religion: item.profile.religion,
              caste: item.profile.caste,
              subCaste: item.profile.subCaste,
              motherTongue: item.profile.motherTongue,
              primaryPhoto: item.profile.primaryPhoto || item.profile.photos?.[0],
              photos: item.profile.photos || [],
              verificationStatus: item.profile.verificationStatus,
              maritalStatus: item.profile.maritalStatus,
              about: item.profile.about,
            }
          : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    res.json({
      success: true,
      data: {
        shortlists,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber) || 1,
        },
        filters: {
          professions: filterProfessions.filter(Boolean).sort(),
          cities: filterCities.filter(Boolean).sort(),
          religions: filterReligions.filter(Boolean).sort(),
        },
        stats: {
          totalShortlists: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteShortlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid shortlist ID format' });
    }

    const shortlist = await Shortlist.findById(id);
    if (!shortlist) {
      return res.status(404).json({ success: false, message: 'Shortlist bookmark not found' });
    }

    await Shortlist.findByIdAndDelete(id);

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'SHORTLIST_DELETED',
      `Deleted shortlist relation ${id} for user ${shortlist.user}`,
      'Shortlist',
      String(id)
    );

    res.json({
      success: true,
      message: 'Shortlist bookmark successfully removed',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      compliance,
      search,
      sortBy = 'lastActivityAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    const baseQuery: any = {};
    if (status && status !== 'ALL') {
      baseQuery.status = status;
    }
    if (compliance && compliance !== 'ALL') {
      baseQuery.complianceStatus = compliance;
    }

    // Search query on participant names/emails/professions
    let query = baseQuery;
    if (search && String(search).trim()) {
      const searchStr = String(search).trim();
      const safeSearch = escapeRegex(searchStr);

      const [matchingUsers, matchingProfiles] = await Promise.all([
        User.find({
          $or: [
            { fullName: { $regex: safeSearch, $options: 'i' } },
            { email: { $regex: safeSearch, $options: 'i' } },
          ],
        })
          .select('_id')
          .lean(),
        Profile.find({
          $or: [
            { displayName: { $regex: safeSearch, $options: 'i' } },
            { profession: { $regex: safeSearch, $options: 'i' } },
            { city: { $regex: safeSearch, $options: 'i' } },
          ],
        })
          .select('user')
          .lean(),
      ]);

      const matchedUserIds = [
        ...matchingUsers.map((u: any) => u._id),
        ...matchingProfiles.map((p: any) => p.user),
      ];

      query = {
        ...baseQuery,
        participants: { $in: matchedUserIds },
      };
    }

    // Sorting
    const sortOption: any = {};
    const validSortFields: Record<string, string> = {
      lastActivityAt: 'lastActivityAt',
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      messageCount: 'messageCount',
    };
    const field = validSortFields[String(sortBy)] || 'lastActivityAt';
    sortOption[field] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [totalConversations, totalMessages, rawConversations, flaggedThreads, flaggedMessages] = await Promise.all([
      Conversation.countDocuments(query),
      Message.countDocuments(),
      Conversation.find(query)
        .populate('participants', 'fullName email mobile role verificationStatus')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Conversation.countDocuments({ complianceStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] } }),
      Message.countDocuments({ moderationStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] } }),
    ]);

    // Fetch participant profile details (avatar, profession, city, etc.)
    const allParticipantIds = rawConversations
      .flatMap((c: any) => c.participants || [])
      .map((p: any) => p?._id)
      .filter(Boolean);

    const profiles = await Profile.find({ user: { $in: allParticipantIds } })
      .select('user displayName profession city primaryPhoto photos verificationStatus')
      .lean();

    const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));

    const conversations = rawConversations.map((conv: any) => {
      const enrichedParticipants = (conv.participants || []).map((user: any) => {
        const prof = profileMap.get(String(user._id));
        return {
          ...user,
          displayName: prof?.displayName || user.fullName,
          profession: prof?.profession,
          city: prof?.city,
          primaryPhoto: prof?.primaryPhoto || prof?.photos?.[0],
          verificationStatus: prof?.verificationStatus || user.verificationStatus,
        };
      });

      return {
        ...conv,
        participants: enrichedParticipants,
        participant1: enrichedParticipants[0] || null,
        participant2: enrichedParticipants[1] || null,
        messageCount: conv.messageCount || 0,
        lastActivityAt: conv.lastActivityAt || conv.updatedAt || conv.createdAt,
        complianceStatus: conv.complianceStatus || 'SAFE',
        status: conv.status || 'ACTIVE',
      };
    });

    const stats = {
      totalThreads: totalConversations,
      totalMessages,
      activeThreads: await Conversation.countDocuments({ status: 'ACTIVE' }),
      flaggedThreads,
      flaggedMessages,
    };

    res.json({
      success: true,
      data: {
        conversations,
        totalConversations,
        totalMessages,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalConversations,
          totalPages: Math.ceil(totalConversations / limitNumber) || 1,
        },
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversationMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(id)
      .populate('participants', 'fullName email mobile role verificationStatus')
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation thread not found' });
    }

    // Enrich conversation participants with profiles
    const conv = conversation as any;
    const participantIds = (conv?.participants || []).map((p: any) => p._id);
    const profiles = await Profile.find({ user: { $in: participantIds } })
      .select('user displayName profession city primaryPhoto photos verificationStatus')
      .lean();

    const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));

    const enrichedParticipants = (conv?.participants || []).map((user: any) => {
      const prof = profileMap.get(String(user._id));
      return {
        ...user,
        displayName: prof?.displayName || user.fullName,
        profession: prof?.profession,
        city: prof?.city,
        primaryPhoto: prof?.primaryPhoto || prof?.photos?.[0],
      };
    });

    // Fetch chronological messages
    const rawMessages = await Message.find({ conversation: id })
      .populate('sender', 'fullName email mobile')
      .populate('receiver', 'fullName email mobile')
      .sort({ createdAt: 1 })
      .lean();

    const messages = rawMessages.map((msg: any) => {
      const sProf = profileMap.get(String(msg.sender?._id));
      const rProf = profileMap.get(String(msg.receiver?._id));

      return {
        ...msg,
        sender: msg.sender
          ? {
              ...msg.sender,
              displayName: sProf?.displayName || msg.sender.fullName,
              primaryPhoto: sProf?.primaryPhoto || sProf?.photos?.[0],
            }
          : null,
        receiver: msg.receiver
          ? {
              ...msg.receiver,
              displayName: rProf?.displayName || msg.receiver.fullName,
              primaryPhoto: rProf?.primaryPhoto || rProf?.photos?.[0],
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: {
        conversation: {
          ...conversation,
          participants: enrichedParticipants,
          participant1: enrichedParticipants[0] || null,
          participant2: enrichedParticipants[1] || null,
        },
        messages,
        totalMessages: messages.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateConversationStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, complianceStatus } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const updateFields: any = {};
    if (status) {
      const validStatuses = ['ACTIVE', 'FLAGGED', 'BLOCKED', 'ARCHIVED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      updateFields.status = status;
    }

    if (complianceStatus) {
      const validCompliance = ['SAFE', 'FLAGGED', 'UNDER_REVIEW', 'BLOCKED'];
      if (!validCompliance.includes(complianceStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid compliance status. Must be one of: ${validCompliance.join(', ')}`,
        });
      }
      updateFields.complianceStatus = complianceStatus;
    }

    const conversation = await Conversation.findByIdAndUpdate(id, updateFields, { new: true })
      .populate('participants', 'fullName email')
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation thread not found' });
    }

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'CONVERSATION_MODERATED',
      `Updated conversation ${id} status: ${status || 'unchanged'}, compliance: ${complianceStatus || 'unchanged'}`,
      'Conversation',
      String(id)
    );

    res.json({
      success: true,
      message: 'Conversation moderation status successfully updated',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMessageStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [totalThreads, totalMessages, activeThreads, flaggedThreads, flaggedMessages] = await Promise.all([
      Conversation.countDocuments(),
      Message.countDocuments(),
      Conversation.countDocuments({ status: 'ACTIVE' }),
      Conversation.countDocuments({ complianceStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] } }),
      Message.countDocuments({ moderationStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] } }),
    ]);

    res.json({
      success: true,
      data: {
        totalThreads,
        totalMessages,
        activeThreads,
        flaggedThreads,
        flaggedMessages,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMessageModeration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { moderationStatus, flaggedReason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    const validStatuses = ['SAFE', 'FLAGGED', 'UNDER_REVIEW', 'BLOCKED'];
    if (!validStatuses.includes(moderationStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid moderation status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updateFields: any = {
      moderationStatus,
      moderatedAt: new Date(),
    };

    if (moderationStatus === 'SAFE') {
      updateFields.flaggedReason = 'Marked safe by admin reviewer';
      updateFields.moderationCategory = 'NONE';
      updateFields.moderationConfidence = 'NONE';
      updateFields.moderationScore = 0;
    } else if (flaggedReason) {
      updateFields.flaggedReason = flaggedReason;
    }

    const message = await Message.findByIdAndUpdate(id, updateFields, { new: true });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Recalculate conversation compliance status
    const remainingFlaggedCount = await Message.countDocuments({
      conversation: message.conversation,
      moderationStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] },
    });

    let newConvCompliance = 'SAFE';
    if (remainingFlaggedCount > 0) {
      const hasBlocked = (await Message.countDocuments({ conversation: message.conversation, moderationStatus: 'BLOCKED' })) > 0;
      newConvCompliance = hasBlocked ? 'BLOCKED' : 'FLAGGED';
    }

    await Conversation.findByIdAndUpdate(message.conversation, {
      complianceStatus: newConvCompliance,
    });

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'MESSAGE_MODERATED',
      `Updated message ${id} status to ${moderationStatus}. Remaining flagged: ${remainingFlaggedCount}`,
      'Message',
      String(id)
    );

    res.json({
      success: true,
      message: `Message marked as ${moderationStatus}`,
      data: {
        message,
        conversationComplianceStatus: newConvCompliance,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function simulateCompliance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { message } = req.body;
    const content = String(message || '');
    const result = detectCompliance(content);

    res.json({
      success: true,
      data: {
        input: content,
        ...result,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function sendDemoSeedMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId, content } = req.body;

    if (!conversationId || !isValidObjectId(conversationId)) {
      return res.status(400).json({ success: false, message: 'Valid conversation ID is required' });
    }

    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.participants.length < 2) {
      return res.status(404).json({ success: false, message: 'Conversation not found or insufficient participants' });
    }

    const senderId = conversation.participants[0];
    const receiverId = conversation.participants[1];

    const cleanContent = String(content).trim();
    const complianceResult = detectCompliance(cleanContent);

    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content: cleanContent,
      read: false,
      moderationStatus: complianceResult.status,
      moderationCategory: complianceResult.category,
      moderationConfidence: complianceResult.confidence,
      moderationScore: complianceResult.score,
      flaggedReason: complianceResult.reason,
      moderatedAt: new Date(),
    });

    const convUpdates: any = {
      lastMessage: cleanContent,
      lastActivityAt: new Date(),
      $inc: { messageCount: 1 },
    };

    if (complianceResult.status === 'FLAGGED') {
      convUpdates.complianceStatus = 'FLAGGED';
    }

    const updatedConv = await Conversation.findByIdAndUpdate(conversation._id, convUpdates, { new: true });

    res.status(201).json({
      success: true,
      message: 'Demo test message sent and compliance evaluated successfully',
      data: {
        message,
        compliance: complianceResult,
        conversation: updatedConv,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function resetDemoTestMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Only clean synthetic test messages that contain phone numbers or direct contact attempts in demo conversations
    const syntheticMessages = await Message.find({
      $or: [
        { content: { $regex: /(?:98765|call me|whatsapp me|contact me|my number)/i } },
        { moderationStatus: 'FLAGGED' },
      ],
    });

    const deletedCount = syntheticMessages.length;
    
    // Remove these synthetic test messages
    await Message.deleteMany({
      _id: { $in: syntheticMessages.map((m) => m._id) },
    });

    // Recalculate message counts and compliance statuses for all conversations
    const allConversations = await Conversation.find();
    for (const conv of allConversations) {
      const msgs = await Message.find({ conversation: conv._id }).sort({ createdAt: 1 });
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].content : '';
      const hasFlagged = msgs.some((m) => m.moderationStatus === 'FLAGGED' || m.moderationStatus === 'BLOCKED');

      await Conversation.findByIdAndUpdate(conv._id, {
        messageCount: msgs.length,
        lastMessage: lastMsg,
        complianceStatus: hasFlagged ? 'FLAGGED' : 'SAFE',
      });
    }

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'DEMO_DATA_RESET',
      `Safely cleaned ${deletedCount} synthetic simulation messages from test conversations`,
      'Message'
    );

    res.json({
      success: true,
      message: `Safely reset synthetic demo messages. Cleaned ${deletedCount} test records.`,
      data: { deletedCount },
    });
  } catch (error) {
    next(error);
  }
}

// 8. Safety & Abuse Moderation Reports
export async function getReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      reason,
      from,
      to,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    const query: any = {};

    // 1. Status filter
    if (status && status !== 'ALL') {
      if (status === 'DISMISSED') {
        query.status = { $in: ['DISMISSED', 'REJECTED'] };
      } else {
        query.status = status;
      }
    }

    // 2. Reason filter
    if (reason && reason !== 'ALL') {
      query.reason = new RegExp(`^${String(reason).trim()}$`, 'i');
    }

    // 3. Date Range Filter
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const fromDate = new Date(from as string);
        if (!isNaN(fromDate.getTime())) query.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to as string);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = toDate;
        }
      }
    }

    // 4. Search Query handling across Reporter, Reported User, Reason, and Details
    if (search && String(search).trim() !== '') {
      const searchRegex = new RegExp(String(search).trim(), 'i');

      const [matchingUsers, matchingProfiles] = await Promise.all([
        User.find({
          $or: [{ fullName: searchRegex }, { email: searchRegex }, { mobile: searchRegex }],
        }).select('_id'),
        Profile.find({
          displayName: searchRegex,
        }).select('user'),
      ]);

      const userIdsFromUsers = matchingUsers.map((u) => u._id);
      const userIdsFromProfiles = matchingProfiles.map((p) => p.user);
      const allMatchingUserIds = Array.from(new Set([...userIdsFromUsers, ...userIdsFromProfiles]));

      query.$or = [
        { reporter: { $in: allMatchingUserIds } },
        { reportedUser: { $in: allMatchingUserIds } },
        { reason: searchRegex },
        { details: searchRegex },
        { description: searchRegex },
      ];
    }

    // 5. Sorting logic
    const sortOption: any = {};
    const sortField = String(sortBy);
    if (['createdAt', 'updatedAt', 'status', 'reason'].includes(sortField)) {
      sortOption[sortField] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOption.createdAt = -1;
    }

    // 6. Execute count, paginated query, status tabs count, and distinct reasons
    const [total, rawReports, allCount, pendingCount, resolvedCount, dismissedCount, distinctReasons] =
      await Promise.all([
        Report.countDocuments(query),
        Report.find(query)
          .populate('reporter', 'fullName email mobile verificationStatus isActive')
          .populate('reportedUser', 'fullName email mobile verificationStatus isActive')
          .populate('moderator', 'fullName email')
          .sort(sortOption)
          .skip(skip)
          .limit(limitNumber)
          .lean(),
        Report.countDocuments(),
        Report.countDocuments({ status: 'PENDING' }),
        Report.countDocuments({ status: 'RESOLVED' }),
        Report.countDocuments({ status: { $in: ['DISMISSED', 'REJECTED'] } }),
        Report.distinct('reason'),
      ]);

    // 7. Fetch Profiles for all involved users (reporters and reported users) to show photos & rich profiles
    const userIdsToLookup = [
      ...rawReports.map((r: any) => r.reporter?._id),
      ...rawReports.map((r: any) => r.reportedUser?._id),
    ].filter(Boolean);

    const profiles = await Profile.find({ user: { $in: userIdsToLookup } })
      .select(
        'user displayName gender dob height profession company annualIncome education degree city state country religion caste primaryPhoto photos verificationStatus about maritalStatus'
      )
      .lean();

    const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));

    const reports = rawReports.map((item: any) => {
      const repProf = profileMap.get(String(item.reporter?._id));
      const targetProf = profileMap.get(String(item.reportedUser?._id));

      const normalizedStatus = item.status === 'REJECTED' ? 'DISMISSED' : item.status;

      return {
        _id: item._id,
        reporter: item.reporter
          ? {
              _id: item.reporter._id,
              fullName: item.reporter.fullName,
              email: item.reporter.email,
              mobile: item.reporter.mobile,
              verificationStatus: item.reporter.verificationStatus,
              photo: repProf?.primaryPhoto || repProf?.photos?.[0] || null,
              profile: repProf ? { _id: repProf._id, displayName: repProf.displayName } : null,
            }
          : null,
        reportedUser: item.reportedUser
          ? {
              _id: item.reportedUser._id,
              fullName: item.reportedUser.fullName,
              email: item.reportedUser.email,
              mobile: item.reportedUser.mobile,
              verificationStatus: item.reportedUser.verificationStatus,
              isActive: item.reportedUser.isActive,
              photo: targetProf?.primaryPhoto || targetProf?.photos?.[0] || null,
              profile: targetProf
                ? {
                    _id: targetProf._id,
                    displayName: targetProf.displayName,
                    gender: targetProf.gender,
                    dob: targetProf.dob,
                    height: targetProf.height,
                    profession: targetProf.profession,
                    company: targetProf.company,
                    annualIncome: targetProf.annualIncome,
                    education: targetProf.education,
                    degree: targetProf.degree,
                    city: targetProf.city,
                    state: targetProf.state,
                    country: targetProf.country,
                    religion: targetProf.religion,
                    caste: targetProf.caste,
                    primaryPhoto: targetProf.primaryPhoto || targetProf.photos?.[0],
                    photos: targetProf.photos || [],
                    verificationStatus: targetProf.verificationStatus,
                    maritalStatus: targetProf.maritalStatus,
                    about: targetProf.about,
                  }
                : null,
            }
          : null,
        reason: item.reason,
        details: item.details || item.description || '',
        description: item.description || item.details || '',
        status: normalizedStatus,
        moderator: item.moderator
          ? {
              _id: item.moderator._id,
              fullName: item.moderator.fullName,
              email: item.moderator.email,
            }
          : null,
        resolutionNotes: item.resolutionNotes || '',
        actionTaken:
          item.actionTaken ||
          (normalizedStatus === 'RESOLVED' ? 'RESOLVED' : normalizedStatus === 'DISMISSED' ? 'DISMISSED' : 'NONE'),
        targetType: item.targetType || 'PROFILE',
        messageSnippet: item.messageSnippet || '',
        resolvedAt: item.resolvedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    // 8. Group reports by reported profile/user for unified safety view
    profiles.forEach((p: any) => {
      if (p.user) profileMap.set(String(p.user), p);
      if (p._id) profileMap.set(String(p._id), p);
    });

    const groupedMap = new Map<string, any>();
    for (const r of reports) {
      const repUserId = r.reportedUser?._id ? String(r.reportedUser._id) : 'unknown';
      if (!groupedMap.has(repUserId)) {
        const targetProf = profileMap.get(repUserId) || null;
        const profStatus =
          targetProf?.status ||
          (r.reportedUser?.isActive === false ? 'Suspended' : 'Active');

        const doctorName = targetProf?.displayName || r.reportedUser?.fullName || 'Doctor Profile';
        const profilePhoto =
          targetProf?.primaryPhoto ||
          (targetProf?.photos && targetProf.photos[0]) ||
          (r.reportedUser as any)?.photo ||
          null;
        const profileId = targetProf?._id ? String(targetProf._id) : repUserId;

        groupedMap.set(repUserId, {
          userId: repUserId,
          profileId,
          doctorName,
          email: r.reportedUser?.email || '',
          mobile: r.reportedUser?.mobile || '',
          education: targetProf?.education || targetProf?.degree || '',
          profession: targetProf?.profession || '',
          city: targetProf?.city || '',
          profilePhoto,
          reportedUser: r.reportedUser || null,
          profile: targetProf,
          profileStatus: profStatus,
          reports: [],
          totalReports: 0,
          pendingReports: 0,
          underReviewReports: 0,
          resolvedReports: 0,
          dismissedReports: 0,
          latestReportDate: r.createdAt,
          overallReportStatus: 'PENDING',
          overallStatus: 'PENDING',
          reasonsSummary: [],
        });
      }

      const grp = groupedMap.get(repUserId);
      grp.reports.push(r);
      grp.totalReports++;
      if (r.reason && !grp.reasonsSummary.includes(r.reason)) {
        grp.reasonsSummary.push(r.reason);
      }
      if (r.status === 'PENDING') grp.pendingReports++;
      else if (r.status === 'UNDER_REVIEW') grp.underReviewReports++;
      else if (r.status === 'RESOLVED') grp.resolvedReports++;
      else if (r.status === 'DISMISSED' || r.status === 'REJECTED') grp.dismissedReports++;

      if (new Date(r.createdAt) > new Date(grp.latestReportDate)) {
        grp.latestReportDate = r.createdAt;
      }
    }

    // Determine overall status for each grouped profile
    for (const grp of groupedMap.values()) {
      if (grp.pendingReports > 0) {
        grp.overallReportStatus = 'PENDING';
        grp.overallStatus = 'PENDING';
      } else if (grp.underReviewReports > 0) {
        grp.overallReportStatus = 'UNDER_REVIEW';
        grp.overallStatus = 'UNDER_REVIEW';
      } else if (grp.resolvedReports > 0) {
        grp.overallReportStatus = 'RESOLVED';
        grp.overallStatus = 'RESOLVED';
      } else {
        grp.overallReportStatus = 'DISMISSED';
        grp.overallStatus = 'DISMISSED';
      }
    }

    const groupedProfiles = Array.from(groupedMap.values());

    // 9. Extra safety counts
    const [underReviewCount, multiReportProfilesAgg, suspendedCount, blockedCount] = await Promise.all([
      Report.countDocuments({ status: 'UNDER_REVIEW' }),
      Report.aggregate([
        { $group: { _id: '$reportedUser', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'multiCount' },
      ]),
      Profile.countDocuments({ status: 'Suspended' }),
      Profile.countDocuments({ status: 'Blocked' }),
    ]);

    const profilesWithMultipleReports = multiReportProfilesAgg[0]?.multiCount || 0;

    res.json({
      success: true,
      data: {
        reports,
        groupedProfiles,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber) || 1,
        },
        counts: {
          ALL: allCount,
          PENDING: pendingCount,
          UNDER_REVIEW: underReviewCount,
          RESOLVED: resolvedCount,
          DISMISSED: dismissedCount,
          multiReports: profilesWithMultipleReports,
          suspended: suspendedCount,
          blocked: blockedCount,
        },
        filters: {
          reasons: distinctReasons.filter(Boolean).sort(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getReportById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format' });
    }

    const report = await Report.findById(id)
      .populate('reporter', 'fullName email mobile verificationStatus isActive')
      .populate('reportedUser', 'fullName email mobile verificationStatus isActive')
      .populate('moderator', 'fullName email')
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const rep = report as any;
    const [reporterProf, targetProf] = await Promise.all([
      Profile.findOne({ user: rep.reporter?._id }).lean(),
      Profile.findOne({ user: rep.reportedUser?._id }).lean(),
    ]);

    const normalizedStatus = rep.status === 'REJECTED' ? 'DISMISSED' : rep.status;

    res.json({
      success: true,
      data: {
        ...rep,
        status: normalizedStatus,
        reporter: rep.reporter
          ? {
              ...rep.reporter,
              photo: (reporterProf as any)?.primaryPhoto || (reporterProf as any)?.photos?.[0] || null,
            }
          : null,
        reportedUser: rep.reportedUser
          ? {
              ...rep.reportedUser,
              photo: (targetProf as any)?.primaryPhoto || (targetProf as any)?.photos?.[0] || null,
              profile: targetProf,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getReportsByProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params;
    if (!isValidObjectId(profileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID format' });
    }

    // Resolve profile and user
    let profile: any = await Profile.findById(profileId).lean();
    let targetUserId: any = profile?.user;

    if (!profile) {
      // Check if profileId is actually a user ID
      const user: any = await User.findById(profileId).lean();
      if (user) {
        targetUserId = user._id;
        profile = (await Profile.findOne({ user: user._id }).lean()) as any;
      }
    }

    if (!targetUserId) {
      return res.status(404).json({ success: false, message: 'Profile or User not found' });
    }

    const [reports, targetUser, auditLogs] = await Promise.all([
      Report.find({ reportedUser: targetUserId })
        .populate('reporter', 'fullName email mobile verificationStatus isActive')
        .populate('moderator', 'fullName email')
        .sort({ createdAt: -1 })
        .lean(),
      User.findById(targetUserId).select('-password').lean(),
      AuditLog.find({
        $or: [
          { targetProfileId: profile?._id },
          { targetUserId: targetUserId },
          { targetId: String(profile?._id) },
          { targetId: String(targetUserId) },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        profile,
        user: targetUser,
        reports,
        auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateReportStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes, adminNotes, actionTaken } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const prevStatus = report.status;
    const cleanStatus = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'REJECTED', 'ACTION_TAKEN'].includes(
      status
    )
      ? status
      : 'UNDER_REVIEW';

    report.status = cleanStatus;
    report.moderator = (req.user?.userId || (req.user as any)?._id) as any;
    report.handledByAdminId = report.moderator;
    report.resolutionNotes = (notes || adminNotes || report.resolutionNotes || '').trim();
    report.adminNotes = report.resolutionNotes;

    if (cleanStatus === 'RESOLVED' || cleanStatus === 'DISMISSED') {
      report.resolvedAt = new Date();
    }
    if (actionTaken) {
      report.actionTaken = actionTaken;
    }

    await report.save();

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'REPORT_STATUS_UPDATED',
      `Updated report ID: ${report._id} status to ${cleanStatus}. Notes: ${report.adminNotes || 'None'}`,
      'Report',
      String(report._id),
      {
        adminId: req.user?.userId,
        adminName: (req.user as any)?.fullName || req.user?.email,
        targetUserId: report.reportedUser,
        targetProfileId: report.reportedProfile,
        previousStatus: prevStatus,
        newStatus: cleanStatus,
        reason: report.adminNotes,
        relatedReportId: report._id,
      }
    );

    res.json({
      success: true,
      message: `Report marked as ${cleanStatus}.`,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

export async function resolveReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { notes, resolutionNotes, actionTaken } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'RESOLVED';
    report.resolutionNotes = (resolutionNotes || notes || '').trim();
    report.adminNotes = report.resolutionNotes;
    report.moderator = (req.user?.userId || (req.user as any)?._id) as any;
    report.handledByAdminId = report.moderator;
    report.resolvedAt = new Date();
    report.actionTaken = actionTaken || 'RESOLVED';
    await report.save();

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'REPORT_RESOLVED',
      `Resolved abuse report ID: ${report._id}. Notes: ${report.resolutionNotes || 'No notes provided'}`,
      'Report',
      String(report._id),
      {
        adminId: req.user?.userId,
        adminName: (req.user as any)?.fullName || req.user?.email,
        targetUserId: report.reportedUser,
        targetProfileId: report.reportedProfile,
        previousStatus: 'PENDING',
        newStatus: 'RESOLVED',
        reason: report.resolutionNotes,
        relatedReportId: report._id,
      }
    );

    res.json({
      success: true,
      message: 'Report has been marked as RESOLVED and moderation action recorded.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

export async function dismissReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { notes, resolutionNotes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'DISMISSED';
    report.resolutionNotes = (resolutionNotes || notes || '').trim();
    report.adminNotes = report.resolutionNotes;
    report.moderator = (req.user?.userId || (req.user as any)?._id) as any;
    report.handledByAdminId = report.moderator;
    report.resolvedAt = new Date();
    report.actionTaken = 'DISMISSED';
    await report.save();

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'REPORT_DISMISSED',
      `Dismissed abuse report ID: ${report._id}. Reason: ${report.resolutionNotes || 'Deemed non-violating'}`,
      'Report',
      String(report._id),
      {
        adminId: req.user?.userId,
        adminName: (req.user as any)?.fullName || req.user?.email,
        targetUserId: report.reportedUser,
        targetProfileId: report.reportedProfile,
        previousStatus: 'PENDING',
        newStatus: 'DISMISSED',
        reason: report.resolutionNotes,
        relatedReportId: report._id,
      }
    );

    res.json({
      success: true,
      message: 'Report has been dismissed as non-violating.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

export async function blockUserFromReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const targetUser = await User.findById(report.reportedUser);
    if (targetUser) {
      targetUser.isActive = false;
      targetUser.status = 'Blocked';
      await targetUser.save();
    }

    const targetProfile = await Profile.findOne({ user: report.reportedUser });
    if (targetProfile) {
      targetProfile.status = 'Blocked';
      const blockNote = {
        note: `Profile blocked following report: ${reason || 'Member report'}`,
        adminId: (req.user?.userId || (req.user as any)?._id) as any,
        adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
        adminName: (req.user as any)?.fullName || req.user?.email || 'Admin',
        createdAt: new Date(),
      };
      if (Array.isArray(targetProfile.adminNotes)) {
        targetProfile.adminNotes.push(blockNote);
      } else {
        targetProfile.adminNotes = [blockNote];
      }
      await targetProfile.save();
    }

    report.status = 'RESOLVED';
    report.actionTaken = 'ACCOUNT_BLOCKED';
    report.resolutionNotes = (notes || reason || `Account suspended due to report: ${report.reason}`).trim();
    report.adminNotes = report.resolutionNotes;
    report.moderator = (req.user?.userId || (req.user as any)?._id) as any;
    report.handledByAdminId = report.moderator;
    report.resolvedAt = new Date();
    await report.save();

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'USER_BLOCKED_VIA_REPORT',
      `Blocked user ${report.reportedUser} following report ${report._id}`,
      'User',
      String(report.reportedUser),
      {
        adminId: req.user?.userId,
        adminName: (req.user as any)?.fullName || req.user?.email,
        targetUserId: report.reportedUser,
        targetProfileId: targetProfile?._id,
        previousStatus: 'Active',
        newStatus: 'Blocked',
        reason: report.resolutionNotes,
        relatedReportId: report._id,
      }
    );

    // Send notification to blocked user (without exposing reporter)
    await Notification.create({
      user: report.reportedUser,
      type: 'SAFETY',
      title: 'Account Status Notice',
      message: 'Your profile has been blocked due to a violation of platform policies.',
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Reported user account has been blocked and report marked as resolved.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

// ── Profile Safety & Moderation Actions ──

export async function updateProfileSafetyStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, reason, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid profile or user ID' });
    }

    // Resolve profile and user
    let profile = await Profile.findById(id);
    let user = profile ? await User.findById(profile.user) : await User.findById(id);
    if (!profile && user) {
      profile = await Profile.findOne({ user: user._id });
    }

    if (!profile && !user) {
      return res.status(404).json({ success: false, message: 'Profile or User not found' });
    }

    const previousStatus = profile?.status || (user?.isActive ? 'Active' : 'Suspended');
    const newStatus = ['Active', 'Under Review', 'Suspended', 'Blocked', 'Deleted'].includes(status)
      ? status
      : 'Under Review';

    const adminId = req.user?.userId;
    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminName = (req.user as any)?.fullName || adminEmail;

    if (profile) {
      profile.status = newStatus as any;
      if (newStatus === 'Deleted') {
        profile.isDeleted = true;
      } else if (profile.isDeleted && newStatus === 'Active') {
        profile.isDeleted = false;
      }
      if (reason || notes) {
        const noteEntry = {
          note: `Status changed to ${newStatus}: ${(reason || notes || '').trim()}`,
          adminId: adminId as any,
          adminEmail,
          adminName,
          createdAt: new Date(),
        };
        if (Array.isArray(profile.adminNotes)) {
          profile.adminNotes.push(noteEntry);
        } else {
          profile.adminNotes = [noteEntry];
        }
      }
      await profile.save();
    }

    if (user) {
      user.status = newStatus as any;
      if (newStatus === 'Suspended' || newStatus === 'Blocked' || newStatus === 'Deleted') {
        user.isActive = false;
      } else if (newStatus === 'Active') {
        user.isActive = true;
      }
      if (newStatus === 'Deleted') {
        user.isDeleted = true;
      } else if (user.isDeleted && newStatus === 'Active') {
        user.isDeleted = false;
      }
      await user.save();
    }

    // Record audit log
    await logAdminAction(
      adminEmail,
      'PROFILE_STATUS_CHANGED',
      `Changed status of profile ${profile?._id || user?._id} from ${previousStatus} to ${newStatus}. Reason: ${reason || notes || 'None'}`,
      'Profile',
      String(profile?._id || user?._id),
      {
        adminId,
        adminName,
        targetProfileId: profile?._id,
        targetUserId: user?._id,
        previousStatus,
        newStatus,
        reason: reason || notes,
      }
    );

    // Notify user if appropriate
    if (user && newStatus === 'Under Review') {
      await Notification.create({
        user: user._id,
        type: 'SAFETY',
        title: 'Profile Under Review',
        message: 'Your profile is currently under review by our safety and compliance team.',
      }).catch(() => {});
    } else if (user && newStatus === 'Suspended') {
      await Notification.create({
        user: user._id,
        type: 'SAFETY',
        title: 'Profile Suspended',
        message: 'Your profile has been temporarily suspended.',
      }).catch(() => {});
    } else if (user && newStatus === 'Blocked') {
      await Notification.create({
        user: user._id,
        type: 'SAFETY',
        title: 'Profile Blocked',
        message: 'Your profile has been blocked due to a violation of platform policies.',
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `Profile status updated to ${newStatus}.`,
      data: {
        profile,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function sendProfileWarning(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { message, warningTitle = 'Safety & Platform Compliance Notice' } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'A warning message is required.' });
    }

    let profile = await Profile.findById(id);
    let user = profile ? await User.findById(profile.user) : await User.findById(id);
    if (!profile && user) {
      profile = await Profile.findOne({ user: user._id });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const cleanMsg = String(message).trim();

    await Notification.create({
      user: user._id,
      type: 'WARNING',
      title: warningTitle,
      message: cleanMsg,
    });

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'WARNING_SENT',
      `Sent warning to profile ${profile?._id || user._id}. Message: ${cleanMsg}`,
      'Profile',
      String(profile?._id || user._id),
      {
        adminId: req.user?.userId,
        adminName: (req.user as any)?.fullName || req.user?.email,
        targetProfileId: profile?._id,
        targetUserId: user._id,
        reason: cleanMsg,
      }
    );

    res.json({
      success: true,
      message: 'Official warning has been delivered to the member.',
    });
  } catch (error) {
    next(error);
  }
}

export async function suspendProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason = 'Temporarily suspended by administration pending compliance review' } = req.body;

    let profile = await Profile.findById(id);
    let user = profile ? await User.findById(profile.user) : await User.findById(id);
    if (!profile && user) {
      profile = await Profile.findOne({ user: user._id });
    }

    if (!user && !profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const previousStatus = profile?.status || 'Active';

    if (profile) {
      profile.status = 'Suspended';
      if (reason) {
        const suspendNote = {
          note: `Profile suspended: ${reason}`,
          adminId: req.user?.userId as any,
          adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
          adminName: (req.user as any)?.fullName || req.user?.email || 'Admin',
          createdAt: new Date(),
        };
        if (Array.isArray(profile.adminNotes)) {
          profile.adminNotes.push(suspendNote);
        } else {
          profile.adminNotes = [suspendNote];
        }
      }
      await profile.save();
    }

    if (user) {
      user.status = 'Suspended';
      user.isActive = false;
      await user.save();
    }

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'PROFILE_SUSPENDED',
      `Suspended profile ${profile?._id || user?._id}. Reason: ${reason}`,
      'Profile',
      String(profile?._id || user?._id),
      {
        adminId: req.user?.userId,
        adminName: (req.user as any)?.fullName || req.user?.email,
        targetProfileId: profile?._id,
        targetUserId: user?._id,
        previousStatus,
        newStatus: 'Suspended',
        reason,
      }
    );

    if (user) {
      await Notification.create({
        user: user._id,
        type: 'SAFETY',
        title: 'Account Suspended',
        message: 'Your profile has been temporarily suspended.',
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Profile has been temporarily suspended.',
      data: { profile, user },
    });
  } catch (error) {
    next(error);
  }
}

export async function blockProfileAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason = 'Blocked by platform administrator' } = req.body;

    let profile = await Profile.findById(id);
    let user = profile ? await User.findById(profile.user) : await User.findById(id);
    if (!profile && user) {
      profile = await Profile.findOne({ user: user._id });
    }

    if (!user && !profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const previousStatus = profile?.status || 'Active';

    if (profile) {
      profile.status = 'Blocked';
      if (reason) {
        const blockNote = {
          note: `Profile blocked: ${reason}`,
          adminId: req.user?.userId as any,
          adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
          adminName: (req.user as any)?.fullName || req.user?.email || 'Admin',
          createdAt: new Date(),
        };
        if (Array.isArray(profile.adminNotes)) {
          profile.adminNotes.push(blockNote);
        } else {
          profile.adminNotes = [blockNote];
        }
      }
      await profile.save();
    }

    if (user) {
      user.status = 'Blocked';
      user.isActive = false;
      await user.save();
    }

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'PROFILE_BLOCKED',
      `Blocked profile ${profile?._id || user?._id}. Reason: ${reason}`,
      'Profile',
      String(profile?._id || user?._id),
      {
        adminId: req.user?.userId,
        adminName: (req.user as any)?.fullName || req.user?.email,
        targetProfileId: profile?._id,
        targetUserId: user?._id,
        previousStatus,
        newStatus: 'Blocked',
        reason,
      }
    );

    if (user) {
      await Notification.create({
        user: user._id,
        type: 'SAFETY',
        title: 'Account Blocked',
        message: 'Your profile has been blocked due to a violation of platform policies.',
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Profile has been blocked.',
      data: { profile, user },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProfileAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const reason = (req.body?.reason || req.query?.reason || 'Deleted by administrator').toString();

    let profile = await Profile.findById(id);
    let user = profile ? await User.findById(profile.user) : await User.findById(id);
    if (!profile && user) {
      profile = await Profile.findOne({ user: user._id });
    }

    if (!user && !profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const previousStatus = profile?.status || 'Active';
    const adminId = req.user?.userId;

    // Soft delete profile
    if (profile) {
      profile.status = 'Deleted';
      profile.isDeleted = true;
      const deletionNote = {
        note: `Profile deleted: ${reason}`,
        adminId: adminId as any,
        adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
        adminName: (req.user as any)?.fullName || req.user?.email || 'Admin',
        createdAt: new Date(),
      };
      if (Array.isArray(profile.adminNotes)) {
        profile.adminNotes.push(deletionNote);
      } else {
        profile.adminNotes = [deletionNote];
      }
      await profile.save();
    }

    // Soft delete user
    if (user) {
      user.status = 'Deleted';
      user.isDeleted = true;
      user.isActive = false;
      await user.save();
    }

    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'PROFILE_DELETED',
      `Soft-deleted profile ${profile?._id || user?._id}. Reason: ${reason}`,
      'Profile',
      String(profile?._id || user?._id),
      {
        adminId,
        adminName: (req.user as any)?.fullName || req.user?.email,
        targetProfileId: profile?._id,
        targetUserId: user?._id,
        previousStatus,
        newStatus: 'Deleted',
        reason,
      }
    );

    res.json({
      success: true,
      message: 'Profile has been safely soft-deleted.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getSafetyStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [
      totalReports,
      pendingReports,
      underReviewReports,
      resolvedReports,
      dismissedReports,
      multiReportProfilesAgg,
      suspendedProfiles,
      blockedProfiles,
      deletedProfiles,
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: 'PENDING' }),
      Report.countDocuments({ status: 'UNDER_REVIEW' }),
      Report.countDocuments({ status: 'RESOLVED' }),
      Report.countDocuments({ status: { $in: ['DISMISSED', 'REJECTED'] } }),
      Report.aggregate([
        { $group: { _id: '$reportedUser', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'multiCount' },
      ]),
      Profile.countDocuments({ status: 'Suspended' }),
      Profile.countDocuments({ status: 'Blocked' }),
      Profile.countDocuments({ status: 'Deleted' }),
    ]);

    res.json({
      success: true,
      data: {
        totalReports,
        pendingReports,
        underReviewReports,
        resolvedReports,
        dismissedReports,
        profilesWithMultipleReports: multiReportProfilesAgg[0]?.multiCount || 0,
        suspendedProfiles,
        blockedProfiles,
        deletedProfiles,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSafetyAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params;
    const query: any = {};

    if (profileId && isValidObjectId(profileId)) {
      query.$or = [
        { targetProfileId: profileId },
        { targetUserId: profileId },
        { targetId: profileId },
      ];
    } else {
      query.action = {
        $in: [
          'REPORT_RESOLVED',
          'REPORT_DISMISSED',
          'REPORT_STATUS_UPDATED',
          'USER_BLOCKED_VIA_REPORT',
          'PROFILE_STATUS_CHANGED',
          'WARNING_SENT',
          'PROFILE_SUSPENDED',
          'PROFILE_BLOCKED',
          'PROFILE_DELETED',
        ],
      };
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(100).lean();

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}


// 9. Platform Notifications & Broadcast Announcements
export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 25, type, targetType, status, search } = req.query;

    const query: any = {};
    if (type && type !== 'ALL') {
      query.type = type;
    }
    if (targetType && targetType !== 'ALL') {
      query.targetType = targetType;
    }
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (search) {
      const searchStr = String(search).trim();
      const safeSearch = escapeRegex(searchStr);
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { message: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
    const pageNumber = Math.max(1, Number(page) || 1);
    const skip = (pageNumber - 1) * pageSize;

    const [total, broadcasts] = await Promise.all([
      Broadcast.countDocuments(query),
      Broadcast.find(query)
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
    ]);

    res.json({
      success: true,
      data: {
        broadcasts,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getBroadcastById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const broadcast = await Broadcast.findById(id).populate('createdBy', 'fullName email role');
    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: broadcast });
  } catch (error) {
    next(error);
  }
}

export async function getRecipientCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { targetType = 'ALL_USERS', targetUserIds } = req.body;
    const count = await countRecipients(targetType, targetUserIds);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

export async function searchAdminUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { q = '', page = 1, limit = 10 } = req.query;
    const searchStr = String(q).trim();
    const query: any = { role: 'user' };

    if (searchStr) {
      const safeSearch = escapeRegex(searchStr);
      const orConditions: any[] = [
        { fullName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { mobile: { $regex: safeSearch, $options: 'i' } },
      ];
      if (isValidObjectId(searchStr)) {
        orConditions.push({ _id: searchStr });
      }
      query.$or = orConditions;
    }

    const pageSize = Math.min(50, Math.max(1, Number(limit) || 10));
    const pageNumber = Math.max(1, Number(page) || 1);
    const skip = (pageNumber - 1) * pageSize;

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('_id fullName email mobile role verificationStatus verified isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
    ]);

    res.json({
      success: true,
      data: {
        users,
        total,
        page: pageNumber,
        limit: pageSize,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function sendNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      title,
      message,
      type = 'SYSTEM',
      targetType = 'ALL_USERS',
      target, // fallback if legacy frontend passes target='ALL'
      targetUserIds,
      userId, // fallback if single userId passed
      actionUrl,
      link,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Announcement title is required' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Notification message is required' });
    }

    const cleanTitle = String(title).trim().slice(0, 150);
    const cleanMessage = String(message).trim().slice(0, 2000);
    const cleanActionUrl = sanitizeActionUrl(actionUrl || link);

    let effectiveTargetType: any = targetType;
    if (!effectiveTargetType && target) {
      effectiveTargetType = target === 'ALL' ? 'ALL_USERS' : 'SELECTED_USERS';
    }

    let effectiveTargetUserIds = targetUserIds;
    if (!effectiveTargetUserIds && userId) {
      effectiveTargetUserIds = [userId];
      effectiveTargetType = 'SELECTED_USERS';
    }

    const adminId = req.user?.userId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const adminUser = await User.findById(adminId);
    const adminEmail = adminUser?.email || 'admin@wonderfuljodi.com';

    const io = req.app.get('io');

    const broadcast = await createAndDispatchBroadcast({
      adminId: String(adminId),
      adminEmail,
      title: cleanTitle,
      message: cleanMessage,
      type: (type || 'SYSTEM') as any,
      targetType: (effectiveTargetType || 'ALL_USERS') as any,
      targetUserIds: effectiveTargetUserIds,
      actionUrl: cleanActionUrl,
      io,
    });

    res.json({
      success: true,
      message: `Notification broadcasted successfully to ${broadcast.totalRecipients} recipient(s)`,
      data: broadcast,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBroadcast(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const broadcast = await Broadcast.findByIdAndDelete(id);
    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await logAdminAction(
      (req as any).user?.email || 'admin@wonderfuljodi.com',
      'BROADCAST_DELETED',
      `Deleted broadcast record "${broadcast.title}" (ID: ${id})`,
      'Broadcast',
      id
    );

    res.json({ success: true, message: 'Notification record removed successfully' });
  } catch (error) {
    next(error);
  }
}

// 10. Admin Accounts & Roles
export async function getAdmins(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const admins = await User.find({ role: 'admin', isDeleted: { $ne: true } })
      .select('-password')
      .sort({ createdAt: -1 });
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

export async function getAdminById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const callerId = req.user?.userId;
    if (!callerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Authorization: caller must have 'all', 'admins', or 'users' permissions or be superadmin
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isAuthorized =
      callerPerms.includes('all') ||
      callerPerms.includes('admins') ||
      callerPerms.includes('users');

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions to view administrator details',
      });
    }

    const targetUser = await User.findOne({
      _id: req.params.id,
      role: 'admin',
      isDeleted: { $ne: true },
    }).select('-password');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account not found or already deleted',
      });
    }

    const adminDoc = await Admin.findOne({ user: targetUser._id });
    const permissions = adminDoc?.permissions || [];

    return res.json({
      success: true,
      data: {
        _id: targetUser._id,
        id: targetUser._id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        mobile: targetUser.mobile,
        role: targetUser.role,
        isActive: targetUser.isActive ?? true,
        status: targetUser.status || 'Active',
        permissions,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const callerId = req.user?.userId;
    if (!callerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // 1. Authorization: Only Super Admin (permissions contains 'all') can delete admin accounts
    const callerAdmin = await Admin.findOne({ user: callerId });
    const callerPerms: string[] = callerAdmin?.permissions || [];
    const isSuperAdmin = callerPerms.includes('all');

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Super Administrators can delete administrator accounts.',
      });
    }

    const targetId = req.params.id;

    // 2. Prevent self-deletion
    if (String(targetId) === String(callerId)) {
      return res.status(400).json({
        success: false,
        message: 'Self-deletion is prohibited. You cannot delete your own administrator account.',
      });
    }

    // 3. Find target admin user
    const targetUser = await User.findOne({ _id: targetId, role: 'admin' });
    if (!targetUser || targetUser.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account not found or already deleted.',
      });
    }

    // 4. Check if target is a Super Admin and if they are the last active Super Admin
    const targetAdminDoc = await Admin.findOne({ user: targetUser._id });
    const targetPerms: string[] = targetAdminDoc?.permissions || [];
    const isTargetSuperAdmin = targetPerms.includes('all');

    if (isTargetSuperAdmin) {
      const allActiveAdmins = await User.find({
        role: 'admin',
        isActive: true,
        isDeleted: { $ne: true },
        status: { $ne: 'Deleted' },
      });

      let superAdminCount = 0;
      for (const adm of allActiveAdmins) {
        const doc = await Admin.findOne({ user: adm._id });
        if (doc?.permissions?.includes('all')) {
          superAdminCount++;
        }
      }

      if (superAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last active Super Administrator account.',
        });
      }
    }

    // 5. Soft-delete the admin user
    await User.findByIdAndUpdate(targetUser._id, {
      isDeleted: true,
      isActive: false,
      status: 'Deleted',
    });

    // 6. Revoke all active sessions and refresh tokens for this admin
    const { RefreshToken } = await import('../models/RefreshToken');
    await RefreshToken.updateMany(
      { user: targetUser._id },
      { isRevoked: true, isUsed: true }
    );

    // 7. Audit log
    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'ADMIN_DELETED',
      `Soft-deleted administrator account for ${targetUser.email}`,
      'User',
      String(targetUser._id),
      {
        adminId: callerId,
        targetUserId: targetUser._id,
        previousStatus: targetUser.status || 'Active',
        newStatus: 'Deleted',
        reason: req.body?.reason || 'Administrator account removed by Superadmin',
      }
    );

    return res.json({
      success: true,
      message: 'Administrator account deleted successfully',
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
        supportPhone: '+91 096075 59547',
        tollFreeNumber: '+91 096075 59547',
        officeAddress: 'A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034',
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
    invalidateMaintenanceCache();
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

export async function getMaintenanceSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json({
      success: true,
      data: {
        maintenanceMode: Boolean(settings.maintenanceMode),
        maintenanceBanner: Boolean(settings.maintenanceBanner),
        maintenanceTitle: settings.maintenanceTitle || "We'll Be Back Soon",
        maintenanceMessage:
          settings.maintenanceMessage ||
          'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
        maintenanceEstimatedEndTime: settings.maintenanceEstimatedEndTime,
        allowAdminAccess: settings.allowAdminAccess !== false,
        maintenanceUpdatedBy: settings.maintenanceUpdatedBy || '',
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMaintenanceSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      maintenanceMode,
      maintenanceBanner,
      maintenanceTitle,
      maintenanceMessage,
      maintenanceEstimatedEndTime,
      allowAdminAccess,
    } = req.body;

    const updatePayload: any = {};
    if (typeof maintenanceMode === 'boolean') updatePayload.maintenanceMode = maintenanceMode;
    if (typeof maintenanceBanner === 'boolean') updatePayload.maintenanceBanner = maintenanceBanner;
    if (typeof maintenanceTitle === 'string') updatePayload.maintenanceTitle = maintenanceTitle.trim();
    if (typeof maintenanceMessage === 'string') updatePayload.maintenanceMessage = maintenanceMessage.trim();
    if (maintenanceEstimatedEndTime !== undefined) {
      updatePayload.maintenanceEstimatedEndTime = maintenanceEstimatedEndTime
        ? new Date(maintenanceEstimatedEndTime)
        : null;
    }
    if (typeof allowAdminAccess === 'boolean') updatePayload.allowAdminAccess = allowAdminAccess;

    const adminEmail = (req as any).user?.email || 'admin@wonderfuljodi.com';
    updatePayload.maintenanceUpdatedBy = adminEmail;

    const prevSettings = await Setting.findOne();
    const settings = await Setting.findOneAndUpdate({}, { $set: updatePayload }, { upsert: true, new: true });
    if (!settings) throw new Error('Failed to update settings');
    invalidateMaintenanceCache();

    const action =
      updatePayload.maintenanceMode !== undefined
        ? updatePayload.maintenanceMode
          ? 'MAINTENANCE_ENABLED'
          : 'MAINTENANCE_DISABLED'
        : 'MAINTENANCE_CONFIG_UPDATED';

    await logAdminAction(
      adminEmail,
      action,
      `Maintenance settings updated: Mode=${settings.maintenanceMode}, Banner=${settings.maintenanceBanner}`,
      'Setting',
      String(settings._id)
    );

    await SecurityLog.create({
      user: req.user?.userId,
      identifier: adminEmail,
      eventType: 'ADMIN_ACTION',
      status: 'SUCCESS',
      details: {
        action,
        previousState: {
          maintenanceMode: prevSettings?.maintenanceMode,
          maintenanceBanner: prevSettings?.maintenanceBanner,
        },
        newState: {
          maintenanceMode: settings.maintenanceMode,
          maintenanceBanner: settings.maintenanceBanner,
        },
      },
    });

    res.json({
      success: true,
      data: settings,
      message: settings.maintenanceMode ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
    });
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

