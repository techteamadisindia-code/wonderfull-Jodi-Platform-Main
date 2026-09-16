import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Campaign, ICampaign } from '../models/Campaign';
import { AuditLog } from '../models/AuditLog';
import { calculateOffer, getMemberAttributes, resolvePlan } from '../services/offerEngine';
import { User } from '../models/User';

async function logAudit(req: AuthRequest, action: string, targetId: string, details?: string, metadata?: any) {
  try {
    await AuditLog.create({
      adminUser: req.user?.userId,
      adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
      action,
      targetModel: 'Campaign',
      targetId,
      details,
      metadata,
      status: 'SUCCESS',
    });
  } catch (err) {
    console.warn('AuditLog creation warning:', err);
  }
}

/**
 * Public: Get active promotional campaign banners
 */
export async function getActivePublicCampaigns(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const campaigns = await Campaign.find({
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
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: List all campaigns with filters & pagination
 */
export async function getAdminCampaigns(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = (req.query.status as string)?.toUpperCase();
    const search = req.query.search as string;

    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (search) {
      query.campaignName = { $regex: search, $options: 'i' };
    }

    const total = await Campaign.countDocuments(query);
    const campaigns = await Campaign.find(query)
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
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Create Campaign
 */
export async function createAdminCampaign(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const campaignName = (req.body.campaignName || req.body.name || '').trim();
    const {
      description,
      startDate,
      endDate,
      timezone,
      priority,
      targetGender,
      minAge,
      maxAge,
      maritalStatus,
      membershipType,
      registrationStatus,
      verificationStatus,
      profileStatus,
      location,
      qualification,
      specialization,
      applicablePlans,
      discountType,
      discountValue,
      couponRequired,
      couponCode,
      usageLimit,
      genderUsageLimit,
      perMemberLimit,
      allowStacking,
      status,
    } = req.body;

    if (!campaignName || !startDate || !endDate || !discountType) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name, start date, end date, and discount type are required.',
      });
    }

    const campaign = await Campaign.create({
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
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update Campaign
 */
export async function updateAdminCampaign(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const oldStatus = campaign.status;
    const updates = req.body;

    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    if (updates.discountType === 'FREE') updates.discountValue = 100;
    if (updates.couponCode) updates.couponCode = String(updates.couponCode).toUpperCase().trim();

    Object.assign(campaign, updates);
    await campaign.save();

    await logAudit(
      req,
      'CAMPAIGN_UPDATED',
      String(campaign._id),
      `Updated campaign '${campaign.campaignName}' (Status: ${oldStatus} -> ${campaign.status})`,
      { updates }
    );

    res.json({
      success: true,
      message: `Campaign '${campaign.campaignName}' updated successfully.`,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Check Member Eligibility Preview Tool (Part 25)
 */
export async function previewMemberEligibility(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const memberId = req.body.memberId || req.body.userId;
    const { planKey, couponCode, campaignId } = req.body;

    if (!memberId || !planKey) {
      return res.status(400).json({
        success: false,
        message: 'Member ID and Membership Plan are required for eligibility preview.',
      });
    }

    const member = await getMemberAttributes(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Selected member could not be found.' });
    }

    const plan = await resolvePlan(planKey);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Selected membership plan could not be found.' });
    }

    // Specific campaign preview if requested
    let specificCampaignDetails = null;
    if (campaignId) {
      const camp = await Campaign.findById(campaignId);
      if (camp) {
        const { evaluateCampaignEligibility } = await import('../services/offerEngine');
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

    const offerResult = await calculateOffer({
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
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Delete Campaign
 */
export async function deleteAdminCampaign(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByIdAndDelete(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }
    await logAudit(req, 'CAMPAIGN_DELETED', String(id), `Deleted campaign '${campaign.campaignName}'`);
    res.json({ success: true, message: 'Campaign deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
