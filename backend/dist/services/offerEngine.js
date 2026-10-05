"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemberAttributes = getMemberAttributes;
exports.resolvePlan = resolvePlan;
exports.evaluateCampaignEligibility = evaluateCampaignEligibility;
exports.calculateOffer = calculateOffer;
const securityUtils_1 = require("../utils/securityUtils");
const Campaign_1 = require("../models/Campaign");
const Coupon_1 = require("../models/Coupon");
const CouponRedemption_1 = require("../models/CouponRedemption");
const MembershipPlan_1 = require("../models/MembershipPlan");
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const Subscription_1 = require("../models/Subscription");
const Payment_1 = require("../models/Payment");
/**
 * Resolve member profile attributes from database safely
 */
async function getMemberAttributes(userId) {
    if (!userId || !(0, securityUtils_1.isValidObjectId)(userId)) {
        return null;
    }
    const user = await User_1.User.findById(userId);
    if (!user)
        return null;
    const profile = await Profile_1.Profile.findOne({ user: user._id });
    const subCount = await Subscription_1.Subscription.countDocuments({ user: user._id, status: { $in: ['ACTIVE', 'EXPIRED'] } });
    // Compute accurate age from DOB
    let age = undefined;
    if (profile?.dob) {
        const birth = new Date(profile.dob);
        if (!isNaN(birth.getTime())) {
            const now = new Date();
            age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                age--;
            }
        }
    }
    // Registration status: new if registered < 14 days ago and no prior subscriptions
    const regDays = (Date.now() - new Date(user.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
    const registrationStatus = regDays <= 14 && subCount === 0 ? 'New Member' : 'Existing Member';
    // Profile completeness check
    const isComplete = Boolean(profile &&
        profile.displayName &&
        profile.dob &&
        profile.gender &&
        profile.education &&
        profile.state &&
        profile.city &&
        (profile.photos?.length || profile.primaryPhoto));
    return {
        userId: String(user._id),
        candidateId: profile?.candidateId,
        fullName: user.fullName,
        email: user.email,
        gender: profile?.gender || 'Male',
        dob: profile?.dob,
        age,
        maritalStatus: profile?.maritalStatus || 'Never Married',
        qualification: profile?.education || profile?.degree || 'MBBS',
        specialization: profile?.profession || profile?.currentRole || '',
        country: profile?.country || 'India',
        state: profile?.state || '',
        city: profile?.city || '',
        verificationStatus: profile?.verificationStatus || user.verificationStatus || 'UNVERIFIED',
        registrationStatus,
        profileStatus: isComplete ? 'Complete' : 'Incomplete',
        priorSubscriptionCount: subCount,
    };
}
/**
 * Find plan by key, slug, or ID
 */
async function resolvePlan(planKeyOrSlug) {
    const clean = planKeyOrSlug.trim();
    const dbPlan = await MembershipPlan_1.MembershipPlan.findOne({
        $or: [
            { slug: clean.toLowerCase() },
            { key: clean.toUpperCase() },
            { planId: clean },
            { name: new RegExp(`^${clean}$`, 'i') },
        ],
        isActive: true,
    });
    if (dbPlan) {
        const originalPrice = dbPlan.originalPrice || dbPlan.price || 0;
        const discountedPrice = dbPlan.discountedPrice !== undefined && dbPlan.discountedPrice !== null
            ? dbPlan.discountedPrice
            : originalPrice;
        return {
            _id: dbPlan._id,
            key: dbPlan.key || dbPlan.slug.toUpperCase(),
            slug: dbPlan.slug,
            name: dbPlan.name,
            originalPrice,
            discountedPrice,
            durationDays: dbPlan.durationDays || 90,
            contactRequestLimit: dbPlan.contactRequestLimit || 25,
            isUnlimitedContact: dbPlan.isUnlimitedContact || false,
        };
    }
    // Fallback defaults for standard plans
    const fallbackPlans = {
        'doctor-connect': {
            key: 'DOCTOR_CONNECT',
            slug: 'doctor-connect',
            name: 'Doctor Connect',
            originalPrice: 5999,
            discountedPrice: 4999,
            durationDays: 90,
            contactRequestLimit: 25,
        },
        'premium': {
            key: 'PREMIUM',
            slug: 'doctor-connect',
            name: 'Premium Match',
            originalPrice: 4999,
            discountedPrice: 4999,
            durationDays: 90,
            contactRequestLimit: 25,
        },
        'premium-match': {
            key: 'PREMIUM_VIP',
            slug: 'premium-match',
            name: 'Premium VIP',
            originalPrice: 9999,
            discountedPrice: 8999,
            durationDays: 180,
            contactRequestLimit: 60,
        },
        'exclusive-concierge': {
            key: 'VVIP',
            slug: 'exclusive-concierge',
            name: 'Exclusive Concierge (VVIP)',
            originalPrice: 24999,
            discountedPrice: 21999,
            durationDays: 365,
            contactRequestLimit: 150,
        },
    };
    const matchKey = clean.toLowerCase();
    return fallbackPlans[matchKey] || null;
}
/**
 * Check if a member satisfies campaign eligibility criteria
 */
async function evaluateCampaignEligibility(campaign, member, plan) {
    const failureReasons = [];
    // 1. Applicable Plans check
    if (campaign.applicablePlans &&
        campaign.applicablePlans.length > 0 &&
        !campaign.applicablePlans.includes('ALL')) {
        const matchesPlan = campaign.applicablePlans.some((p) => p.toLowerCase() === plan.slug.toLowerCase() ||
            p.toUpperCase() === plan.key.toUpperCase() ||
            p.toLowerCase() === plan.name.toLowerCase());
        if (!matchesPlan) {
            failureReasons.push(`Plan ${plan.name} is not included in this campaign`);
        }
    }
    // If visitor is guest (not logged in) and campaign targets specific attributes
    if (!member) {
        if (campaign.targetGender !== 'Any' &&
            campaign.targetGender !== 'Both') {
            failureReasons.push(`Requires logged in ${campaign.targetGender} member`);
        }
        return {
            eligible: failureReasons.length === 0,
            failureReasons,
        };
    }
    // 2. Gender check
    if (campaign.targetGender &&
        campaign.targetGender !== 'Any' &&
        campaign.targetGender !== 'Both') {
        if (campaign.targetGender.toLowerCase() !== member.gender.toLowerCase()) {
            failureReasons.push(`Campaign targets ${campaign.targetGender} members only (current: ${member.gender})`);
        }
    }
    // 3. Age check
    if (member.age !== undefined) {
        if (campaign.minAge && member.age < campaign.minAge) {
            failureReasons.push(`Member age (${member.age}) is below campaign minimum age (${campaign.minAge})`);
        }
        if (campaign.maxAge && member.age > campaign.maxAge) {
            failureReasons.push(`Member age (${member.age}) is above campaign maximum age (${campaign.maxAge})`);
        }
    }
    else if (campaign.minAge || campaign.maxAge) {
        // If age is required but member DOB missing
        failureReasons.push('Member date of birth is required to verify age eligibility');
    }
    // 4. Marital Status check
    if (campaign.maritalStatus &&
        campaign.maritalStatus.length > 0 &&
        !campaign.maritalStatus.includes('Any')) {
        const matchesMarital = campaign.maritalStatus.some((m) => m.toLowerCase() === member.maritalStatus.toLowerCase());
        if (!matchesMarital) {
            failureReasons.push(`Marital status '${member.maritalStatus}' does not match campaign requirement`);
        }
    }
    // 5. Verification Status check
    if (campaign.verificationStatus &&
        campaign.verificationStatus !== 'Any') {
        if (campaign.verificationStatus !== member.verificationStatus) {
            failureReasons.push(`Verification status '${member.verificationStatus}' does not match required '${campaign.verificationStatus}'`);
        }
    }
    // 6. Registration Status check
    if (campaign.registrationStatus &&
        campaign.registrationStatus !== 'Any') {
        if (campaign.registrationStatus !== member.registrationStatus) {
            failureReasons.push(`Only applicable to ${campaign.registrationStatus}`);
        }
    }
    // 7. Profile Status check
    if (campaign.profileStatus &&
        campaign.profileStatus !== 'Any') {
        if (campaign.profileStatus !== member.profileStatus) {
            failureReasons.push(`Requires ${campaign.profileStatus} profile`);
        }
    }
    // 8. Location check (State, City)
    if (campaign.location) {
        if (campaign.location.states && campaign.location.states.length > 0) {
            const matchState = campaign.location.states.some((s) => s.toLowerCase() === member.state.toLowerCase());
            if (!matchState)
                failureReasons.push(`Location state '${member.state}' does not match`);
        }
        if (campaign.location.cities && campaign.location.cities.length > 0) {
            const matchCity = campaign.location.cities.some((c) => c.toLowerCase() === member.city.toLowerCase());
            if (!matchCity)
                failureReasons.push(`Location city '${member.city}' does not match`);
        }
    }
    // 9. Qualification check
    if (campaign.qualification &&
        campaign.qualification.length > 0 &&
        !campaign.qualification.includes('Any')) {
        const qualText = member.qualification.toUpperCase();
        const matchQual = campaign.qualification.some((q) => qualText.includes(q.toUpperCase()));
        if (!matchQual) {
            failureReasons.push(`Medical qualification '${member.qualification}' does not match campaign eligibility`);
        }
    }
    // 10. Usage Limits check
    if (campaign.usageLimit > 0 && campaign.usedCount >= campaign.usageLimit) {
        failureReasons.push('Campaign total usage limit has been reached');
    }
    // Gender-specific usage limit check
    if (campaign.genderUsageLimit) {
        if (member.gender === 'Female' &&
            campaign.genderUsageLimit.femaleLimit &&
            campaign.genderUsageLimit.femaleLimit > 0 &&
            campaign.genderUsageLimit.femaleUsed >= campaign.genderUsageLimit.femaleLimit) {
            failureReasons.push('Female member quota for this campaign is exhausted');
        }
        if (member.gender === 'Male' &&
            campaign.genderUsageLimit.maleLimit &&
            campaign.genderUsageLimit.maleLimit > 0 &&
            campaign.genderUsageLimit.maleUsed >= campaign.genderUsageLimit.maleLimit) {
            failureReasons.push('Male member quota for this campaign is exhausted');
        }
    }
    // Per-member claim limit
    if (member.userId && campaign.perMemberLimit > 0) {
        const claims = await Payment_1.Payment.countDocuments({
            user: member.userId,
            status: 'SUCCESS',
            'metadata.campaignId': String(campaign._id),
        });
        if (claims >= campaign.perMemberLimit) {
            failureReasons.push(`You have already claimed this campaign offer (${claims}/${campaign.perMemberLimit})`);
        }
    }
    return {
        eligible: failureReasons.length === 0,
        failureReasons,
    };
}
/**
 * Main Server-Authoritative Offer Calculator
 */
async function calculateOffer(params) {
    const { userId, planKeyOrSlug, couponCode, evaluationDate } = params;
    const now = evaluationDate || new Date();
    // 1. Resolve Plan
    const plan = await resolvePlan(planKeyOrSlug);
    if (!plan) {
        throw new Error(`Invalid membership plan: ${planKeyOrSlug}`);
    }
    const originalPrice = plan.originalPrice;
    let campaignDiscount = 0;
    let couponDiscount = 0;
    let selectedCampaign = undefined;
    let selectedCoupon = undefined;
    let couponValidationResult = undefined;
    const reasons = [];
    // 2. Fetch Member Attributes
    const member = await getMemberAttributes(userId);
    // 3. Find Active Campaigns in Timezone-aware date window
    const activeCampaigns = await Campaign_1.Campaign.find({
        status: 'ACTIVE',
        startDate: { $lte: now },
        endDate: { $gte: now },
    }).sort({ priority: -1, createdAt: -1 });
    // Deterministically find the highest-priority eligible campaign
    for (const campaign of activeCampaigns) {
        const { eligible, failureReasons } = await evaluateCampaignEligibility(campaign, member, plan);
        if (eligible) {
            // Calculate campaign discount
            let disc = 0;
            const dType = campaign.discountType;
            if (dType === 'FREE' ||
                dType === 'FREE_100_PERCENT' ||
                campaign.discountValue === 100) {
                disc = originalPrice;
            }
            else if (dType === 'PERCENTAGE') {
                const pct = Math.min(100, Math.max(0, campaign.discountValue));
                disc = (originalPrice * pct) / 100;
            }
            else if (dType === 'FIXED' || dType === 'FIXED_AMOUNT') {
                disc = Math.min(originalPrice, Math.max(0, campaign.discountValue));
            }
            selectedCampaign = {
                id: String(campaign._id),
                name: campaign.campaignName,
                discountType: campaign.discountType,
                discountValue: campaign.discountValue,
                discountAmount: Math.round(disc * 100) / 100,
                isFree: disc >= originalPrice,
                allowStacking: campaign.allowStacking,
            };
            campaignDiscount = disc;
            reasons.push(`Eligible for seasonal offer: ${campaign.campaignName}`);
            break; // Found highest priority eligible campaign
        }
    }
    // 4. Validate and Apply Coupon if provided
    if (couponCode && couponCode.trim()) {
        const cleanCouponCode = couponCode.trim().toUpperCase();
        const coupon = await Coupon_1.Coupon.findOne({ couponCode: cleanCouponCode });
        if (!coupon) {
            couponValidationResult = {
                valid: false,
                reasonCode: 'COUPON_NOT_FOUND',
                message: 'Invalid coupon code. Please check and try again.',
            };
        }
        else if (coupon.status !== 'ACTIVE') {
            couponValidationResult = {
                valid: false,
                reasonCode: 'COUPON_INACTIVE',
                message: `This coupon is currently ${coupon.status.toLowerCase()}.`,
            };
        }
        else if (now < coupon.startDate) {
            couponValidationResult = {
                valid: false,
                reasonCode: 'COUPON_NOT_STARTED',
                message: 'This coupon offer has not started yet.',
            };
        }
        else if (now > coupon.expiryDate) {
            couponValidationResult = {
                valid: false,
                reasonCode: 'COUPON_EXPIRED',
                message: 'This coupon has expired.',
            };
        }
        else if (coupon.usageLimit !== undefined &&
            coupon.usageLimit !== null &&
            coupon.usedCount >= coupon.usageLimit) {
            couponValidationResult = {
                valid: false,
                reasonCode: 'USAGE_LIMIT_EXCEEDED',
                message: 'This coupon has reached its maximum global redemption limit.',
            };
        }
        else if (coupon.issuedToUser &&
            userId &&
            String(coupon.issuedToUser) !== String(userId)) {
            couponValidationResult = {
                valid: false,
                reasonCode: 'COUPON_USER_MISMATCH',
                message: 'This reward coupon is exclusively assigned to another member.',
            };
        }
        else if (coupon.applicablePlans &&
            coupon.applicablePlans.length > 0 &&
            !coupon.applicablePlans.includes('ALL') &&
            !coupon.applicablePlans.some((p) => p.toLowerCase() === plan.slug.toLowerCase() ||
                p.toUpperCase() === plan.key.toUpperCase())) {
            couponValidationResult = {
                valid: false,
                reasonCode: 'COUPON_PLAN_NOT_APPLICABLE',
                message: `This coupon is not applicable for ${plan.name}.`,
            };
        }
        else if (coupon.minimumMembershipAmount > 0 && originalPrice < coupon.minimumMembershipAmount) {
            couponValidationResult = {
                valid: false,
                reasonCode: 'COUPON_MIN_AMOUNT_NOT_MET',
                message: `Requires minimum membership price of ₹${coupon.minimumMembershipAmount}.`,
            };
        }
        else {
            // Check per-member usage limit
            let memberUsageCount = 0;
            if (userId) {
                memberUsageCount = await CouponRedemption_1.CouponRedemption.countDocuments({
                    couponId: coupon._id,
                    userId: userId,
                    status: { $in: ['SUCCESS', 'APPLIED'] },
                });
            }
            if (coupon.perMemberLimit > 0 && memberUsageCount >= coupon.perMemberLimit) {
                couponValidationResult = {
                    valid: false,
                    reasonCode: 'MEMBER_LIMIT_EXCEEDED',
                    message: 'You have already redeemed this coupon the maximum allowed times.',
                };
            }
            else {
                // Valid coupon!
                let disc = 0;
                const cdType = coupon.discountType;
                if (cdType === 'FREE' ||
                    cdType === 'FREE_100_PERCENT' ||
                    coupon.discountValue === 100) {
                    disc = originalPrice;
                }
                else if (cdType === 'PERCENTAGE') {
                    disc = (originalPrice * Math.min(100, Math.max(0, coupon.discountValue))) / 100;
                }
                else if (cdType === 'FIXED' || cdType === 'FIXED_AMOUNT') {
                    disc = Math.min(originalPrice, Math.max(0, coupon.discountValue));
                }
                selectedCoupon = {
                    id: String(coupon._id),
                    code: coupon.couponCode,
                    name: coupon.name,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    discountAmount: Math.round(disc * 100) / 100,
                    isFree: disc >= originalPrice,
                    allowStacking: coupon.allowStacking,
                };
                couponDiscount = disc;
                couponValidationResult = {
                    valid: true,
                    message: `Coupon '${coupon.couponCode}' applied successfully!`,
                };
            }
        }
    }
    // 5. Stacking Rules & Final Calculation
    let totalDiscount = 0;
    const allowStack = Boolean(selectedCampaign?.allowStacking) && Boolean(selectedCoupon?.allowStacking);
    if (selectedCampaign && selectedCoupon && couponValidationResult?.valid) {
        if (allowStack) {
            // Compound / stacked discount safely clamped to originalPrice
            totalDiscount = Math.min(originalPrice, campaignDiscount + couponDiscount);
        }
        else {
            // Default: NO STACKING. Apply the better discount for the user
            if (campaignDiscount >= couponDiscount) {
                totalDiscount = campaignDiscount;
                selectedCoupon.discountAmount = 0;
                reasons.push('Campaign offer is higher; coupon discount not stacked.');
            }
            else {
                totalDiscount = couponDiscount;
                selectedCampaign.discountAmount = 0;
                reasons.push('Coupon offer is higher; campaign discount not stacked.');
            }
        }
    }
    else if (selectedCampaign) {
        totalDiscount = campaignDiscount;
    }
    else if (selectedCoupon && couponValidationResult?.valid) {
        totalDiscount = couponDiscount;
    }
    // Ensure non-negative and max 100% discount
    totalDiscount = Math.max(0, Math.min(originalPrice, totalDiscount));
    const finalPrice = Math.max(0, Math.round((originalPrice - totalDiscount) * 100) / 100);
    const discountPercentage = originalPrice > 0 ? Math.round((totalDiscount / originalPrice) * 1000) / 10 : 0;
    return {
        originalPrice,
        discountAmount: Math.round(totalDiscount * 100) / 100,
        discountPercentage,
        finalPrice,
        isFree: finalPrice === 0,
        eligible: true,
        plan: {
            key: plan.key,
            slug: plan.slug,
            name: plan.name,
            durationDays: plan.durationDays,
            contactRequestLimit: plan.contactRequestLimit,
        },
        campaign: selectedCampaign,
        coupon: selectedCoupon,
        couponValidation: couponValidationResult,
        reasons,
    };
}
//# sourceMappingURL=offerEngine.js.map