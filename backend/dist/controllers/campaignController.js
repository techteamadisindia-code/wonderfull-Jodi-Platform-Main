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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePublicCampaigns = getActivePublicCampaigns;
exports.getAdminCampaigns = getAdminCampaigns;
exports.createAdminCampaign = createAdminCampaign;
exports.updateAdminCampaign = updateAdminCampaign;
exports.previewMemberEligibility = previewMemberEligibility;
exports.deleteAdminCampaign = deleteAdminCampaign;
const Campaign_1 = require("../models/Campaign");
const AuditLog_1 = require("../models/AuditLog");
const offerEngine_1 = require("../services/offerEngine");
async function logAudit(req, action, targetId, details, metadata) {
    try {
        await AuditLog_1.AuditLog.create({
            adminUser: req.user?.userId,
            adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
            action,
            targetModel: 'Campaign',
            targetId,
            details,
            metadata,
            status: 'SUCCESS',
        });
    }
    catch (err) {
        console.warn('AuditLog creation warning:', err);
    }
}
/**
 * Public: Get active promotional campaign banners
 */
async function getActivePublicCampaigns(req, res, next) {
    try {
        const now = new Date();
        const campaigns = await Campaign_1.Campaign.find({
            status: 'ACTIVE',
            startDate: { $lte: now },
            endDate: { $gte: now },
        })
            .select('campaignName description discountType discountValue targetGender applicablePlans priority')
            .sort({ priority: -1 });
        res.json({
            success: true,
            data: campaigns,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: List all campaigns with filters & pagination
 */
async function getAdminCampaigns(req, res, next) {
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
            query.campaignName = { $regex: search, $options: 'i' };
        }
        const total = await Campaign_1.Campaign.countDocuments(query);
        const campaigns = await Campaign_1.Campaign.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.json({
            success: true,
            data: campaigns,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Create Campaign
 */
async function createAdminCampaign(req, res, next) {
    try {
        const campaignName = (req.body.campaignName || req.body.name || '').trim();
        const { description, startDate, endDate, timezone, priority, targetGender, minAge, maxAge, maritalStatus, membershipType, registrationStatus, verificationStatus, profileStatus, location, qualification, specialization, applicablePlans, discountType, discountValue, couponRequired, couponCode, usageLimit, genderUsageLimit, perMemberLimit, allowStacking, status, } = req.body;
        if (!campaignName || !startDate || !endDate || !discountType) {
            return res.status(400).json({
                success: false,
                message: 'Campaign name, start date, end date, and discount type are required.',
            });
        }
        const campaign = await Campaign_1.Campaign.create({
            campaignName,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            timezone: timezone || 'Asia/Kolkata',
            priority: Number(priority) || 0,
            targetGender: targetGender || 'Any',
            minAge: minAge ? Number(minAge) : undefined,
            maxAge: maxAge ? Number(maxAge) : undefined,
            maritalStatus: Array.isArray(maritalStatus) ? maritalStatus : maritalStatus ? [maritalStatus] : ['Any'],
            membershipType: Array.isArray(membershipType) ? membershipType : membershipType ? [membershipType] : ['Any'],
            registrationStatus: registrationStatus || 'Any',
            verificationStatus: verificationStatus || 'Any',
            profileStatus: profileStatus || 'Any',
            location: location || {},
            qualification: Array.isArray(qualification) ? qualification : qualification ? [qualification] : ['Any'],
            specialization: Array.isArray(specialization) ? specialization : specialization ? [specialization] : ['Any'],
            applicablePlans: Array.isArray(applicablePlans) && applicablePlans.length > 0 ? applicablePlans : ['ALL'],
            discountType,
            discountValue: discountType === 'FREE' ? 100 : Number(discountValue) || 0,
            couponRequired: Boolean(couponRequired),
            couponCode: couponCode ? String(couponCode).toUpperCase().trim() : undefined,
            usageLimit: Number(usageLimit) || 0,
            genderUsageLimit: genderUsageLimit || { maleLimit: 0, femaleLimit: 0, maleUsed: 0, femaleUsed: 0 },
            perMemberLimit: Number(perMemberLimit) || 1,
            allowStacking: Boolean(allowStacking),
            status: status || 'ACTIVE',
            createdBy: req.user?.userId,
        });
        await logAudit(req, 'CAMPAIGN_CREATED', String(campaign._id), `Created campaign '${campaign.campaignName}'`);
        res.status(201).json({
            success: true,
            message: `Campaign '${campaign.campaignName}' created successfully.`,
            data: campaign,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Update Campaign
 */
async function updateAdminCampaign(req, res, next) {
    try {
        const { id } = req.params;
        const campaign = await Campaign_1.Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found.' });
        }
        const oldStatus = campaign.status;
        const updates = req.body;
        if (updates.startDate)
            updates.startDate = new Date(updates.startDate);
        if (updates.endDate)
            updates.endDate = new Date(updates.endDate);
        if (updates.discountType === 'FREE')
            updates.discountValue = 100;
        if (updates.couponCode)
            updates.couponCode = String(updates.couponCode).toUpperCase().trim();
        Object.assign(campaign, updates);
        await campaign.save();
        await logAudit(req, 'CAMPAIGN_UPDATED', String(campaign._id), `Updated campaign '${campaign.campaignName}' (Status: ${oldStatus} -> ${campaign.status})`, { updates });
        res.json({
            success: true,
            message: `Campaign '${campaign.campaignName}' updated successfully.`,
            data: campaign,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Check Member Eligibility Preview Tool (Part 25)
 */
async function previewMemberEligibility(req, res, next) {
    try {
        const memberId = req.body.memberId || req.body.userId;
        const { planKey, couponCode, campaignId } = req.body;
        if (!memberId || !planKey) {
            return res.status(400).json({
                success: false,
                message: 'Member ID and Membership Plan are required for eligibility preview.',
            });
        }
        const member = await (0, offerEngine_1.getMemberAttributes)(memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Selected member could not be found.' });
        }
        const plan = await (0, offerEngine_1.resolvePlan)(planKey);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Selected membership plan could not be found.' });
        }
        // Specific campaign preview if requested
        let specificCampaignDetails = null;
        if (campaignId) {
            const camp = await Campaign_1.Campaign.findById(campaignId);
            if (camp) {
                const { evaluateCampaignEligibility } = await Promise.resolve().then(() => __importStar(require('../services/offerEngine')));
                const campResult = await evaluateCampaignEligibility(camp, member, plan);
                specificCampaignDetails = {
                    campaignName: camp.campaignName,
                    status: camp.status,
                    targetGender: camp.targetGender,
                    minAge: camp.minAge,
                    maxAge: camp.maxAge,
                    eligible: campResult.eligible,
                    failureReasons: campResult.failureReasons,
                };
            }
        }
        const offerResult = await (0, offerEngine_1.calculateOffer)({
            userId: memberId,
            planKeyOrSlug: planKey,
            couponCode,
        });
        res.json({
            success: true,
            data: {
                member: {
                    id: member.userId,
                    name: member.fullName,
                    candidateId: member.candidateId,
                    gender: member.gender,
                    age: member.age,
                    maritalStatus: member.maritalStatus,
                    qualification: member.qualification,
                    verificationStatus: member.verificationStatus,
                    registrationStatus: member.registrationStatus,
                    profileStatus: member.profileStatus,
                },
                plan: offerResult.plan,
                pricing: {
                    originalPrice: offerResult.originalPrice,
                    discountAmount: offerResult.discountAmount,
                    discountPercentage: offerResult.discountPercentage,
                    finalPrice: offerResult.finalPrice,
                    isFree: offerResult.isFree,
                },
                appliedCampaign: offerResult.campaign || null,
                appliedCoupon: offerResult.coupon || null,
                couponValidation: offerResult.couponValidation || null,
                specificCampaignPreview: specificCampaignDetails,
                evaluationReasons: offerResult.reasons,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Delete Campaign
 */
async function deleteAdminCampaign(req, res, next) {
    try {
        const { id } = req.params;
        const campaign = await Campaign_1.Campaign.findByIdAndDelete(id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found.' });
        }
        await logAudit(req, 'CAMPAIGN_DELETED', String(id), `Deleted campaign '${campaign.campaignName}'`);
        res.json({ success: true, message: 'Campaign deleted successfully.' });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=campaignController.js.map