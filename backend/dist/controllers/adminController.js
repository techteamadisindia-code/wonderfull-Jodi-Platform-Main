"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = getDashboardStats;
exports.getDailyVisitsAnalytics = getDailyVisitsAnalytics;
exports.getDashboardVerifications = getDashboardVerifications;
exports.getDashboardTransactions = getDashboardTransactions;
exports.getDashboardRecentUsers = getDashboardRecentUsers;
exports.getDashboardInquiries = getDashboardInquiries;
exports.getDashboardReports = getDashboardReports;
exports.getDashboardRevenue = getDashboardRevenue;
exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.updateUserStatus = updateUserStatus;
exports.updateUserRole = updateUserRole;
exports.deleteUser = deleteUser;
exports.getProfiles = getProfiles;
exports.getProfileById = getProfileById;
exports.addProfileAdminNote = addProfileAdminNote;
exports.updateProfile = updateProfile;
exports.getVerifications = getVerifications;
exports.getVerificationById = getVerificationById;
exports.approveVerification = approveVerification;
exports.rejectVerification = rejectVerification;
exports.approveAllUserVerifications = approveAllUserVerifications;
exports.rejectAllUserVerifications = rejectAllUserVerifications;
exports.getMemberships = getMemberships;
exports.updateMembership = updateMembership;
exports.getPayments = getPayments;
exports.getInterests = getInterests;
exports.updateInterestStatus = updateInterestStatus;
exports.getShortlists = getShortlists;
exports.deleteShortlist = deleteShortlist;
exports.getMessages = getMessages;
exports.getConversationMessages = getConversationMessages;
exports.updateConversationStatus = updateConversationStatus;
exports.getMessageStats = getMessageStats;
exports.updateMessageModeration = updateMessageModeration;
exports.simulateCompliance = simulateCompliance;
exports.sendDemoSeedMessage = sendDemoSeedMessage;
exports.resetDemoTestMessages = resetDemoTestMessages;
exports.getReports = getReports;
exports.getReportById = getReportById;
exports.getReportsByProfile = getReportsByProfile;
exports.updateReportStatus = updateReportStatus;
exports.resolveReport = resolveReport;
exports.dismissReport = dismissReport;
exports.blockUserFromReport = blockUserFromReport;
exports.updateProfileSafetyStatus = updateProfileSafetyStatus;
exports.sendProfileWarning = sendProfileWarning;
exports.suspendProfile = suspendProfile;
exports.blockProfileAdmin = blockProfileAdmin;
exports.deleteProfileAdmin = deleteProfileAdmin;
exports.getSafetyStats = getSafetyStats;
exports.getSafetyAuditLogs = getSafetyAuditLogs;
exports.getNotifications = getNotifications;
exports.getBroadcastById = getBroadcastById;
exports.getRecipientCount = getRecipientCount;
exports.searchAdminUsers = searchAdminUsers;
exports.sendNotification = sendNotification;
exports.deleteBroadcast = deleteBroadcast;
exports.getAdmins = getAdmins;
exports.createAdmin = createAdmin;
exports.updateAdmin = updateAdmin;
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.getMaintenanceSettings = getMaintenanceSettings;
exports.updateMaintenanceSettings = updateMaintenanceSettings;
exports.getInquiries = getInquiries;
exports.updateInquiryStatus = updateInquiryStatus;
exports.getAuditLogs = getAuditLogs;
const prismaBridge_1 = __importDefault(require("../db/prismaBridge"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const Subscription_1 = require("../models/Subscription");
const Payment_1 = require("../models/Payment");
const Report_1 = require("../models/Report");
const Verification_1 = require("../models/Verification");
const Interest_1 = require("../models/Interest");
const Shortlist_1 = require("../models/Shortlist");
const Message_1 = require("../models/Message");
const Conversation_1 = require("../models/Conversation");
const Notification_1 = require("../models/Notification");
const Broadcast_1 = require("../models/Broadcast");
const Admin_1 = require("../models/Admin");
const Setting_1 = require("../models/Setting");
const ContactInquiry_1 = require("../models/ContactInquiry");
const AuditLog_1 = require("../models/AuditLog");
const RefreshToken_1 = require("../models/RefreshToken");
const SecurityLog_1 = require("../models/SecurityLog");
const securityUtils_1 = require("../utils/securityUtils");
const maintenanceMiddleware_1 = require("../middleware/maintenanceMiddleware");
const notificationBroadcastService_1 = require("../services/notificationBroadcastService");
const DailyUserVisit_1 = require("../models/DailyUserVisit");
const Registration_1 = require("../models/Registration");
const doctorValidation_1 = require("../utils/doctorValidation");
const visitTrackingService_1 = require("../services/visitTrackingService");
const complianceDetector_1 = require("../services/complianceDetector");
// Helper for audit logging
async function logAdminAction(adminEmail, action, details, targetModel, targetId, extraParams) {
    try {
        await AuditLog_1.AuditLog.create({
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
    }
    catch (err) {
        console.error('Audit logging failed:', err);
    }
}
// 1. Dashboard KPIs & Aggregations
async function getDashboardStats(req, res, next) {
    try {
        const [totalUsers, activeUsers, inactiveUsers, verifiedProfiles, pendingVerification, premiumUsers, revenueAgg, pendingReports, newInquiries, totalInterests, pendingInterests, acceptedInterests, rejectedInterests, activeConversations, totalShortlists, totalMessages, newRegistrations7d, recentUsers, recentPayments, recentVerifications, todayVisitedUsers, incompleteRegistrations, completedRegistrations,] = await Promise.all([
            User_1.User.countDocuments({ role: 'user' }),
            User_1.User.countDocuments({ role: 'user', isActive: true }),
            User_1.User.countDocuments({ role: 'user', isActive: false }),
            Profile_1.Profile.countDocuments({ verificationStatus: 'VERIFIED' }),
            Verification_1.Verification.countDocuments({ status: 'PENDING' }),
            Subscription_1.Subscription.countDocuments({ status: 'ACTIVE', plan: { $ne: 'FREE' } }),
            Payment_1.Payment.aggregate([
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
            Report_1.Report.countDocuments({ status: 'PENDING' }),
            ContactInquiry_1.ContactInquiry.countDocuments({ status: 'NEW' }),
            Interest_1.Interest.countDocuments(),
            Interest_1.Interest.countDocuments({ status: 'PENDING' }),
            Interest_1.Interest.countDocuments({ status: 'ACCEPTED' }),
            Interest_1.Interest.countDocuments({ status: { $in: ['REJECTED', 'DECLINED'] } }),
            Conversation_1.Conversation.countDocuments({ status: 'ACTIVE' }),
            Shortlist_1.Shortlist.countDocuments(),
            Message_1.Message.countDocuments(),
            User_1.User.countDocuments({
                role: 'user',
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            }),
            User_1.User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(10).select('-password'),
            Payment_1.Payment.find().sort({ createdAt: -1 }).limit(6).populate('user', 'fullName email mobile'),
            Verification_1.Verification.find().sort({ createdAt: -1 }).limit(6).populate('user', 'fullName email mobile'),
            DailyUserVisit_1.DailyUserVisit.countDocuments({ visitDate: (0, visitTrackingService_1.getFormattedVisitDate)() }),
            Registration_1.Registration.countDocuments({ status: { $in: ['STARTED', 'IN_PROGRESS'] }, isDeleted: false }),
            Registration_1.Registration.countDocuments({ status: 'COMPLETED', isDeleted: false }),
        ]);
        const totalRevenue = Math.max(0, (revenueAgg[0]?.gross || 0) - (revenueAgg[0]?.refunds || 0));
        const { getCachedMaintenanceConfig } = await Promise.resolve().then(() => __importStar(require('../middleware/maintenanceMiddleware')));
        const maintenanceConfig = await getCachedMaintenanceConfig();
        const formattedRecentUsers = recentUsers.map((u) => ({
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
    }
    catch (error) {
        next(error);
    }
}
// 1b. Daily Visited Users Analytics (GET /api/admin/analytics/daily-visits)
async function getDailyVisitsAnalytics(req, res, next) {
    try {
        const rawDays = req.query.days ? parseInt(req.query.days, 10) : 7;
        const allowedDays = [7, 14, 30, 90];
        const days = allowedDays.includes(rawDays) ? rawDays : (rawDays > 0 && rawDays <= 365 ? rawDays : 7);
        const now = new Date();
        const todayDate = (0, visitTrackingService_1.getFormattedVisitDate)(now);
        // Build complete consecutive date range
        const dateList = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dateList.push((0, visitTrackingService_1.getFormattedVisitDate)(d));
        }
        const startDate = dateList[0];
        // Database aggregation grouping by visitDate
        const visitAgg = await DailyUserVisit_1.DailyUserVisit.aggregate([
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
        const aggMap = new Map();
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
        const distinctUniqueUsers = (await DailyUserVisit_1.DailyUserVisit.distinct('user', {
            visitDate: { $gte: startDate, $lte: todayDate },
        })).length;
        const todayRecord = aggMap.get(todayDate);
        const todayCount = todayRecord ? todayRecord.uniqueVisitors : 0;
        const yesterdayObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayDate = (0, visitTrackingService_1.getFormattedVisitDate)(yesterdayObj);
        const yesterdayRecord = aggMap.get(yesterdayDate);
        const yesterdayCount = yesterdayRecord ? yesterdayRecord.uniqueVisitors : 0;
        let percentChangeVsYesterday = 0;
        let comparisonStatus = 'NO_DATA';
        let comparisonText = 'No previous-day comparison';
        if (yesterdayCount > 0) {
            percentChangeVsYesterday = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
            if (percentChangeVsYesterday > 0) {
                comparisonStatus = 'INCREASE';
                comparisonText = `+${percentChangeVsYesterday}% vs yesterday`;
            }
            else if (percentChangeVsYesterday < 0) {
                comparisonStatus = 'DECREASE';
                comparisonText = `${percentChangeVsYesterday}% vs yesterday`;
            }
            else {
                comparisonStatus = 'UNCHANGED';
                comparisonText = '0% vs yesterday';
            }
        }
        else if (todayCount > 0) {
            percentChangeVsYesterday = 100;
            comparisonStatus = 'FIRST_VISITS';
            comparisonText = 'First visits vs yesterday';
        }
        else {
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
    }
    catch (error) {
        next(error);
    }
}
async function getDashboardVerifications(req, res, next) {
    try {
        const verifications = await Verification_1.Verification.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'fullName email mobile');
        res.json({ success: true, data: verifications });
    }
    catch (error) {
        next(error);
    }
}
async function getDashboardTransactions(req, res, next) {
    try {
        const transactions = await Payment_1.Payment.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'fullName email mobile');
        res.json({ success: true, data: transactions });
    }
    catch (error) {
        next(error);
    }
}
async function getDashboardRecentUsers(req, res, next) {
    try {
        const users = await User_1.User.find({ role: 'user' })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('-password');
        const formattedUsers = users.map((u) => ({
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
    }
    catch (error) {
        next(error);
    }
}
async function getDashboardInquiries(req, res, next) {
    try {
        const inquiries = await ContactInquiry_1.ContactInquiry.find()
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({ success: true, data: inquiries });
    }
    catch (error) {
        next(error);
    }
}
async function getDashboardReports(req, res, next) {
    try {
        const reports = await Report_1.Report.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('reporter', 'fullName email')
            .populate('reportedUser', 'fullName email');
        res.json({ success: true, data: reports });
    }
    catch (error) {
        next(error);
    }
}
async function getDashboardRevenue(req, res, next) {
    try {
        const revenueAgg = await Payment_1.Payment.aggregate([
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
    }
    catch (error) {
        next(error);
    }
}
// 2. User Management
async function getUsers(req, res, next) {
    try {
        const { search, role, status, page = 1, limit = 25 } = req.query;
        const query = {};
        if (role && role !== 'all') {
            query.role = role;
        }
        if (status === 'active') {
            query.isActive = true;
        }
        else if (status === 'inactive') {
            query.isActive = false;
        }
        if (search) {
            const searchStr = String(search).trim();
            const safeSearch = (0, securityUtils_1.escapeRegex)(searchStr);
            const orConditions = [
                { fullName: { $regex: safeSearch, $options: 'i' } },
                { email: { $regex: safeSearch, $options: 'i' } },
                { mobile: { $regex: safeSearch, $options: 'i' } },
            ];
            if ((0, securityUtils_1.isValidObjectId)(searchStr)) {
                orConditions.push({ _id: searchStr });
            }
            query.$or = orConditions;
        }
        const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
        const pageNumber = Math.max(1, Number(page) || 1);
        const skip = (pageNumber - 1) * pageSize;
        const [total, rawUsers] = await Promise.all([
            User_1.User.countDocuments(query),
            User_1.User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
        ]);
        const userIds = rawUsers.map((u) => u._id);
        // Batch fetch associated profiles and active memberships to enrich user rows efficiently
        const [profiles, subscriptions] = await Promise.all([
            Profile_1.Profile.find({ user: { $in: userIds } })
                .select('_id user displayName primaryPhoto photos verificationStatus lastActiveAt')
                .lean(),
            Subscription_1.Subscription.find({ user: { $in: userIds }, status: 'ACTIVE' })
                .select('user plan')
                .lean(),
        ]);
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const subscriptionMap = new Map(subscriptions.map((s) => [String(s.user), s]));
        const users = rawUsers.map((u) => {
            const p = profileMap.get(String(u._id));
            const s = subscriptionMap.get(String(u._id));
            return {
                ...u,
                profileId: p?._id ? String(p._id) : undefined,
                profilePhoto: p?.primaryPhoto || p?.photos?.[0] || '',
                displayName: p?.displayName || u.fullName,
                lastActiveAt: p?.lastActiveAt || u.updatedAt || u.createdAt,
                membershipPlan: s?.plan || 'FREE',
            };
        });
        res.json({
            success: true,
            data: {
                users,
                total,
                page: pageNumber,
                pages: Math.ceil(total / pageSize) || 1,
                limit: pageSize,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function getUserById(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }
        const user = await User_1.User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const profile = await Profile_1.Profile.findOne({ user: user._id });
        const subscription = await Subscription_1.Subscription.findOne({ user: user._id }).sort({ createdAt: -1 });
        const verifications = await Verification_1.Verification.find({ user: user._id }).sort({ createdAt: -1 });
        const payments = await Payment_1.Payment.find({ user: user._id }).sort({ createdAt: -1 });
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
    }
    catch (error) {
        next(error);
    }
}
async function updateUserStatus(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }
        const { isActive, status, reason } = req.body;
        const activeValue = typeof isActive === 'boolean' ? isActive : status === 'active';
        const user = await User_1.User.findByIdAndUpdate(id, { isActive: activeValue }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // When deactivating, immediately revoke active refresh tokens/sessions
        if (!activeValue) {
            await RefreshToken_1.RefreshToken.updateMany({ user: user._id }, { isRevoked: true, isUsed: true });
        }
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        const reasonText = reason ? ` (Reason: ${String(reason).slice(0, 200)})` : '';
        await logAdminAction(adminEmail, activeValue ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED', `Updated user ${user.email} status to ${activeValue ? 'ACTIVE' : 'INACTIVE'}${reasonText}`, 'User', String(user._id));
        await SecurityLog_1.SecurityLog.create({
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
            message: `Account ${activeValue ? 'reactivated' : 'deactivated'} successfully`,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateUserRole(req, res, next) {
    try {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        const user = await User_1.User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (role === 'admin') {
            await Admin_1.Admin.findOneAndUpdate({ user: user._id }, { permissions: ['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports'] }, { upsert: true });
        }
        await logAdminAction(req.user?.role || 'admin', 'USER_ROLE_UPDATED', `Updated user ${user.email} role to ${role}`, 'User', String(user._id));
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
}
async function deleteUser(req, res, next) {
    try {
        const user = await User_1.User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        await Profile_1.Profile.deleteMany({ user: user._id });
        await Verification_1.Verification.deleteMany({ user: user._id });
        await Subscription_1.Subscription.deleteMany({ user: user._id });
        await Payment_1.Payment.deleteMany({ user: user._id });
        await Interest_1.Interest.deleteMany({ $or: [{ sender: user._id }, { recipient: user._id }] });
        await Shortlist_1.Shortlist.deleteMany({ user: user._id });
        await User_1.User.findByIdAndDelete(user._id);
        await logAdminAction(req.user?.role || 'admin', 'USER_DELETED', `Deleted user account ${user.email}`, 'User', String(user._id));
        res.json({ success: true, message: 'User and all related records deleted successfully' });
    }
    catch (error) {
        next(error);
    }
}
// 3. Matrimonial Profile Management
async function getProfiles(req, res, next) {
    try {
        const { search, gender, religion, profession, verificationStatus, page = 1, limit = 50 } = req.query;
        const query = {};
        if (gender)
            query.gender = gender;
        if (religion)
            query.religion = religion;
        if (profession)
            query.profession = { $regex: String(profession), $options: 'i' };
        if (verificationStatus)
            query.verificationStatus = verificationStatus;
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
        const total = await Profile_1.Profile.countDocuments(query);
        const profiles = await Profile_1.Profile.find(query)
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
    }
    catch (error) {
        next(error);
    }
}
async function getProfileById(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid profile or user ID' });
        }
        // Attempt to locate Profile by Profile ID or User ID
        let profile = await Profile_1.Profile.findById(id)
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
        let user = null;
        if (profile) {
            user = await User_1.User.findById(profile.user).select('-password');
        }
        else {
            // Maybe ID is a User ID
            user = await User_1.User.findById(id).select('-password');
            if (user) {
                profile = await Profile_1.Profile.findOne({ user: user._id })
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
        const userId = user?._id || profile?.user;
        const profileId = profile?._id;
        // Concurrently fetch all auxiliary admin review data
        const [verifications, subscriptions, payments, reports, auditLogs] = await Promise.all([
            userId ? Verification_1.Verification.find({ user: userId }).sort({ createdAt: -1 }) : [],
            userId ? Subscription_1.Subscription.find({ user: userId }).sort({ createdAt: -1 }) : [],
            userId ? Payment_1.Payment.find({ user: userId }).sort({ createdAt: -1 }) : [],
            Report_1.Report.find({
                $or: [
                    ...(userId ? [{ reportedUser: userId }] : []),
                    ...(profileId ? [{ reportedProfile: profileId }] : []),
                ],
            })
                .populate('reporter', 'fullName email mobile')
                .populate('moderator', 'fullName email')
                .sort({ createdAt: -1 }),
            AuditLog_1.AuditLog.find({
                $or: [
                    ...(profileId ? [{ targetProfileId: profileId }] : []),
                    ...(userId ? [{ targetUserId: userId }] : []),
                ],
            }).sort({ createdAt: -1 }),
        ]);
        const activeSubscription = subscriptions.find((s) => s.status === 'ACTIVE') || subscriptions[0] || null;
        const profileObj = profile ? (typeof profile.toObject === 'function' ? profile.toObject() : profile) : null;
        const userObj = user ? (typeof user.toObject === 'function' ? user.toObject() : user) : null;
        const responsePayload = {
            ...(profileObj || {}),
            profile: profileObj,
            user: userObj,
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
    }
    catch (error) {
        next(error);
    }
}
async function addProfileAdminNote(req, res, next) {
    try {
        const { id } = req.params;
        const { note } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid profile or user ID' });
        }
        if (!note || typeof note !== 'string' || !note.trim()) {
            return res.status(400).json({ success: false, message: 'Note text is required' });
        }
        let profile = await Profile_1.Profile.findById(id);
        let user = profile ? await User_1.User.findById(profile.user) : await User_1.User.findById(id);
        if (!profile && user) {
            profile = await Profile_1.Profile.findOne({ user: user._id });
        }
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const adminId = req.user?.userId;
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        const adminName = req.user?.fullName || adminEmail;
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
        profile.adminNotes.unshift(noteItem);
        await profile.save();
        await logAdminAction(adminEmail, 'ADMIN_NOTE_ADDED', `Added internal note to profile ${profile._id}: "${cleanNote.slice(0, 80)}${cleanNote.length > 80 ? '...' : ''}"`, 'Profile', String(profile._id), {
            adminId,
            adminName,
            targetProfileId: profile._id,
            targetUserId: user?._id,
            reason: cleanNote,
        });
        res.json({
            success: true,
            message: 'Admin note added successfully',
            data: profile.adminNotes,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateProfile(req, res, next) {
    try {
        const targetId = req.params.id;
        // 1. Resolve target profile (by Profile._id or User._id)
        let profile = null;
        if (prismaBridge_1.default.Types.ObjectId.isValid(targetId)) {
            profile = await Profile_1.Profile.findById(targetId);
            if (!profile) {
                profile = await Profile_1.Profile.findOne({ user: targetId });
            }
        }
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const user = await User_1.User.findById(profile.user);
        // 2. Strict Backend Security Check: Protected Fields Enforcement
        // Admins must NEVER be able to edit Full Name, Email Address, or Mobile/Phone Number.
        const protectedFieldKeys = [
            'name',
            'fullname',
            'firstname',
            'lastname',
            'email',
            'phone',
            'mobile',
            'mobilenumber',
            'displayname',
        ];
        // Check top-level request body
        const attemptedProtectedField = Object.keys(req.body).find((key) => {
            const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
            return protectedFieldKeys.includes(normalizedKey);
        });
        if (attemptedProtectedField) {
            return res.status(400).json({
                success: false,
                message: 'Name, Email Address and Mobile Number are protected and cannot be modified by administrators.',
                protectedField: attemptedProtectedField,
            });
        }
        // Check nested user object if provided
        if (req.body.user && typeof req.body.user === 'object') {
            const attemptedNestedField = Object.keys(req.body.user).find((key) => {
                const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
                return protectedFieldKeys.includes(normalizedKey);
            });
            if (attemptedNestedField) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, Email Address and Mobile Number are protected and cannot be modified by administrators.',
                    protectedField: `user.${attemptedNestedField}`,
                });
            }
        }
        // 3. Explicitly Whitelist Editable Fields (Do NOT pass req.body directly into the database update)
        const updateData = {};
        // Personal Details
        if (req.body.gender !== undefined)
            updateData.gender = req.body.gender;
        if (req.body.dob !== undefined)
            updateData.dob = req.body.dob;
        if (req.body.dateOfBirth !== undefined)
            updateData.dob = req.body.dateOfBirth;
        if (req.body.maritalStatus !== undefined)
            updateData.maritalStatus = req.body.maritalStatus;
        if (req.body.height !== undefined)
            updateData.height = req.body.height;
        if (req.body.weight !== undefined)
            updateData.weight = req.body.weight;
        if (req.body.religion !== undefined)
            updateData.religion = req.body.religion;
        if (req.body.caste !== undefined)
            updateData.caste = req.body.caste;
        if (req.body.subCaste !== undefined)
            updateData.subCaste = req.body.subCaste;
        if (req.body.motherTongue !== undefined)
            updateData.motherTongue = req.body.motherTongue;
        if (req.body.city !== undefined)
            updateData.city = req.body.city;
        if (req.body.state !== undefined)
            updateData.state = req.body.state;
        if (req.body.country !== undefined)
            updateData.country = req.body.country;
        // Professional Details
        if (req.body.education !== undefined)
            updateData.education = req.body.education;
        if (req.body.qualification !== undefined)
            updateData.education = req.body.qualification;
        if (req.body.degree !== undefined)
            updateData.degree = req.body.degree;
        if (req.body.profession !== undefined)
            updateData.profession = req.body.profession;
        if (req.body.specialization !== undefined)
            updateData.additionalQualification = req.body.specialization;
        if (req.body.additionalQualification !== undefined)
            updateData.additionalQualification = req.body.additionalQualification;
        if (req.body.company !== undefined)
            updateData.company = req.body.company;
        if (req.body.workplace !== undefined)
            updateData.company = req.body.workplace;
        if (req.body.workLocation !== undefined)
            updateData.workLocation = req.body.workLocation;
        if (req.body.workType !== undefined)
            updateData.workType = req.body.workType;
        if (req.body.annualIncome !== undefined)
            updateData.annualIncome = req.body.annualIncome;
        if (req.body.medicalRegistrationNumber !== undefined)
            updateData.medicalRegistrationNumber = req.body.medicalRegistrationNumber;
        if (req.body.medicalCouncil !== undefined)
            updateData.medicalCouncil = req.body.medicalCouncil;
        if (req.body.medicalCollege !== undefined)
            updateData.medicalCollege = req.body.medicalCollege;
        if (req.body.institution !== undefined)
            updateData.medicalCollege = req.body.institution;
        if (req.body.college !== undefined)
            updateData.medicalCollege = req.body.college;
        if (req.body.currentHospital !== undefined)
            updateData.currentHospital = req.body.currentHospital;
        // Family Details
        if (req.body.familyType !== undefined)
            updateData.familyType = req.body.familyType;
        if (req.body.familyStatus !== undefined)
            updateData.familyStatus = req.body.familyStatus;
        if (req.body.familyValues !== undefined)
            updateData.familyValues = req.body.familyValues;
        if (req.body.fatherOccupation !== undefined)
            updateData.fatherOccupation = req.body.fatherOccupation;
        if (req.body.motherOccupation !== undefined)
            updateData.motherOccupation = req.body.motherOccupation;
        if (req.body.siblings !== undefined)
            updateData.siblings = req.body.siblings;
        if (req.body.nativePlace !== undefined)
            updateData.nativePlace = req.body.nativePlace;
        if (req.body.familyLocation !== undefined)
            updateData.familyLocation = req.body.familyLocation;
        // Profile Details & Bio
        if (req.body.about !== undefined)
            updateData.about = req.body.about;
        if (req.body.bio !== undefined)
            updateData.about = req.body.bio;
        if (req.body.foodPreference !== undefined)
            updateData.foodPreference = req.body.foodPreference;
        if (req.body.smoking !== undefined)
            updateData.smoking = req.body.smoking;
        if (req.body.drinking !== undefined)
            updateData.drinking = req.body.drinking;
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
        if (req.body.status !== undefined)
            updateData.status = req.body.status;
        if (req.body.profileStatus !== undefined)
            updateData.status = req.body.profileStatus;
        if (req.body.verificationStatus !== undefined)
            updateData.verificationStatus = req.body.verificationStatus;
        if (req.body.kycStatus !== undefined)
            updateData.verificationStatus = req.body.kycStatus;
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
                }
                else if (requestedAccountStatus === 'Suspended' || requestedAccountStatus === 'Blocked') {
                    user.isActive = false;
                    user.suspendedAt = new Date();
                    user.suspendedBy = req.user?.userId ? new prismaBridge_1.default.Types.ObjectId(req.user.userId) : undefined;
                }
                else if (requestedAccountStatus === 'Deleted') {
                    user.isDeleted = true;
                    user.isActive = false;
                    user.deletedAt = new Date();
                    user.deletedBy = req.user?.userId ? new prismaBridge_1.default.Types.ObjectId(req.user.userId) : undefined;
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
            const dobResult = (0, doctorValidation_1.validateDateOfBirth)(updateData.dob, updateData.gender || profile.gender);
            if (!dobResult.isValid) {
                return res.status(400).json({
                    success: false,
                    message: dobResult.error || 'Date of birth year must be exactly 4 digits.',
                });
            }
            updateData.dob = dobResult.parsedDate || new Date(dobResult.formattedDate);
        }
        if (updateData.education || updateData.degree) {
            const qualToCheck = updateData.education || updateData.degree;
            if (qualToCheck && typeof qualToCheck === 'string' && qualToCheck.trim()) {
                const qualResult = (0, doctorValidation_1.validateMedicalQualification)(qualToCheck);
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
        // 7. Track diff for audit logging
        const changes = [];
        for (const [key, newVal] of Object.entries(updateData)) {
            const oldVal = profile[key];
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
        if (updateData.status && updateData.status !== profile.status) {
            profile.statusChangedAt = new Date();
            profile.statusChangedBy = req.user?.userId ? new prismaBridge_1.default.Types.ObjectId(req.user.userId) : undefined;
        }
        await profile.save();
        if (userChanged && user) {
            await user.save();
        }
        // 9. Record in Admin Audit Log
        const changedFieldNames = changes.map((c) => c.field);
        if (changes.length > 0) {
            const adminNameStr = req.user?.email ? req.user.email.split('@')[0] : 'Administrator';
            await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'PROFILE_EDITED', `Admin modified profile for ${profile.displayName || user?.fullName || profile._id}: ${changedFieldNames.join(', ')}`, 'Profile', String(profile._id), {
                adminId: req.user?.userId ? new prismaBridge_1.default.Types.ObjectId(req.user.userId) : undefined,
                adminName: adminNameStr,
                targetProfileId: profile._id,
                targetUserId: profile.user,
                previousStatus: profile.status,
                newStatus: updateData.status || profile.status,
                metadata: {
                    fieldsChanged: changedFieldNames,
                    changes,
                },
            });
        }
        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: {
                ...profile.toObject(),
                user: user ? user.toObject() : undefined,
            },
            changesCount: changes.length,
        });
    }
    catch (error) {
        next(error);
    }
}
// 4. KYC / Degree Verification Queue
async function getVerifications(req, res, next) {
    try {
        const { status, documentType, search } = req.query;
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '25'), 10) || 25));
        const skip = (page - 1) * limit;
        const query = {};
        if (status && status !== 'ALL') {
            query.status = String(status).toUpperCase();
        }
        if (documentType && documentType !== 'ALL') {
            query.documentType = String(documentType).toUpperCase();
        }
        if (search && typeof search === 'string' && search.trim()) {
            const safeSearch = (0, securityUtils_1.escapeRegex)(search.trim());
            const searchRegex = new RegExp(safeSearch, 'i');
            // Find matching users first
            const matchingUsers = await User_1.User.find({
                $or: [
                    { fullName: searchRegex },
                    { email: searchRegex },
                    { mobile: searchRegex },
                ],
            }).select('_id');
            const userIds = matchingUsers.map((u) => u._id);
            const searchConditions = [
                { documentName: searchRegex },
                { user: { $in: userIds } },
            ];
            if ((0, securityUtils_1.isValidObjectId)(search.trim())) {
                searchConditions.push({ _id: search.trim() });
            }
            query.$or = searchConditions;
        }
        const [total, verifications] = await Promise.all([
            Verification_1.Verification.countDocuments(query),
            Verification_1.Verification.find(query)
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
    }
    catch (error) {
        next(error);
    }
}
async function getVerificationById(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid verification ID' });
        }
        const verification = await Verification_1.Verification.findById(id).populate('user', 'fullName email mobile verificationStatus verified isActive createdAt');
        if (!verification) {
            return res.status(404).json({ success: false, message: 'Verification record not found' });
        }
        // Also fetch associated user profile and previous verification history
        const [profile, history] = await Promise.all([
            Profile_1.Profile.findOne({ user: verification.user._id }),
            Verification_1.Verification.find({ user: verification.user._id, _id: { $ne: verification._id } }).sort({ createdAt: -1 }),
        ]);
        res.json({
            success: true,
            data: {
                ...verification.toObject(),
                profile,
                history,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function approveVerification(req, res, next) {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid verification ID' });
        }
        const currentDoc = await Verification_1.Verification.findById(id);
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
        currentDoc.status = 'APPROVED';
        currentDoc.reviewedAt = new Date();
        if (adminId && (0, securityUtils_1.isValidObjectId)(adminId)) {
            currentDoc.reviewedBy = adminId;
        }
        currentDoc.reviewedByEmail = adminEmail;
        currentDoc.adminNotes = adminNote;
        await currentDoc.save();
        // Update User & Profile Status to VERIFIED
        await User_1.User.findByIdAndUpdate(currentDoc.user, { verified: true, verificationStatus: 'VERIFIED' });
        await Profile_1.Profile.findOneAndUpdate({ user: currentDoc.user }, { verificationStatus: 'VERIFIED' });
        // Immutable Audit Log
        await logAdminAction(adminEmail, 'VERIFICATION_APPROVED', `Approved ${currentDoc.documentType} verification for User ID: ${currentDoc.user}. Notes: ${adminNote}`, 'Verification', String(currentDoc._id));
        // User Notification
        try {
            await Notification_1.Notification.create({
                user: currentDoc.user,
                type: 'VERIFICATION',
                title: 'Verification Approved',
                message: `Your ${currentDoc.documentType.replace(/_/g, ' ')} (${currentDoc.documentName || 'Document'}) has been successfully verified. Your profile now proudly displays the verified badge.`,
                actionUrl: '/profile',
                read: false,
            });
        }
        catch (notifErr) {
            console.error('Failed to create user verification approval notification:', notifErr);
        }
        const populated = await Verification_1.Verification.findById(currentDoc._id).populate('user', 'fullName email mobile verificationStatus verified isActive');
        res.json({
            success: true,
            data: populated,
            message: 'Verification approved successfully. User status updated to VERIFIED.',
        });
    }
    catch (error) {
        next(error);
    }
}
async function rejectVerification(req, res, next) {
    try {
        const { id } = req.params;
        const { reason, rejectionReason, notes } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid verification ID' });
        }
        const selectedReason = (rejectionReason || reason || '').trim();
        if (!selectedReason) {
            return res.status(400).json({
                success: false,
                message: 'A rejection reason is mandatory to guide the user for re-submission.',
            });
        }
        const currentDoc = await Verification_1.Verification.findById(id);
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
        currentDoc.status = 'REJECTED';
        currentDoc.reviewedAt = new Date();
        if (adminId && (0, securityUtils_1.isValidObjectId)(adminId)) {
            currentDoc.reviewedBy = adminId;
        }
        currentDoc.reviewedByEmail = adminEmail;
        currentDoc.rejectionReason = selectedReason;
        currentDoc.adminNotes = adminNote;
        await currentDoc.save();
        // Check if user has other approved verifications before setting to REJECTED
        const remainingApproved = await Verification_1.Verification.countDocuments({
            user: currentDoc.user,
            status: 'APPROVED',
            _id: { $ne: currentDoc._id },
        });
        if (remainingApproved === 0) {
            await User_1.User.findByIdAndUpdate(currentDoc.user, { verified: false, verificationStatus: 'REJECTED' });
            await Profile_1.Profile.findOneAndUpdate({ user: currentDoc.user }, { verificationStatus: 'REJECTED' });
        }
        // Immutable Audit Log
        await logAdminAction(adminEmail, 'VERIFICATION_REJECTED', `Rejected ${currentDoc.documentType} verification for User ID: ${currentDoc.user}. Reason: ${selectedReason}. Notes: ${adminNote}`, 'Verification', String(currentDoc._id));
        // User Notification
        try {
            await Notification_1.Notification.create({
                user: currentDoc.user,
                type: 'VERIFICATION',
                title: 'Verification Requires Attention',
                message: `Your submitted ${currentDoc.documentType.replace(/_/g, ' ')} could not be verified. Reason: ${selectedReason}. Please visit your profile verification page to upload a new document.`,
                actionUrl: '/profile/verification',
                read: false,
            });
        }
        catch (notifErr) {
            console.error('Failed to create user verification rejection notification:', notifErr);
        }
        const populated = await Verification_1.Verification.findById(currentDoc._id).populate('user', 'fullName email mobile verificationStatus verified isActive');
        res.json({
            success: true,
            data: populated,
            message: 'Verification marked as rejected and notification dispatched to user.',
        });
    }
    catch (error) {
        next(error);
    }
}
async function approveAllUserVerifications(req, res, next) {
    try {
        const { userId } = req.params;
        const { notes } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        const pendingDocs = await Verification_1.Verification.find({ user: userId, status: 'PENDING' });
        if (!pendingDocs.length) {
            return res.status(400).json({ success: false, message: 'No pending verification documents found for this user.' });
        }
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        const adminId = req.user?.userId;
        const adminNote = notes?.trim() || 'All submitted credentials audited and approved by Administrator';
        for (const doc of pendingDocs) {
            doc.status = 'APPROVED';
            doc.reviewedAt = new Date();
            if (adminId && (0, securityUtils_1.isValidObjectId)(adminId)) {
                doc.reviewedBy = adminId;
            }
            doc.reviewedByEmail = adminEmail;
            doc.adminNotes = adminNote;
            await doc.save();
            await logAdminAction(adminEmail, 'VERIFICATION_APPROVED', `Approved ${doc.documentType} verification for User ID: ${userId}. Notes: ${adminNote}`, 'Verification', String(doc._id));
        }
        // Update User & Profile Status to VERIFIED
        await User_1.User.findByIdAndUpdate(userId, { verified: true, verificationStatus: 'VERIFIED' });
        await Profile_1.Profile.findOneAndUpdate({ user: userId }, { verificationStatus: 'VERIFIED' });
        try {
            await Notification_1.Notification.create({
                user: userId,
                type: 'VERIFICATION',
                title: 'All Credentials Verified & Approved',
                message: 'All your submitted verification credentials have been approved by the administration. Your profile now proudly displays the verified doctor badge.',
                actionUrl: '/profile',
                read: false,
            });
        }
        catch (notifErr) {
            console.error('Failed to create user verification approval notification:', notifErr);
        }
        const allDocs = await Verification_1.Verification.find({ user: userId }).populate('user', 'fullName email mobile verificationStatus verified isActive');
        res.json({
            success: true,
            data: allDocs,
            message: `Successfully approved all ${pendingDocs.length} verification document(s). User is now verified.`,
        });
    }
    catch (error) {
        next(error);
    }
}
async function rejectAllUserVerifications(req, res, next) {
    try {
        const { userId } = req.params;
        const { reason, rejectionReason, notes } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        const selectedReason = (rejectionReason || reason || '').trim() || 'Documents do not meet matrimonial verification requirements';
        const pendingDocs = await Verification_1.Verification.find({ user: userId, status: 'PENDING' });
        if (!pendingDocs.length) {
            return res.status(400).json({ success: false, message: 'No pending verification documents found for this user.' });
        }
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        const adminId = req.user?.userId;
        const adminNote = notes?.trim() || selectedReason;
        for (const doc of pendingDocs) {
            doc.status = 'REJECTED';
            doc.reviewedAt = new Date();
            if (adminId && (0, securityUtils_1.isValidObjectId)(adminId)) {
                doc.reviewedBy = adminId;
            }
            doc.reviewedByEmail = adminEmail;
            doc.rejectionReason = selectedReason;
            doc.adminNotes = adminNote;
            await doc.save();
            await logAdminAction(adminEmail, 'VERIFICATION_REJECTED', `Rejected ${doc.documentType} verification for User ID: ${userId}. Reason: ${selectedReason}. Notes: ${adminNote}`, 'Verification', String(doc._id));
        }
        const remainingApproved = await Verification_1.Verification.countDocuments({
            user: userId,
            status: 'APPROVED',
        });
        if (remainingApproved === 0) {
            await User_1.User.findByIdAndUpdate(userId, { verified: false, verificationStatus: 'REJECTED' });
            await Profile_1.Profile.findOneAndUpdate({ user: userId }, { verificationStatus: 'REJECTED' });
        }
        try {
            await Notification_1.Notification.create({
                user: userId,
                type: 'VERIFICATION',
                title: 'Verification Requires Attention',
                message: `Your submitted credentials could not be verified. Reason: ${selectedReason}. Please visit your profile verification center to submit clear documents.`,
                actionUrl: '/profile/verification',
                read: false,
            });
        }
        catch (notifErr) {
            console.error('Failed to create user verification rejection notification:', notifErr);
        }
        const allDocs = await Verification_1.Verification.find({ user: userId }).populate('user', 'fullName email mobile verificationStatus verified isActive');
        res.json({
            success: true,
            data: allDocs,
            message: `Rejected ${pendingDocs.length} verification document(s) for user.`,
        });
    }
    catch (error) {
        next(error);
    }
}
// 5. Membership & Subscription Management
async function getMemberships(req, res, next) {
    try {
        const { plan, status } = req.query;
        const query = {};
        if (plan && plan !== 'ALL')
            query.plan = plan;
        if (status && status !== 'ALL')
            query.status = status;
        const subscriptions = await Subscription_1.Subscription.find(query)
            .populate('user', 'fullName email mobile')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: subscriptions });
    }
    catch (error) {
        next(error);
    }
}
async function updateMembership(req, res, next) {
    try {
        const { plan, status, expiryDate } = req.body;
        const updateData = {};
        if (plan)
            updateData.plan = plan;
        if (status)
            updateData.status = status;
        if (expiryDate)
            updateData.expiryDate = new Date(expiryDate);
        const subscription = await Subscription_1.Subscription.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true }).populate('user', 'fullName email mobile');
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }
        await logAdminAction(req.user?.role || 'admin', 'MEMBERSHIP_UPDATED', `Updated subscription ID: ${subscription._id} for plan ${subscription.plan}`, 'Subscription', String(subscription._id));
        res.json({ success: true, data: subscription });
    }
    catch (error) {
        next(error);
    }
}
// 6. Payment & Billing Transactions
async function getPayments(req, res, next) {
    try {
        const { status, provider } = req.query;
        const query = {};
        if (status && status !== 'ALL')
            query.status = status;
        if (provider)
            query.provider = provider;
        const payments = await Payment_1.Payment.find(query)
            .populate('user', 'fullName email mobile')
            .populate('subscription', 'plan status startDate expiryDate')
            .sort({ createdAt: -1 });
        const totalCollected = await Payment_1.Payment.aggregate([
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
    }
    catch (error) {
        next(error);
    }
}
// 7. Activity Monitor: Interests, Shortlists, Messages
async function getInterests(req, res, next) {
    try {
        const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
        const skip = (pageNumber - 1) * limitNumber;
        // Status filter query
        const baseQuery = {};
        if (status && status !== 'ALL') {
            if (status === 'DECLINED') {
                baseQuery.status = { $in: ['DECLINED', 'REJECTED'] };
            }
            else {
                baseQuery.status = status;
            }
        }
        // Compute status counts across all records for the tabs
        const [allCount, pendingCount, acceptedCount, declinedCount] = await Promise.all([
            Interest_1.Interest.countDocuments({}),
            Interest_1.Interest.countDocuments({ status: 'PENDING' }),
            Interest_1.Interest.countDocuments({ status: 'ACCEPTED' }),
            Interest_1.Interest.countDocuments({ status: { $in: ['DECLINED', 'REJECTED'] } }),
        ]);
        const counts = {
            ALL: allCount,
            PENDING: pendingCount,
            ACCEPTED: acceptedCount,
            DECLINED: declinedCount,
        };
        // If search term provided, find matching user / profile IDs first
        let userFilterQuery = baseQuery;
        if (search && String(search).trim()) {
            const searchStr = String(search).trim();
            const safeSearch = (0, securityUtils_1.escapeRegex)(searchStr);
            const [matchingUsers, matchingProfiles] = await Promise.all([
                User_1.User.find({
                    $or: [
                        { fullName: { $regex: safeSearch, $options: 'i' } },
                        { email: { $regex: safeSearch, $options: 'i' } },
                    ],
                })
                    .select('_id')
                    .lean(),
                Profile_1.Profile.find({
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
                ...matchingUsers.map((u) => u._id),
                ...matchingProfiles.map((p) => p.user),
            ];
            userFilterQuery = {
                ...baseQuery,
                $or: [
                    { sender: { $in: matchedUserIds } },
                    { receiver: { $in: matchedUserIds } },
                ],
            };
        }
        const sortOption = {};
        const sortField = sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt';
        sortOption[sortField] = sortOrder === 'asc' ? 1 : -1;
        const [total, rawInterests] = await Promise.all([
            Interest_1.Interest.countDocuments(userFilterQuery),
            Interest_1.Interest.find(userFilterQuery)
                .populate('sender', 'fullName email mobile')
                .populate('receiver', 'fullName email mobile')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNumber)
                .lean(),
        ]);
        const userIds = [
            ...rawInterests.map((i) => i.sender?._id),
            ...rawInterests.map((i) => i.receiver?._id || i.recipient?._id),
        ].filter(Boolean);
        const profiles = await Profile_1.Profile.find({ user: { $in: userIds } })
            .select('user displayName profession city primaryPhoto photos verificationStatus')
            .lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const interests = rawInterests.map((i) => {
            const sProf = profileMap.get(String(i.sender?._id));
            const rUser = i.receiver || i.recipient;
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
    }
    catch (error) {
        next(error);
    }
}
async function updateInterestStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid match interest ID format' });
        }
        const validStatuses = ['PENDING', 'ACCEPTED', 'DECLINED', 'REJECTED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }
        const interest = await Interest_1.Interest.findById(id);
        if (!interest) {
            return res.status(404).json({ success: false, message: 'Match interest not found' });
        }
        const oldStatus = interest.status;
        interest.status = status;
        await interest.save();
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'INTEREST_STATUS_UPDATED', `Updated interest ${id} status from ${oldStatus} to ${status}`, 'Interest', String(id));
        const populated = await Interest_1.Interest.findById(id)
            .populate('sender', 'fullName email mobile')
            .populate('receiver', 'fullName email mobile')
            .lean();
        res.json({
            success: true,
            message: `Interest status successfully changed to ${status}`,
            data: populated,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getShortlists(req, res, next) {
    try {
        const { page = 1, limit = 10, search, profession, city, community, verification, from, to, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
        const skip = (pageNumber - 1) * limitNumber;
        const query = {};
        // 1. Date Range Filter
        if (from || to) {
            query.createdAt = {};
            if (from) {
                const fromDate = new Date(from);
                if (!isNaN(fromDate.getTime()))
                    query.createdAt.$gte = fromDate;
            }
            if (to) {
                const toDate = new Date(to);
                if (!isNaN(toDate.getTime())) {
                    toDate.setHours(23, 59, 59, 999);
                    query.createdAt.$lte = toDate;
                }
            }
        }
        // 2. Profile-specific Filters (profession, city, community, verification)
        const profileConditions = {};
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
                User_1.User.find({
                    $or: [{ fullName: searchRegex }, { email: searchRegex }, { mobile: searchRegex }],
                }).select('_id'),
                Profile_1.Profile.find({
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
        }
        else if (Object.keys(profileConditions).length > 0) {
            const matchingProfiles = await Profile_1.Profile.find(profileConditions).select('_id');
            const profileIds = matchingProfiles.map((p) => p._id);
            query.profile = { $in: profileIds };
        }
        // 4. Sorting logic
        const sortOption = {};
        const sortField = String(sortBy);
        if (['createdAt', 'updatedAt'].includes(sortField)) {
            sortOption[sortField] = sortOrder === 'asc' ? 1 : -1;
        }
        else {
            sortOption.createdAt = -1;
        }
        // 5. Query execution with pagination
        const [total, rawShortlists, filterProfessions, filterCities, filterReligions] = await Promise.all([
            Shortlist_1.Shortlist.countDocuments(query),
            Shortlist_1.Shortlist.find(query)
                .populate({
                path: 'user',
                select: 'fullName email mobile verificationStatus isActive createdAt',
            })
                .populate({
                path: 'profile',
                select: 'displayName gender dob education degree profession company annualIncome city state country religion caste subCaste primaryPhoto photos verificationStatus maritalStatus height motherTongue about',
            })
                .sort(sortOption)
                .skip(skip)
                .limit(limitNumber)
                .lean(),
            Profile_1.Profile.distinct('profession'),
            Profile_1.Profile.distinct('city'),
            Profile_1.Profile.distinct('religion'),
        ]);
        // 6. Fetch bookmarker profiles for photos & avatars
        const bookmarkerUserIds = rawShortlists.map((s) => s.user?._id).filter(Boolean);
        const bookmarkerProfiles = await Profile_1.Profile.find({ user: { $in: bookmarkerUserIds } })
            .select('user primaryPhoto photos displayName')
            .lean();
        const bookmarkerProfileMap = new Map(bookmarkerProfiles.map((p) => [String(p.user), p]));
        const shortlists = rawShortlists.map((item) => {
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
    }
    catch (error) {
        next(error);
    }
}
async function deleteShortlist(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid shortlist ID format' });
        }
        const shortlist = await Shortlist_1.Shortlist.findById(id);
        if (!shortlist) {
            return res.status(404).json({ success: false, message: 'Shortlist bookmark not found' });
        }
        await Shortlist_1.Shortlist.findByIdAndDelete(id);
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'SHORTLIST_DELETED', `Deleted shortlist relation ${id} for user ${shortlist.user}`, 'Shortlist', String(id));
        res.json({
            success: true,
            message: 'Shortlist bookmark successfully removed',
        });
    }
    catch (error) {
        next(error);
    }
}
async function getMessages(req, res, next) {
    try {
        const { page = 1, limit = 10, status, compliance, search, sortBy = 'lastActivityAt', sortOrder = 'desc', } = req.query;
        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
        const skip = (pageNumber - 1) * limitNumber;
        const baseQuery = {};
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
            const safeSearch = (0, securityUtils_1.escapeRegex)(searchStr);
            const [matchingUsers, matchingProfiles] = await Promise.all([
                User_1.User.find({
                    $or: [
                        { fullName: { $regex: safeSearch, $options: 'i' } },
                        { email: { $regex: safeSearch, $options: 'i' } },
                    ],
                })
                    .select('_id')
                    .lean(),
                Profile_1.Profile.find({
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
                ...matchingUsers.map((u) => u._id),
                ...matchingProfiles.map((p) => p.user),
            ];
            query = {
                ...baseQuery,
                participants: { $in: matchedUserIds },
            };
        }
        // Sorting
        const sortOption = {};
        const validSortFields = {
            lastActivityAt: 'lastActivityAt',
            updatedAt: 'updatedAt',
            createdAt: 'createdAt',
            messageCount: 'messageCount',
        };
        const field = validSortFields[String(sortBy)] || 'lastActivityAt';
        sortOption[field] = sortOrder === 'asc' ? 1 : -1;
        // Execute queries
        const [totalConversations, totalMessages, rawConversations, flaggedThreads, flaggedMessages] = await Promise.all([
            Conversation_1.Conversation.countDocuments(query),
            Message_1.Message.countDocuments(),
            Conversation_1.Conversation.find(query)
                .populate('participants', 'fullName email mobile role verificationStatus')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNumber)
                .lean(),
            Conversation_1.Conversation.countDocuments({ complianceStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] } }),
            Message_1.Message.countDocuments({ moderationStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] } }),
        ]);
        // Fetch participant profile details (avatar, profession, city, etc.)
        const allParticipantIds = rawConversations
            .flatMap((c) => c.participants || [])
            .map((p) => p?._id)
            .filter(Boolean);
        const profiles = await Profile_1.Profile.find({ user: { $in: allParticipantIds } })
            .select('user displayName profession city primaryPhoto photos verificationStatus')
            .lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const conversations = rawConversations.map((conv) => {
            const enrichedParticipants = (conv.participants || []).map((user) => {
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
            activeThreads: await Conversation_1.Conversation.countDocuments({ status: 'ACTIVE' }),
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
    }
    catch (error) {
        next(error);
    }
}
async function getConversationMessages(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        }
        const conversation = await Conversation_1.Conversation.findById(id)
            .populate('participants', 'fullName email mobile role verificationStatus')
            .lean();
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation thread not found' });
        }
        // Enrich conversation participants with profiles
        const conv = conversation;
        const participantIds = (conv?.participants || []).map((p) => p._id);
        const profiles = await Profile_1.Profile.find({ user: { $in: participantIds } })
            .select('user displayName profession city primaryPhoto photos verificationStatus')
            .lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const enrichedParticipants = (conv?.participants || []).map((user) => {
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
        const rawMessages = await Message_1.Message.find({ conversation: id })
            .populate('sender', 'fullName email mobile')
            .populate('receiver', 'fullName email mobile')
            .sort({ createdAt: 1 })
            .lean();
        const messages = rawMessages.map((msg) => {
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
    }
    catch (error) {
        next(error);
    }
}
async function updateConversationStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status, complianceStatus } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        }
        const updateFields = {};
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
        const conversation = await Conversation_1.Conversation.findByIdAndUpdate(id, updateFields, { new: true })
            .populate('participants', 'fullName email')
            .lean();
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation thread not found' });
        }
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'CONVERSATION_MODERATED', `Updated conversation ${id} status: ${status || 'unchanged'}, compliance: ${complianceStatus || 'unchanged'}`, 'Conversation', String(id));
        res.json({
            success: true,
            message: 'Conversation moderation status successfully updated',
            data: conversation,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getMessageStats(req, res, next) {
    try {
        const [totalThreads, totalMessages, activeThreads, flaggedThreads, flaggedMessages] = await Promise.all([
            Conversation_1.Conversation.countDocuments(),
            Message_1.Message.countDocuments(),
            Conversation_1.Conversation.countDocuments({ status: 'ACTIVE' }),
            Conversation_1.Conversation.countDocuments({ complianceStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] } }),
            Message_1.Message.countDocuments({ moderationStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] } }),
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
    }
    catch (error) {
        next(error);
    }
}
async function updateMessageModeration(req, res, next) {
    try {
        const { id } = req.params;
        const { moderationStatus, flaggedReason } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid message ID' });
        }
        const validStatuses = ['SAFE', 'FLAGGED', 'UNDER_REVIEW', 'BLOCKED'];
        if (!validStatuses.includes(moderationStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid moderation status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }
        const updateFields = {
            moderationStatus,
            moderatedAt: new Date(),
        };
        if (moderationStatus === 'SAFE') {
            updateFields.flaggedReason = 'Marked safe by admin reviewer';
            updateFields.moderationCategory = 'NONE';
            updateFields.moderationConfidence = 'NONE';
            updateFields.moderationScore = 0;
        }
        else if (flaggedReason) {
            updateFields.flaggedReason = flaggedReason;
        }
        const message = await Message_1.Message.findByIdAndUpdate(id, updateFields, { new: true });
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        // Recalculate conversation compliance status
        const remainingFlaggedCount = await Message_1.Message.countDocuments({
            conversation: message.conversation,
            moderationStatus: { $in: ['FLAGGED', 'UNDER_REVIEW', 'BLOCKED'] },
        });
        let newConvCompliance = 'SAFE';
        if (remainingFlaggedCount > 0) {
            const hasBlocked = await Message_1.Message.exists({ conversation: message.conversation, moderationStatus: 'BLOCKED' });
            newConvCompliance = hasBlocked ? 'BLOCKED' : 'FLAGGED';
        }
        await Conversation_1.Conversation.findByIdAndUpdate(message.conversation, {
            complianceStatus: newConvCompliance,
        });
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'MESSAGE_MODERATED', `Updated message ${id} status to ${moderationStatus}. Remaining flagged: ${remainingFlaggedCount}`, 'Message', String(id));
        res.json({
            success: true,
            message: `Message marked as ${moderationStatus}`,
            data: {
                message,
                conversationComplianceStatus: newConvCompliance,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function simulateCompliance(req, res, next) {
    try {
        const { message } = req.body;
        const content = String(message || '');
        const result = (0, complianceDetector_1.detectCompliance)(content);
        res.json({
            success: true,
            data: {
                input: content,
                ...result,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function sendDemoSeedMessage(req, res, next) {
    try {
        const { conversationId, content } = req.body;
        if (!conversationId || !(0, securityUtils_1.isValidObjectId)(conversationId)) {
            return res.status(400).json({ success: false, message: 'Valid conversation ID is required' });
        }
        if (!content || !String(content).trim()) {
            return res.status(400).json({ success: false, message: 'Message content is required' });
        }
        const conversation = await Conversation_1.Conversation.findById(conversationId);
        if (!conversation || conversation.participants.length < 2) {
            return res.status(404).json({ success: false, message: 'Conversation not found or insufficient participants' });
        }
        const senderId = conversation.participants[0];
        const receiverId = conversation.participants[1];
        const cleanContent = String(content).trim();
        const complianceResult = (0, complianceDetector_1.detectCompliance)(cleanContent);
        const message = await Message_1.Message.create({
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
        const convUpdates = {
            lastMessage: cleanContent,
            lastActivityAt: new Date(),
            $inc: { messageCount: 1 },
        };
        if (complianceResult.status === 'FLAGGED') {
            convUpdates.complianceStatus = 'FLAGGED';
        }
        const updatedConv = await Conversation_1.Conversation.findByIdAndUpdate(conversation._id, convUpdates, { new: true });
        res.status(201).json({
            success: true,
            message: 'Demo test message sent and compliance evaluated successfully',
            data: {
                message,
                compliance: complianceResult,
                conversation: updatedConv,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function resetDemoTestMessages(req, res, next) {
    try {
        // Only clean synthetic test messages that contain phone numbers or direct contact attempts in demo conversations
        const syntheticMessages = await Message_1.Message.find({
            $or: [
                { content: { $regex: /(?:98765|call me|whatsapp me|contact me|my number)/i } },
                { moderationStatus: 'FLAGGED' },
            ],
        });
        const deletedCount = syntheticMessages.length;
        // Remove these synthetic test messages
        await Message_1.Message.deleteMany({
            _id: { $in: syntheticMessages.map((m) => m._id) },
        });
        // Recalculate message counts and compliance statuses for all conversations
        const allConversations = await Conversation_1.Conversation.find();
        for (const conv of allConversations) {
            const msgs = await Message_1.Message.find({ conversation: conv._id }).sort({ createdAt: 1 });
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].content : '';
            const hasFlagged = msgs.some((m) => m.moderationStatus === 'FLAGGED' || m.moderationStatus === 'BLOCKED');
            await Conversation_1.Conversation.findByIdAndUpdate(conv._id, {
                messageCount: msgs.length,
                lastMessage: lastMsg,
                complianceStatus: hasFlagged ? 'FLAGGED' : 'SAFE',
            });
        }
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'DEMO_DATA_RESET', `Safely cleaned ${deletedCount} synthetic simulation messages from test conversations`, 'Message');
        res.json({
            success: true,
            message: `Safely reset synthetic demo messages. Cleaned ${deletedCount} test records.`,
            data: { deletedCount },
        });
    }
    catch (error) {
        next(error);
    }
}
// 8. Safety & Abuse Moderation Reports
async function getReports(req, res, next) {
    try {
        const { page = 1, limit = 10, status, search, reason, from, to, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
        const skip = (pageNumber - 1) * limitNumber;
        const query = {};
        // 1. Status filter
        if (status && status !== 'ALL') {
            if (status === 'DISMISSED') {
                query.status = { $in: ['DISMISSED', 'REJECTED'] };
            }
            else {
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
                const fromDate = new Date(from);
                if (!isNaN(fromDate.getTime()))
                    query.createdAt.$gte = fromDate;
            }
            if (to) {
                const toDate = new Date(to);
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
                User_1.User.find({
                    $or: [{ fullName: searchRegex }, { email: searchRegex }, { mobile: searchRegex }],
                }).select('_id'),
                Profile_1.Profile.find({
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
        const sortOption = {};
        const sortField = String(sortBy);
        if (['createdAt', 'updatedAt', 'status', 'reason'].includes(sortField)) {
            sortOption[sortField] = sortOrder === 'asc' ? 1 : -1;
        }
        else {
            sortOption.createdAt = -1;
        }
        // 6. Execute count, paginated query, status tabs count, and distinct reasons
        const [total, rawReports, allCount, pendingCount, resolvedCount, dismissedCount, distinctReasons] = await Promise.all([
            Report_1.Report.countDocuments(query),
            Report_1.Report.find(query)
                .populate('reporter', 'fullName email mobile verificationStatus isActive')
                .populate('reportedUser', 'fullName email mobile verificationStatus isActive')
                .populate('moderator', 'fullName email')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNumber)
                .lean(),
            Report_1.Report.countDocuments(),
            Report_1.Report.countDocuments({ status: 'PENDING' }),
            Report_1.Report.countDocuments({ status: 'RESOLVED' }),
            Report_1.Report.countDocuments({ status: { $in: ['DISMISSED', 'REJECTED'] } }),
            Report_1.Report.distinct('reason'),
        ]);
        // 7. Fetch Profiles for all involved users (reporters and reported users) to show photos & rich profiles
        const userIdsToLookup = [
            ...rawReports.map((r) => r.reporter?._id),
            ...rawReports.map((r) => r.reportedUser?._id),
        ].filter(Boolean);
        const profiles = await Profile_1.Profile.find({ user: { $in: userIdsToLookup } })
            .select('user displayName gender dob height profession company annualIncome education degree city state country religion caste primaryPhoto photos verificationStatus about maritalStatus')
            .lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
        const reports = rawReports.map((item) => {
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
                actionTaken: item.actionTaken ||
                    (normalizedStatus === 'RESOLVED' ? 'RESOLVED' : normalizedStatus === 'DISMISSED' ? 'DISMISSED' : 'NONE'),
                targetType: item.targetType || 'PROFILE',
                messageSnippet: item.messageSnippet || '',
                resolvedAt: item.resolvedAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            };
        });
        // 8. Group reports by reported profile/user for unified safety view
        profiles.forEach((p) => {
            if (p.user)
                profileMap.set(String(p.user), p);
            if (p._id)
                profileMap.set(String(p._id), p);
        });
        const groupedMap = new Map();
        for (const r of reports) {
            const repUserId = r.reportedUser?._id ? String(r.reportedUser._id) : 'unknown';
            if (!groupedMap.has(repUserId)) {
                const targetProf = profileMap.get(repUserId) || null;
                const profStatus = targetProf?.status ||
                    (r.reportedUser?.isActive === false ? 'Suspended' : 'Active');
                const doctorName = targetProf?.displayName || r.reportedUser?.fullName || 'Doctor Profile';
                const profilePhoto = targetProf?.primaryPhoto ||
                    (targetProf?.photos && targetProf.photos[0]) ||
                    r.reportedUser?.photo ||
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
            if (r.status === 'PENDING')
                grp.pendingReports++;
            else if (r.status === 'UNDER_REVIEW')
                grp.underReviewReports++;
            else if (r.status === 'RESOLVED')
                grp.resolvedReports++;
            else if (r.status === 'DISMISSED' || r.status === 'REJECTED')
                grp.dismissedReports++;
            if (new Date(r.createdAt) > new Date(grp.latestReportDate)) {
                grp.latestReportDate = r.createdAt;
            }
        }
        // Determine overall status for each grouped profile
        for (const grp of groupedMap.values()) {
            if (grp.pendingReports > 0) {
                grp.overallReportStatus = 'PENDING';
                grp.overallStatus = 'PENDING';
            }
            else if (grp.underReviewReports > 0) {
                grp.overallReportStatus = 'UNDER_REVIEW';
                grp.overallStatus = 'UNDER_REVIEW';
            }
            else if (grp.resolvedReports > 0) {
                grp.overallReportStatus = 'RESOLVED';
                grp.overallStatus = 'RESOLVED';
            }
            else {
                grp.overallReportStatus = 'DISMISSED';
                grp.overallStatus = 'DISMISSED';
            }
        }
        const groupedProfiles = Array.from(groupedMap.values());
        // 9. Extra safety counts
        const [underReviewCount, multiReportProfilesAgg, suspendedCount, blockedCount] = await Promise.all([
            Report_1.Report.countDocuments({ status: 'UNDER_REVIEW' }),
            Report_1.Report.aggregate([
                { $group: { _id: '$reportedUser', count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 } } },
                { $count: 'multiCount' },
            ]),
            Profile_1.Profile.countDocuments({ status: 'Suspended' }),
            Profile_1.Profile.countDocuments({ status: 'Blocked' }),
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
    }
    catch (error) {
        next(error);
    }
}
async function getReportById(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid report ID format' });
        }
        const report = await Report_1.Report.findById(id)
            .populate('reporter', 'fullName email mobile verificationStatus isActive')
            .populate('reportedUser', 'fullName email mobile verificationStatus isActive')
            .populate('moderator', 'fullName email')
            .lean();
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        const rep = report;
        const [reporterProf, targetProf] = await Promise.all([
            Profile_1.Profile.findOne({ user: rep.reporter?._id }).lean(),
            Profile_1.Profile.findOne({ user: rep.reportedUser?._id }).lean(),
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
                        photo: reporterProf?.primaryPhoto || reporterProf?.photos?.[0] || null,
                    }
                    : null,
                reportedUser: rep.reportedUser
                    ? {
                        ...rep.reportedUser,
                        photo: targetProf?.primaryPhoto || targetProf?.photos?.[0] || null,
                        profile: targetProf,
                    }
                    : null,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function getReportsByProfile(req, res, next) {
    try {
        const { profileId } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(profileId)) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID format' });
        }
        // Resolve profile and user
        let profile = await Profile_1.Profile.findById(profileId).lean();
        let targetUserId = profile?.user;
        if (!profile) {
            // Check if profileId is actually a user ID
            const user = await User_1.User.findById(profileId).lean();
            if (user) {
                targetUserId = user._id;
                profile = (await Profile_1.Profile.findOne({ user: user._id }).lean());
            }
        }
        if (!targetUserId) {
            return res.status(404).json({ success: false, message: 'Profile or User not found' });
        }
        const [reports, targetUser, auditLogs] = await Promise.all([
            Report_1.Report.find({ reportedUser: targetUserId })
                .populate('reporter', 'fullName email mobile verificationStatus isActive')
                .populate('moderator', 'fullName email')
                .sort({ createdAt: -1 })
                .lean(),
            User_1.User.findById(targetUserId).select('-password').lean(),
            AuditLog_1.AuditLog.find({
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
    }
    catch (error) {
        next(error);
    }
}
async function updateReportStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status, notes, adminNotes, actionTaken } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid report ID format' });
        }
        const report = await Report_1.Report.findById(id);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        const prevStatus = report.status;
        const cleanStatus = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'REJECTED', 'ACTION_TAKEN'].includes(status)
            ? status
            : 'UNDER_REVIEW';
        report.status = cleanStatus;
        report.moderator = (req.user?.userId || req.user?._id);
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
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'REPORT_STATUS_UPDATED', `Updated report ID: ${report._id} status to ${cleanStatus}. Notes: ${report.adminNotes || 'None'}`, 'Report', String(report._id), {
            adminId: req.user?.userId,
            adminName: req.user?.fullName || req.user?.email,
            targetUserId: report.reportedUser,
            targetProfileId: report.reportedProfile,
            previousStatus: prevStatus,
            newStatus: cleanStatus,
            reason: report.adminNotes,
            relatedReportId: report._id,
        });
        res.json({
            success: true,
            message: `Report marked as ${cleanStatus}.`,
            data: report,
        });
    }
    catch (error) {
        next(error);
    }
}
async function resolveReport(req, res, next) {
    try {
        const { id } = req.params;
        const { notes, resolutionNotes, actionTaken } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid report ID format' });
        }
        const report = await Report_1.Report.findById(id);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        report.status = 'RESOLVED';
        report.resolutionNotes = (resolutionNotes || notes || '').trim();
        report.adminNotes = report.resolutionNotes;
        report.moderator = (req.user?.userId || req.user?._id);
        report.handledByAdminId = report.moderator;
        report.resolvedAt = new Date();
        report.actionTaken = actionTaken || 'RESOLVED';
        await report.save();
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'REPORT_RESOLVED', `Resolved abuse report ID: ${report._id}. Notes: ${report.resolutionNotes || 'No notes provided'}`, 'Report', String(report._id), {
            adminId: req.user?.userId,
            adminName: req.user?.fullName || req.user?.email,
            targetUserId: report.reportedUser,
            targetProfileId: report.reportedProfile,
            previousStatus: 'PENDING',
            newStatus: 'RESOLVED',
            reason: report.resolutionNotes,
            relatedReportId: report._id,
        });
        res.json({
            success: true,
            message: 'Report has been marked as RESOLVED and moderation action recorded.',
            data: report,
        });
    }
    catch (error) {
        next(error);
    }
}
async function dismissReport(req, res, next) {
    try {
        const { id } = req.params;
        const { notes, resolutionNotes } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid report ID format' });
        }
        const report = await Report_1.Report.findById(id);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        report.status = 'DISMISSED';
        report.resolutionNotes = (resolutionNotes || notes || '').trim();
        report.adminNotes = report.resolutionNotes;
        report.moderator = (req.user?.userId || req.user?._id);
        report.handledByAdminId = report.moderator;
        report.resolvedAt = new Date();
        report.actionTaken = 'DISMISSED';
        await report.save();
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'REPORT_DISMISSED', `Dismissed abuse report ID: ${report._id}. Reason: ${report.resolutionNotes || 'Deemed non-violating'}`, 'Report', String(report._id), {
            adminId: req.user?.userId,
            adminName: req.user?.fullName || req.user?.email,
            targetUserId: report.reportedUser,
            targetProfileId: report.reportedProfile,
            previousStatus: 'PENDING',
            newStatus: 'DISMISSED',
            reason: report.resolutionNotes,
            relatedReportId: report._id,
        });
        res.json({
            success: true,
            message: 'Report has been dismissed as non-violating.',
            data: report,
        });
    }
    catch (error) {
        next(error);
    }
}
async function blockUserFromReport(req, res, next) {
    try {
        const { id } = req.params;
        const { reason, notes } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid report ID format' });
        }
        const report = await Report_1.Report.findById(id);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        const targetUser = await User_1.User.findById(report.reportedUser);
        if (targetUser) {
            targetUser.isActive = false;
            targetUser.status = 'Blocked';
            await targetUser.save();
        }
        const targetProfile = await Profile_1.Profile.findOne({ user: report.reportedUser });
        if (targetProfile) {
            targetProfile.status = 'Blocked';
            targetProfile.statusReason = reason || 'Blocked following member reports';
            await targetProfile.save();
        }
        report.status = 'RESOLVED';
        report.actionTaken = 'ACCOUNT_BLOCKED';
        report.resolutionNotes = (notes || reason || `Account suspended due to report: ${report.reason}`).trim();
        report.adminNotes = report.resolutionNotes;
        report.moderator = (req.user?.userId || req.user?._id);
        report.handledByAdminId = report.moderator;
        report.resolvedAt = new Date();
        await report.save();
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'USER_BLOCKED_VIA_REPORT', `Blocked user ${report.reportedUser} following report ${report._id}`, 'User', String(report.reportedUser), {
            adminId: req.user?.userId,
            adminName: req.user?.fullName || req.user?.email,
            targetUserId: report.reportedUser,
            targetProfileId: targetProfile?._id,
            previousStatus: 'Active',
            newStatus: 'Blocked',
            reason: report.resolutionNotes,
            relatedReportId: report._id,
        });
        // Send notification to blocked user (without exposing reporter)
        await Notification_1.Notification.create({
            user: report.reportedUser,
            type: 'SAFETY',
            title: 'Account Status Notice',
            message: 'Your profile has been blocked due to a violation of platform policies.',
        }).catch(() => { });
        res.json({
            success: true,
            message: 'Reported user account has been blocked and report marked as resolved.',
            data: report,
        });
    }
    catch (error) {
        next(error);
    }
}
// ── Profile Safety & Moderation Actions ──
async function updateProfileSafetyStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status, reason, notes } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid profile or user ID' });
        }
        // Resolve profile and user
        let profile = await Profile_1.Profile.findById(id);
        let user = profile ? await User_1.User.findById(profile.user) : await User_1.User.findById(id);
        if (!profile && user) {
            profile = await Profile_1.Profile.findOne({ user: user._id });
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
        const adminName = req.user?.fullName || adminEmail;
        if (profile) {
            profile.status = newStatus;
            profile.statusReason = (reason || notes || '').trim();
            profile.statusChangedAt = new Date();
            profile.statusChangedBy = adminId;
            if (newStatus === 'Deleted') {
                profile.isDeleted = true;
                profile.deletedAt = new Date();
                profile.deletedBy = adminId;
                profile.deletionReason = (reason || notes || '').trim();
            }
            else if (profile.isDeleted && newStatus === 'Active') {
                profile.isDeleted = false;
            }
            await profile.save();
        }
        if (user) {
            user.status = newStatus;
            if (newStatus === 'Suspended' || newStatus === 'Blocked' || newStatus === 'Deleted') {
                user.isActive = false;
            }
            else if (newStatus === 'Active') {
                user.isActive = true;
            }
            if (newStatus === 'Deleted') {
                user.isDeleted = true;
                user.deletedAt = new Date();
                user.deletedBy = adminId;
                user.deletionReason = (reason || notes || '').trim();
            }
            else if (user.isDeleted && newStatus === 'Active') {
                user.isDeleted = false;
            }
            await user.save();
        }
        // Record audit log
        await logAdminAction(adminEmail, 'PROFILE_STATUS_CHANGED', `Changed status of profile ${profile?._id || user?._id} from ${previousStatus} to ${newStatus}. Reason: ${reason || notes || 'None'}`, 'Profile', String(profile?._id || user?._id), {
            adminId,
            adminName,
            targetProfileId: profile?._id,
            targetUserId: user?._id,
            previousStatus,
            newStatus,
            reason: reason || notes,
        });
        // Notify user if appropriate
        if (user && newStatus === 'Under Review') {
            await Notification_1.Notification.create({
                user: user._id,
                type: 'SAFETY',
                title: 'Profile Under Review',
                message: 'Your profile is currently under review by our safety and compliance team.',
            }).catch(() => { });
        }
        else if (user && newStatus === 'Suspended') {
            await Notification_1.Notification.create({
                user: user._id,
                type: 'SAFETY',
                title: 'Profile Suspended',
                message: 'Your profile has been temporarily suspended.',
            }).catch(() => { });
        }
        else if (user && newStatus === 'Blocked') {
            await Notification_1.Notification.create({
                user: user._id,
                type: 'SAFETY',
                title: 'Profile Blocked',
                message: 'Your profile has been blocked due to a violation of platform policies.',
            }).catch(() => { });
        }
        res.json({
            success: true,
            message: `Profile status updated to ${newStatus}.`,
            data: {
                profile,
                user,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function sendProfileWarning(req, res, next) {
    try {
        const { id } = req.params;
        const { message, warningTitle = 'Safety & Platform Compliance Notice' } = req.body;
        if (!message || !String(message).trim()) {
            return res.status(400).json({ success: false, message: 'A warning message is required.' });
        }
        let profile = await Profile_1.Profile.findById(id);
        let user = profile ? await User_1.User.findById(profile.user) : await User_1.User.findById(id);
        if (!profile && user) {
            profile = await Profile_1.Profile.findOne({ user: user._id });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const cleanMsg = String(message).trim();
        await Notification_1.Notification.create({
            user: user._id,
            type: 'WARNING',
            title: warningTitle,
            message: cleanMsg,
        });
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'WARNING_SENT', `Sent warning to profile ${profile?._id || user._id}. Message: ${cleanMsg}`, 'Profile', String(profile?._id || user._id), {
            adminId: req.user?.userId,
            adminName: req.user?.fullName || req.user?.email,
            targetProfileId: profile?._id,
            targetUserId: user._id,
            reason: cleanMsg,
        });
        res.json({
            success: true,
            message: 'Official warning has been delivered to the member.',
        });
    }
    catch (error) {
        next(error);
    }
}
async function suspendProfile(req, res, next) {
    try {
        const { id } = req.params;
        const { reason = 'Temporarily suspended by administration pending compliance review' } = req.body;
        let profile = await Profile_1.Profile.findById(id);
        let user = profile ? await User_1.User.findById(profile.user) : await User_1.User.findById(id);
        if (!profile && user) {
            profile = await Profile_1.Profile.findOne({ user: user._id });
        }
        if (!user && !profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const previousStatus = profile?.status || 'Active';
        if (profile) {
            profile.status = 'Suspended';
            profile.statusReason = reason;
            profile.statusChangedAt = new Date();
            profile.statusChangedBy = req.user?.userId;
            await profile.save();
        }
        if (user) {
            user.status = 'Suspended';
            user.isActive = false;
            user.suspensionReason = reason;
            user.suspendedAt = new Date();
            user.suspendedBy = req.user?.userId;
            await user.save();
        }
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'PROFILE_SUSPENDED', `Suspended profile ${profile?._id || user?._id}. Reason: ${reason}`, 'Profile', String(profile?._id || user?._id), {
            adminId: req.user?.userId,
            adminName: req.user?.fullName || req.user?.email,
            targetProfileId: profile?._id,
            targetUserId: user?._id,
            previousStatus,
            newStatus: 'Suspended',
            reason,
        });
        if (user) {
            await Notification_1.Notification.create({
                user: user._id,
                type: 'SAFETY',
                title: 'Account Suspended',
                message: 'Your profile has been temporarily suspended.',
            }).catch(() => { });
        }
        res.json({
            success: true,
            message: 'Profile has been temporarily suspended.',
            data: { profile, user },
        });
    }
    catch (error) {
        next(error);
    }
}
async function blockProfileAdmin(req, res, next) {
    try {
        const { id } = req.params;
        const { reason = 'Blocked by platform administrator' } = req.body;
        let profile = await Profile_1.Profile.findById(id);
        let user = profile ? await User_1.User.findById(profile.user) : await User_1.User.findById(id);
        if (!profile && user) {
            profile = await Profile_1.Profile.findOne({ user: user._id });
        }
        if (!user && !profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const previousStatus = profile?.status || 'Active';
        if (profile) {
            profile.status = 'Blocked';
            profile.statusReason = reason;
            profile.statusChangedAt = new Date();
            profile.statusChangedBy = req.user?.userId;
            await profile.save();
        }
        if (user) {
            user.status = 'Blocked';
            user.isActive = false;
            await user.save();
        }
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'PROFILE_BLOCKED', `Blocked profile ${profile?._id || user?._id}. Reason: ${reason}`, 'Profile', String(profile?._id || user?._id), {
            adminId: req.user?.userId,
            adminName: req.user?.fullName || req.user?.email,
            targetProfileId: profile?._id,
            targetUserId: user?._id,
            previousStatus,
            newStatus: 'Blocked',
            reason,
        });
        if (user) {
            await Notification_1.Notification.create({
                user: user._id,
                type: 'SAFETY',
                title: 'Account Blocked',
                message: 'Your profile has been blocked due to a violation of platform policies.',
            }).catch(() => { });
        }
        res.json({
            success: true,
            message: 'Profile has been blocked.',
            data: { profile, user },
        });
    }
    catch (error) {
        next(error);
    }
}
async function deleteProfileAdmin(req, res, next) {
    try {
        const { id } = req.params;
        const reason = (req.body?.reason || req.query?.reason || 'Deleted by administrator').toString();
        let profile = await Profile_1.Profile.findById(id);
        let user = profile ? await User_1.User.findById(profile.user) : await User_1.User.findById(id);
        if (!profile && user) {
            profile = await Profile_1.Profile.findOne({ user: user._id });
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
            profile.deletedAt = new Date();
            profile.deletedBy = adminId;
            profile.deletionReason = reason;
            await profile.save();
        }
        // Soft delete user
        if (user) {
            user.status = 'Deleted';
            user.isDeleted = true;
            user.isActive = false;
            user.deletedAt = new Date();
            user.deletedBy = adminId;
            user.deletionReason = reason;
            await user.save();
        }
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'PROFILE_DELETED', `Soft-deleted profile ${profile?._id || user?._id}. Reason: ${reason}`, 'Profile', String(profile?._id || user?._id), {
            adminId,
            adminName: req.user?.fullName || req.user?.email,
            targetProfileId: profile?._id,
            targetUserId: user?._id,
            previousStatus,
            newStatus: 'Deleted',
            reason,
        });
        res.json({
            success: true,
            message: 'Profile has been safely soft-deleted.',
        });
    }
    catch (error) {
        next(error);
    }
}
async function getSafetyStats(req, res, next) {
    try {
        const [totalReports, pendingReports, underReviewReports, resolvedReports, dismissedReports, multiReportProfilesAgg, suspendedProfiles, blockedProfiles, deletedProfiles,] = await Promise.all([
            Report_1.Report.countDocuments(),
            Report_1.Report.countDocuments({ status: 'PENDING' }),
            Report_1.Report.countDocuments({ status: 'UNDER_REVIEW' }),
            Report_1.Report.countDocuments({ status: 'RESOLVED' }),
            Report_1.Report.countDocuments({ status: { $in: ['DISMISSED', 'REJECTED'] } }),
            Report_1.Report.aggregate([
                { $group: { _id: '$reportedUser', count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 } } },
                { $count: 'multiCount' },
            ]),
            Profile_1.Profile.countDocuments({ status: 'Suspended' }),
            Profile_1.Profile.countDocuments({ status: 'Blocked' }),
            Profile_1.Profile.countDocuments({ status: 'Deleted' }),
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
    }
    catch (error) {
        next(error);
    }
}
async function getSafetyAuditLogs(req, res, next) {
    try {
        const { profileId } = req.params;
        const query = {};
        if (profileId && (0, securityUtils_1.isValidObjectId)(profileId)) {
            query.$or = [
                { targetProfileId: profileId },
                { targetUserId: profileId },
                { targetId: profileId },
            ];
        }
        else {
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
        const logs = await AuditLog_1.AuditLog.find(query).sort({ createdAt: -1 }).limit(100).lean();
        res.json({
            success: true,
            data: logs,
        });
    }
    catch (error) {
        next(error);
    }
}
// 9. Platform Notifications & Broadcast Announcements
async function getNotifications(req, res, next) {
    try {
        const { page = 1, limit = 25, type, targetType, status, search } = req.query;
        const query = {};
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
            const safeSearch = (0, securityUtils_1.escapeRegex)(searchStr);
            query.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { message: { $regex: safeSearch, $options: 'i' } },
            ];
        }
        const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
        const pageNumber = Math.max(1, Number(page) || 1);
        const skip = (pageNumber - 1) * pageSize;
        const [total, broadcasts] = await Promise.all([
            Broadcast_1.Broadcast.countDocuments(query),
            Broadcast_1.Broadcast.find(query)
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
    }
    catch (error) {
        next(error);
    }
}
async function getBroadcastById(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }
        const broadcast = await Broadcast_1.Broadcast.findById(id).populate('createdBy', 'fullName email role');
        if (!broadcast) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.json({ success: true, data: broadcast });
    }
    catch (error) {
        next(error);
    }
}
async function getRecipientCount(req, res, next) {
    try {
        const { targetType = 'ALL_USERS', targetUserIds } = req.body;
        const count = await (0, notificationBroadcastService_1.getRecipientCount)(targetType, targetUserIds);
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        next(error);
    }
}
async function searchAdminUsers(req, res, next) {
    try {
        const { q = '', page = 1, limit = 10 } = req.query;
        const searchStr = String(q).trim();
        const query = { role: 'user' };
        if (searchStr) {
            const safeSearch = (0, securityUtils_1.escapeRegex)(searchStr);
            const orConditions = [
                { fullName: { $regex: safeSearch, $options: 'i' } },
                { email: { $regex: safeSearch, $options: 'i' } },
                { mobile: { $regex: safeSearch, $options: 'i' } },
            ];
            if ((0, securityUtils_1.isValidObjectId)(searchStr)) {
                orConditions.push({ _id: searchStr });
            }
            query.$or = orConditions;
        }
        const pageSize = Math.min(50, Math.max(1, Number(limit) || 10));
        const pageNumber = Math.max(1, Number(page) || 1);
        const skip = (pageNumber - 1) * pageSize;
        const [total, users] = await Promise.all([
            User_1.User.countDocuments(query),
            User_1.User.find(query)
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
    }
    catch (error) {
        next(error);
    }
}
async function sendNotification(req, res, next) {
    try {
        const { title, message, type = 'SYSTEM', targetType = 'ALL_USERS', target, // fallback if legacy frontend passes target='ALL'
        targetUserIds, userId, // fallback if single userId passed
        actionUrl, link, } = req.body;
        if (!title || !String(title).trim()) {
            return res.status(400).json({ success: false, message: 'Announcement title is required' });
        }
        if (!message || !String(message).trim()) {
            return res.status(400).json({ success: false, message: 'Notification message is required' });
        }
        const cleanTitle = String(title).trim().slice(0, 150);
        const cleanMessage = String(message).trim().slice(0, 2000);
        const cleanActionUrl = (0, notificationBroadcastService_1.sanitizeActionUrl)(actionUrl || link);
        let effectiveTargetType = targetType;
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
        const adminUser = await User_1.User.findById(adminId);
        const adminEmail = adminUser?.email || 'admin@wonderfuljodi.com';
        const io = req.app.get('io');
        const broadcast = await (0, notificationBroadcastService_1.createAndDispatchBroadcast)({
            adminId: String(adminId),
            adminEmail,
            title: cleanTitle,
            message: cleanMessage,
            type: (type || 'SYSTEM'),
            targetType: (effectiveTargetType || 'ALL_USERS'),
            targetUserIds: effectiveTargetUserIds,
            actionUrl: cleanActionUrl,
            io,
        });
        res.json({
            success: true,
            message: `Notification broadcasted successfully to ${broadcast.totalRecipients} recipient(s)`,
            data: broadcast,
        });
    }
    catch (error) {
        next(error);
    }
}
async function deleteBroadcast(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }
        const broadcast = await Broadcast_1.Broadcast.findByIdAndDelete(id);
        if (!broadcast) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        await logAdminAction(req.user?.email || 'admin@wonderfuljodi.com', 'BROADCAST_DELETED', `Deleted broadcast record "${broadcast.title}" (ID: ${id})`, 'Broadcast', id);
        res.json({ success: true, message: 'Notification record removed successfully' });
    }
    catch (error) {
        next(error);
    }
}
// 10. Admin Accounts & Roles
async function getAdmins(req, res, next) {
    try {
        const admins = await User_1.User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });
        const adminDocs = await Admin_1.Admin.find().populate('user', 'fullName email mobile');
        res.json({
            success: true,
            data: {
                admins,
                adminPermissions: adminDocs,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function createAdmin(req, res, next) {
    try {
        const { fullName, email, mobile, password, permissions } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: 'Full name, email, and password are required' });
        }
        const existing = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 12);
        const user = await User_1.User.create({
            fullName,
            email: email.toLowerCase(),
            mobile: mobile || `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
            password: hashedPassword,
            role: 'admin',
            verified: true,
            verificationStatus: 'VERIFIED',
        });
        await Admin_1.Admin.create({
            user: user._id,
            permissions: permissions || ['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports'],
        });
        await logAdminAction(req.user?.role || 'admin', 'ADMIN_CREATED', `Created administrator account for ${user.email}`, 'Admin', String(user._id));
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
    }
    catch (error) {
        next(error);
    }
}
async function updateAdmin(req, res, next) {
    try {
        const { permissions, fullName, mobile } = req.body;
        const user = await User_1.User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }
        if (fullName || mobile) {
            await User_1.User.findByIdAndUpdate(user._id, {
                ...(fullName && { fullName }),
                ...(mobile && { mobile }),
            });
        }
        if (permissions) {
            await Admin_1.Admin.findOneAndUpdate({ user: user._id }, { permissions }, { upsert: true, new: true });
        }
        await logAdminAction(req.user?.role || 'admin', 'ADMIN_UPDATED', `Updated admin settings for ${user.email}`, 'Admin', String(user._id));
        res.json({ success: true, message: 'Admin permissions updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
// 11. Platform Settings
async function getSettings(req, res, next) {
    try {
        let settings = await Setting_1.Setting.findOne();
        if (!settings) {
            settings = await Setting_1.Setting.create({
                siteName: 'Wonderful Jodi',
                supportEmail: 'support@wonderfuljodi.com',
                supportPhone: '+91 096075 59547',
                tollFreeNumber: '+91 096075 59547',
                officeAddress: 'A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034',
            });
        }
        res.json({ success: true, data: settings });
    }
    catch (error) {
        next(error);
    }
}
async function updateSettings(req, res, next) {
    try {
        const settings = await Setting_1.Setting.findOneAndUpdate({}, { $set: req.body }, { upsert: true, new: true });
        (0, maintenanceMiddleware_1.invalidateMaintenanceCache)();
        await logAdminAction(req.user?.role || 'admin', 'SETTINGS_UPDATED', 'Updated platform settings configuration', 'Setting');
        res.json({ success: true, data: settings, message: 'Settings updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function getMaintenanceSettings(req, res, next) {
    try {
        let settings = await Setting_1.Setting.findOne();
        if (!settings) {
            settings = await Setting_1.Setting.create({});
        }
        res.json({
            success: true,
            data: {
                maintenanceMode: Boolean(settings.maintenanceMode),
                maintenanceBanner: Boolean(settings.maintenanceBanner),
                maintenanceTitle: settings.maintenanceTitle || "We'll Be Back Soon",
                maintenanceMessage: settings.maintenanceMessage ||
                    'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
                maintenanceEstimatedEndTime: settings.maintenanceEstimatedEndTime,
                allowAdminAccess: settings.allowAdminAccess !== false,
                maintenanceUpdatedBy: settings.maintenanceUpdatedBy || '',
                updatedAt: settings.updatedAt,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateMaintenanceSettings(req, res, next) {
    try {
        const { maintenanceMode, maintenanceBanner, maintenanceTitle, maintenanceMessage, maintenanceEstimatedEndTime, allowAdminAccess, } = req.body;
        const updatePayload = {};
        if (typeof maintenanceMode === 'boolean')
            updatePayload.maintenanceMode = maintenanceMode;
        if (typeof maintenanceBanner === 'boolean')
            updatePayload.maintenanceBanner = maintenanceBanner;
        if (typeof maintenanceTitle === 'string')
            updatePayload.maintenanceTitle = maintenanceTitle.trim();
        if (typeof maintenanceMessage === 'string')
            updatePayload.maintenanceMessage = maintenanceMessage.trim();
        if (maintenanceEstimatedEndTime !== undefined) {
            updatePayload.maintenanceEstimatedEndTime = maintenanceEstimatedEndTime
                ? new Date(maintenanceEstimatedEndTime)
                : null;
        }
        if (typeof allowAdminAccess === 'boolean')
            updatePayload.allowAdminAccess = allowAdminAccess;
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        updatePayload.maintenanceUpdatedBy = adminEmail;
        const prevSettings = await Setting_1.Setting.findOne();
        const settings = await Setting_1.Setting.findOneAndUpdate({}, { $set: updatePayload }, { upsert: true, new: true });
        if (!settings)
            throw new Error('Failed to update settings');
        (0, maintenanceMiddleware_1.invalidateMaintenanceCache)();
        const action = updatePayload.maintenanceMode !== undefined
            ? updatePayload.maintenanceMode
                ? 'MAINTENANCE_ENABLED'
                : 'MAINTENANCE_DISABLED'
            : 'MAINTENANCE_CONFIG_UPDATED';
        await logAdminAction(adminEmail, action, `Maintenance settings updated: Mode=${settings.maintenanceMode}, Banner=${settings.maintenanceBanner}`, 'Setting', String(settings._id));
        await SecurityLog_1.SecurityLog.create({
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
    }
    catch (error) {
        next(error);
    }
}
// 12. Contact Inquiries
async function getInquiries(req, res, next) {
    try {
        const { status } = req.query;
        const query = {};
        if (status && status !== 'ALL')
            query.status = status;
        const inquiries = await ContactInquiry_1.ContactInquiry.find(query).sort({ createdAt: -1 });
        res.json({ success: true, data: inquiries });
    }
    catch (error) {
        next(error);
    }
}
async function updateInquiryStatus(req, res, next) {
    try {
        const { status } = req.body;
        const inquiry = await ContactInquiry_1.ContactInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        res.json({ success: true, data: inquiry });
    }
    catch (error) {
        next(error);
    }
}
// 13. Audit Trail Logs
async function getAuditLogs(req, res, next) {
    try {
        const logs = await AuditLog_1.AuditLog.find().sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, data: logs });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=adminController.js.map