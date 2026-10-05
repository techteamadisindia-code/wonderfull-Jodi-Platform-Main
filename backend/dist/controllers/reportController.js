"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitReport = submitReport;
exports.getMyReports = getMyReports;
const Report_1 = require("../models/Report");
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const prismaBridge_1 = __importDefault(require("../db/prismaBridge"));
async function submitReport(req, res, next) {
    try {
        const reporterId = req.user?.userId || req.user?._id;
        if (!reporterId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { reportedUserId, profileId, reason, details, description, targetType = 'PROFILE', messageSnippet } = req.body;
        if (!reason || String(reason).trim() === '') {
            return res.status(400).json({ success: false, message: 'Please specify a reason for the report.' });
        }
        let targetUserId = reportedUserId;
        let targetProfileId = undefined;
        // If profileId was supplied instead of reportedUserId, resolve target user from profile
        if (!targetUserId && profileId) {
            if (!prismaBridge_1.default.Types.ObjectId.isValid(profileId)) {
                return res.status(400).json({ success: false, message: 'Invalid profile ID format' });
            }
            const prof = await Profile_1.Profile.findById(profileId);
            if (!prof) {
                return res.status(404).json({ success: false, message: 'Reported profile not found' });
            }
            targetUserId = prof.user;
        }
        if (!targetUserId || !prismaBridge_1.default.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ success: false, message: 'A valid reported user or profile ID is required.' });
        }
        if (String(reporterId) === String(targetUserId)) {
            return res.status(400).json({ success: false, message: 'You cannot report your own account.' });
        }
        const targetUser = await User_1.User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Reported user account not found.' });
        }
        // Check duplicate pending report in the last 10 minutes to prevent spamming
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const existingPending = await Report_1.Report.findOne({
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
        if (!profileId && targetUserId) {
            const p = await Profile_1.Profile.findOne({ user: targetUserId }).select('_id');
            if (p) {
                targetProfileId = p._id;
            }
        }
        else if (profileId && prismaBridge_1.default.Types.ObjectId.isValid(profileId)) {
            targetProfileId = profileId;
        }
        const report = await Report_1.Report.create({
            reporter: reporterId,
            reportedUser: targetUserId,
            reportedProfile: targetProfileId,
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
    }
    catch (error) {
        next(error);
    }
}
async function getMyReports(req, res, next) {
    try {
        const reporterId = req.user?.userId || req.user?._id;
        if (!reporterId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const reports = await Report_1.Report.find({ reporter: reporterId })
            .sort({ createdAt: -1 })
            .select('reason description details status actionTaken targetType createdAt updatedAt resolvedAt')
            .lean();
        res.json({
            success: true,
            data: reports,
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=reportController.js.map