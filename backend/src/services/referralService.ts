import crypto from 'crypto';
import mongoose from 'mongoose';
import { Referral, IReferral } from '../models/Referral';
import { ReferralRewardConfig, getActiveReferralConfig } from '../models/ReferralRewardConfig';
import { ReferralRewardRecord } from '../models/ReferralRewardRecord';
import { Coupon } from '../models/Coupon';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Subscription } from '../models/Subscription';

/**
 * Generate clean unique referral coupon code (e.g. WJREF-8X92K7)
 */
async function generateUniqueRewardCouponCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidateCode = `WJREF-${randomHex}`;
    const exists = await Coupon.findOne({ couponCode: candidateCode });
    if (!exists) return candidateCode;
  }
  return `WJREF-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * Member Referral Dashboard Data
 */
export async function getMemberReferralDashboard(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const profile = await Profile.findOne({ user: user._id });
  const candidateId = profile?.candidateId || `WJ-${String(user._id).slice(-6).toUpperCase()}`;
  const referralCode = candidateId;

  const config = await getActiveReferralConfig();
  const threshold = config.requiredReferrals || 5;

  // Query referrals made by this user
  const referrals = await Referral.find({ referrerUserId: user._id })
    .populate('referredUserId', 'fullName email createdAt')
    .sort({ createdAt: -1 });

  // Count qualified registrations
  const qualifiedCount = referrals.filter(
    (r) => r.status === 'QUALIFIED' || r.status === 'REWARDED'
  ).length;

  const totalInvited = referrals.length;
  const registeredCount = referrals.filter((r) => r.status !== 'CLICKED').length;

  // Unlocked milestone rewards for this user
  const rewardRecords = await ReferralRewardRecord.find({ userId: user._id }).sort({ milestone: 1 });

  const progressPercentage = Math.min(100, Math.round((qualifiedCount / threshold) * 100));
  const remainingNeeded = Math.max(0, threshold - (qualifiedCount % threshold));
  const isRewardUnlocked = qualifiedCount >= threshold;

  // Format referral items for display (privacy safe)
  const referralsList = referrals.map((r) => {
    const refUser = r.referredUserId as any;
    return {
      id: r._id,
      candidateId: r.referredCandidateId || 'WJ-Candidate',
      candidateName: refUser?.fullName
        ? refUser.fullName.split(' ')[0] + ' ' + (refUser.fullName.split(' ')[1]?.[0] || '') + '.'
        : 'Registered Colleague',
      registeredAt: r.registeredAt || r.createdAt,
      status: r.status,
      rewardStatus: r.rewardStatus,
    };
  });

  return {
    referralCode,
    candidateId,
    successfulReferrals: qualifiedCount,
    requiredReferrals: threshold,
    config: {
      threshold,
      rewardType: config.rewardType,
      rewardValue: config.rewardValue,
      qualificationEvent: config.qualificationEvent,
    },
    stats: {
      totalInvited,
      registeredCount,
      qualifiedCount,
      remainingNeeded: remainingNeeded === 0 && qualifiedCount > 0 ? 0 : remainingNeeded,
      progressPercentage,
      isRewardUnlocked,
    },
    rewards: rewardRecords.map((rec) => ({
      milestone: rec.milestone,
      rewardType: rec.rewardType,
      rewardValue: rec.rewardValue,
      couponCode: rec.couponCode,
      status: rec.status,
      issuedAt: rec.issuedAt,
      expiryDate: rec.expiryDate,
      isExpired: new Date() > rec.expiryDate,
    })),
    referrals: referralsList,
  };
}

/**
 * Track Referral Click from /register?ref=WJ-XXXXXX
 */
export async function trackReferralClick(referralCode: string, req?: any) {
  if (!referralCode) return null;
  const cleanCode = referralCode.trim().toUpperCase();

  // Find candidate by CandidateId
  const referrerProfile = await Profile.findOne({ candidateId: cleanCode });
  if (!referrerProfile) return null;

  const ipAddress =
    (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    '127.0.0.1';
  const userAgent = req?.headers?.['user-agent'] || 'Unknown';

  const referral = await Referral.create({
    referrerUserId: referrerProfile.user,
    referrerCandidateId: referrerProfile.candidateId,
    referralCode: cleanCode,
    status: 'CLICKED',
    clickedAt: new Date(),
    ipAddress,
    userAgent,
    source: req?.query?.src || 'direct_link',
  });

  return referral;
}

/**
 * Attribute Referral on successful Candidate Registration
 */
export async function attributeReferralOnRegistration(params: {
  referredUserId: string;
  referralCode: string;
  req?: any;
}) {
  const { referredUserId, referralCode, req } = params;
  if (!referralCode || !referredUserId) return null;

  const cleanCode = referralCode.trim().toUpperCase();

  // 1. Locate referrer profile & user
  const referrerProfile = await Profile.findOne({ candidateId: cleanCode });
  if (!referrerProfile) return null;

  const referrerUser = await User.findById(referrerProfile.user);
  const referredUser = await User.findById(referredUserId);
  const referredProfile = await Profile.findOne({ user: referredUserId });

  if (!referrerUser || !referredUser) return null;

  // 2. Anti-Abuse Checks:
  // Reject Self-Referral: Same user ID, same email, or same mobile number
  if (String(referrerUser._id) === String(referredUser._id)) {
    throw new Error('REFERRAL_SELF_USE_NOT_ALLOWED: Members cannot use their own referral link.');
  }

  if (referrerUser.email.toLowerCase() === referredUser.email.toLowerCase()) {
    throw new Error('REFERRAL_SELF_USE_NOT_ALLOWED: Duplicate account detection.');
  }

  if (referrerUser.mobile && referredUser.mobile && referrerUser.mobile === referredUser.mobile) {
    throw new Error('REFERRAL_SELF_USE_NOT_ALLOWED: Matching contact identity detection.');
  }

  // Check if referred member has already been attributed to any referral
  const existingAttribution = await Referral.findOne({
    referredUserId: referredUser._id,
    status: { $ne: 'CLICKED' },
  });

  if (existingAttribution) {
    return existingAttribution;
  }

  const ipAddress =
    (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    '127.0.0.1';

  // 3. Create or Update Referral Record
  let referral = await Referral.create({
    referrerUserId: referrerUser._id,
    referrerCandidateId: referrerProfile.candidateId,
    referralCode: cleanCode,
    referredUserId: referredUser._id,
    referredCandidateId: referredProfile?.candidateId,
    status: 'REGISTERED',
    registeredAt: new Date(),
    rewardStatus: 'PENDING',
    ipAddress,
    userAgent: req?.headers?.['user-agent'] || 'Unknown',
    source: req?.query?.src || 'registration',
  });

  // 4. Evaluate qualification criteria
  const config = await getActiveReferralConfig();
  if (config.qualificationEvent === 'REGISTERED') {
    await evaluateReferralQualification(String(referredUser._id), 'REGISTERED');
  }

  return referral;
}

/**
 * Evaluate referral qualification for a referred user
 */
export async function evaluateReferralQualification(
  referredUserId: string,
  triggerEvent: 'REGISTERED' | 'REGISTERED_AND_VERIFIED' | 'REGISTERED_AND_COMPLETED_PROFILE'
) {
  const referral = await Referral.findOne({ referredUserId });
  if (!referral) return null;

  // If already qualified or rewarded, skip
  if (referral.status === 'QUALIFIED' || referral.status === 'REWARDED') {
    return referral;
  }

  const config = await getActiveReferralConfig();

  let qualifies = false;
  if (config.qualificationEvent === 'REGISTERED' && triggerEvent === 'REGISTERED') {
    qualifies = true;
  } else if (config.qualificationEvent === 'REGISTERED_AND_VERIFIED') {
    const user = await User.findById(referredUserId);
    if (user && (user.verificationStatus === 'VERIFIED' || user.verified)) {
      qualifies = true;
    }
  } else if (config.qualificationEvent === 'REGISTERED_AND_COMPLETED_PROFILE') {
    const profile = await Profile.findOne({ user: referredUserId });
    if (profile && profile.displayName && profile.dob && (profile.photos?.length || profile.primaryPhoto)) {
      qualifies = true;
    }
  }

  if (qualifies) {
    referral.status = 'QUALIFIED';
    referral.qualifiedAt = new Date();
    referral.qualificationReason = `Satisfied ${config.qualificationEvent}`;
    referral.rewardStatus = 'UNLOCKED';
    await referral.save();

    // Check if referrer reached a milestone reward
    await checkAndIssueMilestoneRewards(String(referral.referrerUserId));
  }

  return referral;
}

/**
 * Check and issue referral milestone rewards (Idempotent!)
 */
export async function checkAndIssueMilestoneRewards(referrerUserId: string) {
  const config = await getActiveReferralConfig();
  const threshold = config.requiredReferrals || 5;

  // Count total qualified referrals
  const qualifiedCount = await Referral.countDocuments({
    referrerUserId,
    status: { $in: ['QUALIFIED', 'REWARDED'] },
  });

  if (qualifiedCount < threshold) {
    return { issued: false, qualifiedCount, threshold };
  }

  // Calculate reached milestones
  const reachedMilestones: number[] = [];
  if (config.isRecurringMilestone) {
    for (let m = threshold; m <= qualifiedCount; m += threshold) {
      reachedMilestones.push(m);
    }
  } else {
    reachedMilestones.push(threshold);
  }

  const referrerProfile = await Profile.findOne({ user: referrerUserId });
  const referrerCandidateId = referrerProfile?.candidateId || 'WJ-Member';

  const newRewardsIssued: any[] = [];

  for (const milestone of reachedMilestones) {
    // 1. Check if this milestone has already been rewarded (Idempotency)
    const existingRecord = await ReferralRewardRecord.findOne({
      userId: referrerUserId,
      milestone,
    });

    if (existingRecord) {
      continue; // Milestone already processed
    }

    // 2. Generate unique reward coupon
    const couponCode = await generateUniqueRewardCouponCode();
    const expiryDate = new Date(Date.now() + (config.couponValidityDays || 30) * 24 * 60 * 60 * 1000);

    let couponDiscountType: 'PERCENTAGE' | 'FIXED' | 'FREE' = 'PERCENTAGE';
    if (config.rewardType === 'FREE_PREMIUM') {
      couponDiscountType = 'FREE';
    } else if (config.rewardType === 'FIXED_DISCOUNT') {
      couponDiscountType = 'FIXED';
    }

    const coupon = await Coupon.create({
      couponCode,
      name: `Referral Reward (${milestone} Referrals)`,
      description: `Exclusive ${config.rewardValue}% reward for successfully referring ${milestone} doctor colleagues.`,
      discountType: couponDiscountType,
      discountValue: config.rewardValue,
      applicablePlans: [config.rewardPlan || 'ALL'],
      startDate: new Date(),
      expiryDate,
      usageLimit: 1,
      usedCount: 0,
      perMemberLimit: 1,
      isReferralReward: true,
      issuedToUser: referrerUserId,
      issuedToCandidateId: referrerCandidateId,
      allowStacking: false,
      status: 'ACTIVE',
    });

    // 3. Create permanent reward ledger record
    const record = await ReferralRewardRecord.create({
      userId: referrerUserId,
      candidateId: referrerCandidateId,
      milestone,
      rewardType: config.rewardType,
      rewardValue: config.rewardValue,
      couponId: coupon._id,
      couponCode: coupon.couponCode,
      status: 'ISSUED',
      issuedAt: new Date(),
      expiryDate,
    });

    // 4. If reward type includes direct contacts credit, add to active subscription
    if (config.rewardType === 'ADDITIONAL_CONTACT_VIEWS') {
      await Subscription.findOneAndUpdate(
        { user: referrerUserId, status: 'ACTIVE' },
        { $inc: { contactRequestsRemaining: config.rewardValue } }
      );
    }

    newRewardsIssued.push(record);
  }

  // Update status of qualified referrals up to the rewarded count
  await Referral.updateMany(
    { referrerUserId, status: 'QUALIFIED' },
    { $set: { status: 'REWARDED', rewardStatus: 'ISSUED' } }
  );

  return {
    issued: newRewardsIssued.length > 0,
    newRewards: newRewardsIssued,
    qualifiedCount,
  };
}
