"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyReferralDashboard = getMyReferralDashboard;
exports.recordReferralClick = recordReferralClick;
exports.getAdminReferrals = getAdminReferrals;
exports.getAdminReferralConfig = getAdminReferralConfig;
exports.updateAdminReferralConfig = updateAdminReferralConfig;
const Referral_1 = require("../models/Referral");
const ReferralRewardConfig_1 = require("../models/ReferralRewardConfig");
const ReferralRewardRecord_1 = require("../models/ReferralRewardRecord");
const AuditLog_1 = require("../models/AuditLog");
const referralService_1 = require("../services/referralService");
/**
 * Member: Get my referral dashboard (/api/referrals/me)
 */
async function getMyReferralDashboard(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }
        const dashboardData = await (0, referralService_1.getMemberReferralDashboard)(userId);
        res.json({
            success: true,
            data: dashboardData,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Public: Track Referral Link Click (POST /api/referrals/track-click)
 */
async function recordReferralClick(req, res, next) {
    try {
        const { referralCode } = req.body;
        if (!referralCode) {
            return res.status(400).json({ success: false, message: 'Referral code is required.' });
        }
        const clickRecord = await (0, referralService_1.trackReferralClick)(referralCode, req);
        res.json({
            success: true,
            message: 'Referral tracked',
            data: clickRecord ? { id: clickRecord._id, status: clickRecord.status } : null,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Referral Analytics & Management Dashboard (GET /api/admin/referrals)
 */
async function getAdminReferrals(req, res, next) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const status = req.query.status?.toUpperCase();
        const search = req.query.search;
        const query = {};
        if (status && status !== 'ALL') {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { referralCode: { $regex: search, $options: 'i' } },
                { referrerCandidateId: { $regex: search, $options: 'i' } },
                { referredCandidateId: { $regex: search, $options: 'i' } },
            ];
        }
        // Compute Summary Analytics
        const totalReferrals = await Referral_1.Referral.countDocuments();
        const registeredCount = await Referral_1.Referral.countDocuments({ status: { $ne: 'CLICKED' } });
        const qualifiedCount = await Referral_1.Referral.countDocuments({ status: { $in: ['QUALIFIED', 'REWARDED'] } });
        const rewardsIssued = await ReferralRewardRecord_1.ReferralRewardRecord.countDocuments();
        const rewardsUsed = await ReferralRewardRecord_1.ReferralRewardRecord.countDocuments({ status: 'USED' });
        const pendingReferrals = await Referral_1.Referral.countDocuments({ status: 'REGISTERED' });
        const totalCount = await Referral_1.Referral.countDocuments(query);
        const referrals = await Referral_1.Referral.find(query)
            .populate('referrerUserId', 'fullName email mobile')
            .populate('referredUserId', 'fullName email mobile createdAt')
            .populate('couponId', 'couponCode discountType discountValue status')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const formattedReferrals = referrals.map((r) => {
            const referrer = r.referrerUserId;
            const referred = r.referredUserId;
            const coupon = r.couponId;
            return {
                id: r._id,
                referrer: {
                    name: referrer?.fullName || 'Doctor Candidate',
                    email: referrer?.email || '',
                    candidateId: r.referrerCandidateId,
                    referralCode: r.referralCode,
                },
                referred: {
                    name: referred?.fullName || 'Pending Registration',
                    email: referred?.email || '',
                    candidateId: r.referredCandidateId || 'N/A',
                    registeredAt: r.registeredAt || null,
                },
                referral: {
                    clickedAt: r.clickedAt,
                    registeredAt: r.registeredAt,
                    qualifiedAt: r.qualifiedAt,
                    status: r.status,
                    source: r.source || 'direct_link',
                },
                reward: {
                    rewardStatus: r.rewardStatus,
                    couponCode: coupon?.couponCode || null,
                    couponStatus: coupon?.status || null,
                    discountValue: coupon?.discountValue || null,
                },
                createdAt: r.createdAt,
            };
        });
        res.json({
            success: true,
            data: {
                analytics: {
                    totalReferrals,
                    registeredCount,
                    qualifiedCount,
                    rewardsIssued,
                    rewardsUsed,
                    pendingReferrals,
                },
                referrals: formattedReferrals,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    pages: Math.ceil(totalCount / limit),
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Get Referral Reward Configuration (GET /api/admin/referral-rewards/config)
 */
async function getAdminReferralConfig(req, res, next) {
    try {
        const config = await (0, ReferralRewardConfig_1.getActiveReferralConfig)();
        res.json({
            success: true,
            data: config,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Update Referral Reward Configuration (PUT /api/admin/referral-rewards/config)
 */
async function updateAdminReferralConfig(req, res, next) {
    try {
        const { requiredReferrals, qualificationEvent, rewardType, rewardValue, rewardPlan, couponValidityDays, isRecurringMilestone, isActive, } = req.body;
        let config = await ReferralRewardConfig_1.ReferralRewardConfig.findOne().sort({ updatedAt: -1 });
        const oldConfig = config ? config.toObject() : {};
        if (!config) {
            config = new ReferralRewardConfig_1.ReferralRewardConfig();
        }
        if (requiredReferrals !== undefined)
            config.requiredReferrals = Math.max(1, Number(requiredReferrals));
        if (qualificationEvent)
            config.qualificationEvent = qualificationEvent;
        if (rewardType)
            config.rewardType = rewardType;
        if (rewardValue !== undefined)
            config.rewardValue = Math.max(0, Number(rewardValue));
        if (rewardPlan)
            config.rewardPlan = rewardPlan;
        if (couponValidityDays !== undefined)
            config.couponValidityDays = Math.max(1, Number(couponValidityDays));
        if (isRecurringMilestone !== undefined)
            config.isRecurringMilestone = Boolean(isRecurringMilestone);
        if (isActive !== undefined)
            config.isActive = Boolean(isActive);
        config.updatedBy = req.user?.userId;
        await config.save();
        await AuditLog_1.AuditLog.create({
            adminUser: req.user?.userId,
            adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
            action: 'REFERRAL_CONFIG_UPDATED',
            targetModel: 'ReferralRewardConfig',
            targetId: String(config._id),
            details: `Updated referral requirement to ${config.requiredReferrals} qualifying referrals for ${config.rewardType}`,
            metadata: { oldConfig, newConfig: config.toObject() },
            status: 'SUCCESS',
        });
        res.json({
            success: true,
            message: 'Referral reward configuration updated successfully.',
            data: config,
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=referralController.js.map