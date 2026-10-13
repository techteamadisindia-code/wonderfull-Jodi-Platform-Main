import { Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { MembershipPlan } from '../models/MembershipPlan';
import { calculateOffer, resolvePlan } from '../services/offerEngine';
import { Coupon } from '../models/Coupon';
import { CouponRedemption } from '../models/CouponRedemption';
import { Campaign } from '../models/Campaign';
import { Profile } from '../models/Profile';

export interface MembershipPlanConfig {
  key: string;
  planId: string;
  slug: string;
  name: string;
  displayName: string;
  amount: number;
  price: string;
  duration: string;
  durationMonths: number | null;
  durationDays: number;
  profileViewLimit: 'limited' | 'unlimited';
  contactRequestLimit: number;
  isUnlimitedContact?: boolean;
  fairUsageEnabled?: boolean;
  description: string;
  badge?: string;
  bestFor: string;
  features: string[];
  isPopular?: boolean;
  isVip?: boolean;
  isVvip?: boolean;
  ctaText: string;
  ctaAction: 'register' | 'order' | 'contact';
  sortOrder: number;
  active: boolean;
}

export const plans: MembershipPlanConfig[] = [
  {
    key: 'FREE',
    planId: 'plan_free',
    slug: 'free',
    name: 'Free',
    displayName: 'Free',
    amount: 0,
    price: '₹0',
    duration: 'Forever Free',
    durationMonths: null,
    durationDays: 3650,
    profileViewLimit: 'limited',
    contactRequestLimit: 0,
    isUnlimitedContact: false,
    fairUsageEnabled: false,
    description: 'Explore basic doctor profiles and create your matrimonial profile for free.',
    bestFor: 'Doctors who are exploring the platform',
    features: [
      'Limited profile browsing',
      'Create and manage profile',
      'Receive profile interest requests',
      'Basic search',
      'Shortlist profiles',
      'Platform messaging where allowed',
      'Contact details remain hidden',
    ],
    ctaText: 'Continue Free',
    ctaAction: 'register',
    sortOrder: 1,
    active: true,
  },
  {
    key: 'DOCTOR_CONNECT',
    planId: 'plan_doctor_connect',
    slug: 'doctor-connect',
    name: 'Doctor Connect',
    displayName: 'Doctor Connect',
    amount: 5999,
    price: '₹5,999',
    duration: '3 Months',
    durationMonths: 3,
    durationDays: 90,
    profileViewLimit: 'unlimited',
    contactRequestLimit: 25,
    isUnlimitedContact: false,
    fairUsageEnabled: false,
    description: 'Direct doctor connections with 25 verified contact requests and unlimited browsing.',
    bestFor: 'Doctors actively seeking prospective matches with direct communication',
    features: [
      'Unlimited doctor profile browsing',
      '25 Contact Requests',
      'Verified Doctor Profiles',
      'Advanced Search',
      'Unlimited Shortlisting',
      'Direct Platform Messaging',
      'Profile Privacy Controls',
      'Secure Contact Request System',
    ],
    ctaText: 'Choose Doctor Connect',
    ctaAction: 'order',
    sortOrder: 2,
    active: true,
  },
  {
    key: 'PREMIUM_MATCH',
    planId: 'plan_premium_match',
    slug: 'premium-match',
    name: 'Premium Match',
    displayName: 'Premium Match',
    amount: 11999,
    price: '₹11,999',
    duration: '6 Months',
    durationMonths: 6,
    durationDays: 180,
    profileViewLimit: 'unlimited',
    contactRequestLimit: 60,
    isUnlimitedContact: false,
    fairUsageEnabled: false,
    isPopular: true,
    badge: '⭐ MOST POPULAR',
    description: 'The most popular plan offering 60 contact requests, priority matching, and enhanced discovery.',
    bestFor: 'Doctors seriously looking for an ideal life partner with priority placement',
    features: [
      'Unlimited Doctor Profile Viewing',
      '60 Contact Requests',
      'Verified Doctor Profiles',
      'Advanced Search',
      'Unlimited Shortlisting',
      'Priority Matching',
      'Direct Platform Messaging',
      'Profile Privacy Controls',
      'Priority Support',
    ],
    ctaText: 'Choose Premium Match',
    ctaAction: 'order',
    sortOrder: 3,
    active: true,
  },
  {
    key: 'PRIORITY_MATCHMAKING',
    planId: 'plan_priority_matchmaking',
    slug: 'priority-matchmaking',
    name: 'Priority Matchmaking',
    displayName: 'Priority Matchmaking',
    amount: 24999,
    price: '₹24,999',
    duration: '6 Months',
    durationMonths: 6,
    durationDays: 180,
    profileViewLimit: 'unlimited',
    contactRequestLimit: 120,
    isUnlimitedContact: false,
    fairUsageEnabled: false,
    isVip: true,
    badge: '👑 Priority Assisted Matchmaking',
    description: 'Assisted matchmaking with dedicated relationship manager and 120 contact requests.',
    bestFor: 'Busy medical professionals who value personalized matchmaking assistance',
    features: [
      'Unlimited Doctor Profile Viewing',
      '120 Contact Requests',
      'Dedicated Matchmaking Manager',
      'Personal Preference Consultation',
      'Curated Match Recommendations',
      'AI + Human Compatibility Matching',
      'Assisted Introductions',
      'Family Introduction Assistance',
      'Priority Access',
      'Confidential Matchmaking Support',
    ],
    ctaText: 'Choose Priority Matchmaking',
    ctaAction: 'order',
    sortOrder: 4,
    active: true,
  },
  {
    key: 'EXCLUSIVE_CONCIERGE',
    planId: 'plan_exclusive_concierge',
    slug: 'exclusive-concierge',
    name: 'Exclusive Concierge',
    displayName: 'Exclusive Concierge',
    amount: 49999,
    price: '₹49,999',
    duration: '6 Months',
    durationMonths: 6,
    durationDays: 180,
    profileViewLimit: 'unlimited',
    contactRequestLimit: -1, // Unlimited
    isUnlimitedContact: true,
    fairUsageEnabled: true,
    isVvip: true,
    badge: '💎 Premium Concierge Service',
    description: 'High-touch senior matchmaking consultant with video/meeting coordination and continuous refinement.',
    bestFor: 'Doctors and families seeking complete end-to-end bespoke matchmaking',
    features: [
      'Unlimited Doctor Profile Viewing',
      'Unlimited Contact Access*',
      'Senior Matchmaking Consultant',
      'Personally Curated Matches',
      'AI + Human Compatibility Assessment',
      'Family Preference Consultation',
      'Introduction Coordination',
      'Video / Face-to-Face Coordination',
      'Family-to-Family Assistance',
      'Confidentiality & Privacy Management',
      'Continuous Match Refinement',
    ],
    ctaText: 'Talk to Our Matchmaking Team',
    ctaAction: 'contact',
    sortOrder: 5,
    active: true,
  },
];

/**
 * 1. Get all public active membership plans
 * GET /api/membership-plans or GET /api/memberships
 */
export async function getMembershipPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dbPlans = await MembershipPlan.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
    if (dbPlans && dbPlans.length > 0) {
      const formatted = dbPlans.map((p) => {
        const raw = p.toObject ? p.toObject() : p;
        const finalPrice = raw.discountedPrice !== undefined && raw.discountedPrice !== null
          ? raw.discountedPrice
          : (raw.originalPrice ?? raw.price ?? 0);
        const origPrice = raw.originalPrice ?? raw.price ?? finalPrice;
        const discountPct = raw.seasonalDiscount ||
          (origPrice > finalPrice && origPrice > 0
            ? Math.round(((origPrice - finalPrice) / origPrice) * 100)
            : 0);

        return {
          ...raw,
          _id: raw._id,
          id: String(raw._id),
          key: raw.key || raw.slug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase(),
          planId: raw.planId || `plan_${raw.slug}`,
          amount: finalPrice,
          price: `₹${finalPrice.toLocaleString('en-IN')}`,
          originalPrice: origPrice,
          discountedPrice: finalPrice,
          originalPriceFormatted: `₹${origPrice.toLocaleString('en-IN')}`,
          discountedPriceFormatted: `₹${finalPrice.toLocaleString('en-IN')}`,
          discountPercent: discountPct,
          duration: raw.billingPeriod || (raw.durationMonths ? `${raw.durationMonths} Months` : 'Forever Free'),
          sortOrder: raw.displayOrder || 1,
        };
      });
      return res.json({ success: true, data: formatted });
    }

    // Fallback to in-memory plans if database has not yet seeded
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper to dynamically look up a plan from MongoDB (or fallback in-memory plans)
 */
export async function findPlanDynamic(targetKey: string): Promise<any> {
  if (!targetKey) return null;
  const str = String(targetKey).trim();
  const query: any[] = [
    { slug: str.toLowerCase() },
    { key: str.toUpperCase() },
    { planId: str },
    { name: new RegExp(`^${str}$`, 'i') },
  ];
  if (str.match(/^[0-9a-fA-F]{24}$/)) {
    query.push({ _id: str });
  }
  // Support legacy aliases
  if (str === 'PREMIUM') query.push({ slug: 'doctor-connect' }, { slug: 'premium' });
  if (str === 'PREMIUM_VIP') query.push({ slug: 'premium-match' }, { slug: 'premium' });
  if (str === 'VVIP') query.push({ slug: 'exclusive-concierge' });

  const dbPlan = await MembershipPlan.findOne({ $or: query, isActive: true });
  if (dbPlan) {
    const raw = dbPlan.toObject ? dbPlan.toObject() : dbPlan;
    const finalAmount = raw.discountedPrice !== undefined && raw.discountedPrice !== null
      ? raw.discountedPrice
      : (raw.originalPrice ?? raw.price ?? 0);
    return {
      ...raw,
      _id: raw._id,
      id: String(raw._id),
      key: raw.key || raw.slug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase(),
      planId: raw.planId || `plan_${raw.slug}`,
      amount: finalAmount,
      price: `₹${finalAmount.toLocaleString('en-IN')}`,
      duration: raw.billingPeriod || (raw.durationMonths ? `${raw.durationMonths} Months` : 'Forever Free'),
      durationDays: raw.durationDays || (raw.durationMonths ? raw.durationMonths * 30 : 90),
      contactRequestLimit: raw.contactRequestLimit ?? 0,
      isUnlimitedContact: Boolean(raw.isUnlimitedContact),
    };
  }

  // Fallback to static in-memory plans
  return (
    plans.find(
      (item) =>
        item.key.toLowerCase() === str.toLowerCase() ||
        item.slug.toLowerCase() === str.toLowerCase() ||
        item.planId.toLowerCase() === str.toLowerCase() ||
        item.name.toLowerCase() === str.toLowerCase() ||
        (str === 'PREMIUM' && item.slug === 'doctor-connect') ||
        (str === 'PREMIUM_VIP' && item.slug === 'premium-match') ||
        (str === 'VVIP' && item.slug === 'exclusive-concierge')
    ) || null
  );
}

/**
 * Helper to get contact credit limit for a plan
 */
function getContactCreditLimit(planKeyOrSlug: string, dynamicPlan?: any): number {
  if (dynamicPlan) {
    if (dynamicPlan.isUnlimitedContact || dynamicPlan.contactRequestLimit === -1) return 9999;
    return dynamicPlan.contactRequestLimit || 0;
  }
  const p = plans.find(
    (item) =>
      item.key.toLowerCase() === planKeyOrSlug.toLowerCase() ||
      item.slug.toLowerCase() === planKeyOrSlug.toLowerCase() ||
      item.planId.toLowerCase() === planKeyOrSlug.toLowerCase()
  );
  if (!p) return 0;
  if (p.isUnlimitedContact || p.contactRequestLimit === -1) return 9999;
  return p.contactRequestLimit;
}

/**
 * 2. Calculate Dynamic Offer for Plan & Member
 * POST /api/memberships/calculate-offer
 */
export async function calculateOfferEndpoint(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { planKey, slug, couponCode } = req.body;
    const targetKey = planKey || slug;
    if (!targetKey) {
      return res.status(400).json({ success: false, message: 'planKey is required' });
    }

    const offerResult = await calculateOffer({
      userId: req.user?.userId,
      planKeyOrSlug: targetKey,
      couponCode,
    });

    res.json({
      success: true,
      data: offerResult,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Unable to calculate offer' });
  }
}

/**
 * 3. Claim 100% Free Membership Entitlement Flow (Part 27)
 * POST /api/memberships/claim-free
 */
export async function claimFreeMembership(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { planKey, slug, planId, id, couponCode } = req.body;
    const targetKey = planKey || slug || planId || id;
    if (!targetKey) {
      return res.status(400).json({ success: false, message: 'Please select a membership plan' });
    }

    const plan = await findPlanDynamic(targetKey);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Membership plan not found' });
    }

    // Recalculate offer on backend safely
    const offerResult = await calculateOffer({
      userId,
      planKeyOrSlug: targetKey,
      couponCode,
    });

    if (!offerResult.isFree || offerResult.finalPrice > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible for a 100% free membership entitlement on this plan.',
      });
    }

    // Check active subscription
    const now = new Date();
    const existingActiveSub = await Subscription.findOne({
      user: userId,
      status: 'ACTIVE',
      $and: [
        { $or: [{ plan: plan.key }, { planId: plan.slug }] },
        { $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }] },
      ],
    });

    const durationDays = plan.durationDays || 90;
    const contactCredits = getContactCreditLimit(plan.slug);
    const claimId = `claim_free_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let subscription: any = existingActiveSub;
    let expiryDate: Date;

    if (existingActiveSub) {
      const baseDate = existingActiveSub.expiryDate && existingActiveSub.expiryDate > now ? existingActiveSub.expiryDate : now;
      expiryDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      existingActiveSub.expiryDate = expiryDate;
      existingActiveSub.contactRequestsRemaining = (existingActiveSub.contactRequestsRemaining || 0) + contactCredits;
      existingActiveSub.paymentReference = claimId;
      await existingActiveSub.save();
    } else {
      expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      subscription = await Subscription.create({
        user: userId,
        plan: plan.key,
        planId: plan.slug,
        status: 'ACTIVE',
        startDate: new Date(),
        expiryDate,
        contactRequestsRemaining: contactCredits,
        contactRequestsUsed: 0,
        paymentReference: claimId,
      });
    }

    // Create 0 INR payment record for audit
    const payment = await Payment.create({
      user: userId,
      subscription: subscription._id,
      orderId: claimId,
      paymentId: claimId,
      provider: 'free_campaign_claim',
      providerPaymentId: claimId,
      amount: 0,
      currency: 'INR',
      planId: plan.planId,
      planName: plan.name,
      paymentMethod: 'CAMPAIGN_100_PERCENT_OFFER',
      status: 'SUCCESS',
      metadata: {
        reason: '100_PERCENT_CAMPAIGN_DISCOUNT',
        campaignId: offerResult.campaign?.id,
        campaignName: offerResult.campaign?.name,
        couponId: offerResult.coupon?.id,
        couponCode: offerResult.coupon?.code,
        originalAmount: offerResult.originalPrice,
        discountAmount: offerResult.discountAmount,
        finalAmount: 0,
      },
    });

    // Record Coupon Redemption if coupon was used
    if (offerResult.coupon?.id) {
      await CouponRedemption.create({
        couponId: offerResult.coupon.id,
        couponCode: offerResult.coupon.code,
        userId,
        campaignId: offerResult.campaign?.id,
        planKey: plan.key,
        originalAmount: offerResult.originalPrice,
        discountAmount: offerResult.discountAmount,
        finalAmount: 0,
        paymentId: claimId,
        orderId: claimId,
        status: 'SUCCESS',
      });
      await Coupon.findByIdAndUpdate(offerResult.coupon.id, { $inc: { usedCount: 1 } });
    }

    // Increment campaign usage counts
    if (offerResult.campaign?.id) {
      const profile = await Profile.findOne({ user: userId });
      const gender = profile?.gender || 'Female';

      const updateObj: any = {
        $inc: {
          usedCount: 1,
          'analytics.timesClaimed': 1,
          'analytics.totalDiscountGiven': offerResult.discountAmount,
        },
      };
      if (gender === 'Female') updateObj.$inc['genderUsageLimit.femaleUsed'] = 1;
      if (gender === 'Male') updateObj.$inc['genderUsageLimit.maleUsed'] = 1;

      await Campaign.findByIdAndUpdate(offerResult.campaign.id, updateObj);
    }

    // Log Audit
    await AuditLog.create({
      adminEmail: 'system@wonderfuljodi.com',
      action: 'FREE_MEMBERSHIP_CLAIMED',
      targetModel: 'Subscription',
      targetId: String(subscription._id),
      targetUserId: userId,
      details: `100% free membership activated via ${offerResult.campaign?.name || offerResult.coupon?.name || 'Campaign'}`,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `Congratulations! Your free ${plan.name} membership has been activated successfully.`,
      data: {
        subscription,
        payment,
        plan,
        offerResult,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Create Membership Order (Initiate Upgrade)
 * POST /api/memberships/create-order
 */
export async function createOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Please sign in to proceed with your membership upgrade.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found. Please log in again.',
      });
    }

    const { planKey, slug, planId, id, couponCode } = req.body;
    const targetKey = planKey || slug || planId || id;
    if (!targetKey) {
      return res.status(400).json({
        success: false,
        message: 'Please select a membership plan to continue.',
      });
    }

    const plan = await findPlanDynamic(targetKey);

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'The selected membership plan is not available.',
      });
    }

    // Check if user already has an active subscription for this plan
    const now = new Date();
    const existingActiveSub = await Subscription.findOne({
      user: userId,
      status: 'ACTIVE',
      $and: [
        { $or: [{ plan: plan.key }, { planId: plan.slug }] },
        { $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }] },
      ],
    });

    if (existingActiveSub) {
      return res.status(409).json({
        success: false,
        alreadyActive: true,
        message: `You already have an active ${plan.name} membership (valid until ${
          existingActiveSub.expiryDate
            ? existingActiveSub.expiryDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'Ongoing'
        }).`,
      });
    }

    // Calculate server-authoritative final price using Offer Engine
    const offerResult = await calculateOffer({
      userId,
      planKeyOrSlug: targetKey,
      couponCode,
    });

    // If offer calculates to ₹0 (100% discount), instruct client to claim free
    if (offerResult.isFree || offerResult.finalPrice === 0) {
      return res.json({
        success: true,
        isFree: true,
        message: 'This membership offer is 100% free! Click Claim to activate.',
        data: {
          isFree: true,
          plan,
          offerResult,
        },
      });
    }

    const payableAmount = offerResult.finalPrice;

    // Detect payment gateway configuration
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAPIDPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAPIDPAY_KEY_SECRET || '';

    const isLiveGateway = Boolean(
      keyId &&
      keySecret &&
      keyId.startsWith('rzp_') &&
      keyId !== 'rzp_test_mock' &&
      !keyId.includes('your_actual_key_id') &&
      keySecret !== 'rzp_secret_mock' &&
      keySecret !== 'your_actual_key_secret'
    );

    const isProduction = process.env.NODE_ENV === 'production';
    const allowSimulatedPayments =
      !isProduction &&
      (process.env.ALLOW_SIMULATED_PAYMENTS === 'true' || process.env.ENABLE_SIMULATED_PAYMENTS === 'true');

    if (!isLiveGateway && !allowSimulatedPayments) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway service is not configured or currently unavailable. Please contact support.',
      });
    }

    let order: any = null;
    let isSimulated = false;

    // If live/test Razorpay credentials are configured, create real gateway order
    if (isLiveGateway) {
      try {
        const razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        const safeReceipt = `rcpt_${String(userId).slice(-12)}_${Date.now()}`;
        order = await razorpay.orders.create({
          amount: Math.round(payableAmount * 100),
          currency: 'INR',
          receipt: safeReceipt,
          payment_capture: true,
          notes: {
            planKey: plan.key,
            userId: String(userId),
            userEmail: user.email,
            couponCode: offerResult.coupon?.code || '',
            campaignId: offerResult.campaign?.id || '',
          },
        });
      } catch (rzpErr: any) {
        console.error('Razorpay gateway order creation failed:', rzpErr?.message || rzpErr);
        // Never silently fall back to simulated orders when live gateway credentials are configured
        return res.status(502).json({
          success: false,
          message: 'Payment gateway order creation failed. Please try again shortly.',
          error: process.env.NODE_ENV === 'development' ? rzpErr?.message : undefined,
        });
      }
    } else if (allowSimulatedPayments) {
      isSimulated = true;
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const safeReceipt = `rcpt_${String(userId).slice(-12)}_${Date.now()}`;
      order = {
        id: orderId,
        entity: 'order',
        amount: Math.round(payableAmount * 100),
        amount_paid: 0,
        amount_due: Math.round(payableAmount * 100),
        currency: 'INR',
        receipt: safeReceipt,
        status: 'created',
        attempts: 0,
        notes: {
          planKey: plan.key,
          userId: String(userId),
          userEmail: user.email,
          couponCode: offerResult.coupon?.code || '',
          campaignId: offerResult.campaign?.id || '',
        },
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const durationDays = plan.durationDays || (plan.key === 'PREMIUM_VIP' ? 180 : 90);
    const calculatedExpiry = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // Invalidate stale PENDING subscriptions & payments for this user/plan to prevent duplicate pending orders on retry
    try {
      await Subscription.updateMany(
        { user: userId, plan: plan.key, status: 'PENDING' },
        { status: 'CANCELLED' }
      );
      if (plan.planId) {
        await Payment.updateMany(
          { user: userId, planId: plan.planId, status: 'PENDING' },
          { status: 'CANCELLED' }
        );
      }
    } catch {
      // Non-fatal if cleanup of older pending orders encounters an issue
    }

    // Create a pending subscription record for tracking
    const pendingSubscription = await Subscription.create({
      user: userId,
      plan: plan.key,
      planId: plan.slug,
      status: 'PENDING',
      startDate: new Date(),
      expiryDate: calculatedExpiry,
    });

    let payment: any = null;
    try {
      // Create a pending Payment record with full audit metadata
      payment = await Payment.create({
        user: userId,
        subscription: pendingSubscription._id,
        orderId: order.id,
        provider: isSimulated ? 'simulated' : 'razorpay',
        providerPaymentId: order.id,
        amount: payableAmount,
        currency: 'INR',
        planId: plan.planId,
        planName: plan.name,
        status: 'PENDING',
        receipt: order.receipt,
        isSimulated,
        metadata: {
          planKey: plan.key,
          planSlug: plan.slug,
          duration: plan.duration,
          durationDays,
          userEmail: user.email,
          originalAmount: offerResult.originalPrice,
          discountAmount: offerResult.discountAmount,
          finalAmount: payableAmount,
          campaignId: offerResult.campaign?.id,
          campaignName: offerResult.campaign?.name,
          couponId: offerResult.coupon?.id,
          couponCode: offerResult.coupon?.code,
          initiatedAt: new Date().toISOString(),
        },
      });
    } catch (payErr) {
      // Rollback orphaned pending subscription to prevent partial records
      try {
        await Subscription.deleteOne({ _id: pendingSubscription._id });
      } catch {
        // ignore rollback error
      }
      throw payErr;
    }

    res.json({
      success: true,
      message: `Order for ${plan.name} initiated successfully.`,
      data: {
        order,
        plan,
        offerResult,
        keyId: isLiveGateway ? keyId : undefined,
        isSimulated,
        subscriptionId: pendingSubscription._id,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    next(error);
  }
}

/**
 * Helper to reconcile a successful payment whose subscription activation remained pending or failed.
 * This guarantees safe recovery without reverting verified payments to PENDING.
 */
export async function reconcileVerifiedPaymentSubscription(userId: string, targetPayment?: any): Promise<any | null> {
  try {
    const payment = targetPayment || await Payment.findOne({
      user: userId,
      status: 'SUCCESS',
    }).sort({ createdAt: -1 });

    if (!payment || !payment.subscription) return null;

    const existingSub = await Subscription.findById(payment.subscription);
    if (!existingSub || existingSub.status === 'ACTIVE') return existingSub;

    const targetPlanKey = payment.metadata?.planKey || payment.planId;
    const plan = (await findPlanDynamic(targetPlanKey)) || plans.find((p) => p.key === targetPlanKey);
    if (!plan) return null;

    const durationDays = payment.metadata?.durationDays || plan.durationDays || 90;
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const contactCredits = getContactCreditLimit(plan.slug, plan);

    existingSub.status = 'ACTIVE';
    existingSub.plan = plan.key;
    existingSub.planId = plan.slug;
    existingSub.startDate = new Date();
    existingSub.expiryDate = expiryDate;
    existingSub.contactRequestsRemaining = contactCredits;
    existingSub.contactRequestsUsed = 0;
    existingSub.paymentReference = payment.paymentId || payment.providerPaymentId || payment.orderId;
    await existingSub.save();

    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          'metadata.subscriptionActivationFailed': false,
          'metadata.reconciledAt': new Date().toISOString(),
        },
      }
    ).catch(() => {});

    await AuditLog.create({
      adminEmail: 'system@wonderfuljodi.com',
      action: 'PAYMENT_SUBSCRIPTION_RECONCILED',
      targetModel: 'Subscription',
      targetId: String(existingSub._id),
      targetUserId: userId,
      details: `Reconciled and activated pending subscription for verified payment ${payment.orderId}. Plan: ${plan.name}`,
      status: 'SUCCESS',
    }).catch(() => {});

    return existingSub;
  } catch (err) {
    console.error('Error during payment subscription reconciliation:', err);
    return null;
  }
}

/**
 * 5. Verify Payment & Activate Membership
 * POST /api/memberships/verify
 */
export async function verifyPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
      });
    }

    const { orderId, paymentId, signature, paymentMethod } = req.body;

    // Require orderId - never search by arbitrary paymentId alone
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required for payment verification.',
      });
    }

    const cleanOrderId = orderId.trim();

    // Locate the existing pending payment belonging to this authenticated user using server-issued order ID
    const payment = await Payment.findOne({
      orderId: cleanOrderId,
      user: userId,
    });

    if (!payment) {
      // Check if order exists under another user to distinguish ownership mismatch
      const foreignPayment = await Payment.findOne({ orderId: cleanOrderId });
      if (foreignPayment) {
        return res.status(403).json({
          success: false,
          message: 'Payment record does not belong to the authenticated user.',
        });
      }
      return res.status(404).json({
        success: false,
        message: 'Payment record not found for the provided order ID.',
      });
    }

    // Handle already processed payments idempotently and reconcile any partial activation failure
    if (payment.status === 'SUCCESS') {
      const existingSub = payment.subscription ? await Subscription.findById(payment.subscription) : null;

      // RECONCILIATION: If payment is SUCCESS but subscription was not yet activated (e.g. earlier save failure),
      // safely activate the subscription now rather than returning an inactive membership!
      if (existingSub && existingSub.status !== 'ACTIVE') {
        const reconciledSub = await reconcileVerifiedPaymentSubscription(userId, payment);
        if (reconciledSub) {
          const targetPlanKey = payment.metadata?.planKey || payment.planId;
          const plan = (await findPlanDynamic(targetPlanKey)) || plans.find((p) => p.key === targetPlanKey);
          return res.status(200).json({
            success: true,
            message: `Congratulations! Your ${plan?.name || 'membership'} has been activated successfully.`,
            reconciled: true,
            data: {
              payment,
              subscription: reconciledSub,
              plan,
            },
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment has already been verified and processed.',
        alreadyProcessed: true,
        data: {
          payment,
          subscription: existingSub,
        },
      });
    }

    // Reject any invalid payment state (CANCELLED, FAILED, REFUNDED)
    if (payment.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be verified because it is currently in '${payment.status}' state.`,
      });
    }

    // Verify associated pending subscription exists and belongs to the authenticated user
    if (!payment.subscription) {
      return res.status(400).json({
        success: false,
        message: 'No associated pending subscription found for this payment.',
      });
    }

    const subscription = await Subscription.findById(payment.subscription);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Associated pending subscription record not found.',
      });
    }

    const subUserId = String(subscription.user || subscription.userId);
    if (subUserId !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Associated subscription does not belong to the authenticated user.',
      });
    }

    let finalPaymentId: string;

    // In live/test Razorpay gateway mode
    if (!payment.isSimulated) {
      if (!paymentId || typeof paymentId !== 'string' || !paymentId.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required for gateway verification.',
        });
      }

      if (!signature || typeof signature !== 'string' || !signature.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Payment signature is required for gateway verification.',
        });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAPIDPAY_KEY_SECRET || '';
      if (!keySecret) {
        return res.status(500).json({
          success: false,
          message: 'Payment gateway configuration error: secret key not configured.',
        });
      }

      const cleanPaymentId = paymentId.trim();
      const cleanSignature = signature.trim();

      // Validate signature hex format and exact 64-character SHA256 length
      if (!/^[0-9a-fA-F]{64}$/.test(cleanSignature)) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Malformed signature format.',
        });
      }

      // Generate expected HMAC-SHA256 signature using ${orderId}|${paymentId}
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${cleanOrderId}|${cleanPaymentId}`)
        .digest('hex');

      const sigBuffer = Buffer.from(cleanSignature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      // Timing-safe signature comparison
      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Invalid transaction signature.',
        });
      }

      finalPaymentId = cleanPaymentId;
    } else {
      // Simulated payment verification (development/testing only)
      const isProduction = process.env.NODE_ENV === 'production';
      const allowSimulatedPayments =
        !isProduction &&
        (process.env.ALLOW_SIMULATED_PAYMENTS === 'true' || process.env.ENABLE_SIMULATED_PAYMENTS === 'true');

      if (!allowSimulatedPayments) {
        return res.status(403).json({
          success: false,
          message: 'Simulated payments are strictly forbidden in this environment.',
        });
      }

      finalPaymentId = (typeof paymentId === 'string' && paymentId.trim())
        ? paymentId.trim()
        : `sim_${cleanOrderId}`;
    }

    // Derive plan, amount, duration, and credits strictly from stored server-side payment records
    const targetPlanKey = payment.metadata?.planKey || payment.planId;
    const plan = (await findPlanDynamic(targetPlanKey)) || plans.find((p) => p.key === targetPlanKey);
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Associated membership plan could not be resolved from payment records.',
      });
    }

    const durationDays = payment.metadata?.durationDays || plan.durationDays || 90;
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const contactCredits = getContactCreditLimit(plan.slug, plan);

    // Atomically transition payment status from PENDING to SUCCESS to prevent race conditions
    const updateRes = await Payment.updateOne(
      { _id: payment._id, status: 'PENDING' },
      {
        status: 'SUCCESS',
        paymentId: finalPaymentId,
        providerPaymentId: finalPaymentId,
        paymentMethod: paymentMethod || payment.paymentMethod || 'UPI',
        ...(signature ? { razorpaySignature: signature.trim() } : {}),
      }
    );

    if (updateRes.modifiedCount === 0) {
      // Concurrently processed by a duplicate or parallel request
      const refreshedPayment = await Payment.findById(payment._id);
      if (refreshedPayment?.status === 'SUCCESS') {
        let existingSub = refreshedPayment.subscription ? await Subscription.findById(refreshedPayment.subscription) : null;
        if (existingSub && existingSub.status !== 'ACTIVE') {
          // Concurrently arrived while first request had failed subscription activation: reconcile!
          existingSub = (await reconcileVerifiedPaymentSubscription(userId, refreshedPayment)) || existingSub;
        }
        return res.status(200).json({
          success: true,
          message: 'Payment has already been verified and processed.',
          alreadyProcessed: true,
          data: {
            payment: refreshedPayment,
            subscription: existingSub,
            plan,
          },
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Payment could not be updated or is no longer pending.',
      });
    }

    // Activate the user's subscription with safe error handling and resilient fallback
    let activationSucceeded = false;
    try {
      subscription.status = 'ACTIVE';
      subscription.plan = plan.key;
      subscription.planId = plan.slug;
      subscription.startDate = new Date();
      subscription.expiryDate = expiryDate;
      subscription.contactRequestsRemaining = contactCredits;
      subscription.contactRequestsUsed = 0;
      subscription.paymentReference = finalPaymentId;
      await subscription.save();
      activationSucceeded = true;
    } catch (subSaveErr: any) {
      console.error('Subscription save failed after payment verification:', subSaveErr?.message || subSaveErr);
      // Resilient fallback: attempt direct update on Subscription model
      try {
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            status: 'ACTIVE',
            plan: plan.key,
            planId: plan.slug,
            startDate: new Date(),
            expiryDate,
            contactRequestsRemaining: contactCredits,
            contactRequestsUsed: 0,
            paymentReference: finalPaymentId,
          }
        );
        subscription.status = 'ACTIVE';
        subscription.plan = plan.key;
        subscription.planId = plan.slug;
        subscription.expiryDate = expiryDate;
        subscription.contactRequestsRemaining = contactCredits;
        activationSucceeded = true;
      } catch (fallbackErr: any) {
        console.error('Subscription update fallback also failed:', fallbackErr?.message || fallbackErr);
        // Flag payment metadata so reconciliation picks it up without reverting payment status to PENDING
        try {
          await Payment.updateOne(
            { _id: payment._id },
            {
              $set: {
                'metadata.subscriptionActivationFailed': true,
                'metadata.subscriptionActivationError': fallbackErr?.message || subSaveErr?.message,
              },
            }
          );
        } catch {
          // non-fatal
        }
      }
    }

    if (!activationSucceeded) {
      // Do not return false success. Do not revert payment to PENDING (funds were already captured).
      // Alert client that payment is recorded but activation needs retry reconciliation.
      return res.status(500).json({
        success: false,
        message: 'Payment verified successfully, but membership activation encountered a database error. Please retry verification to complete activation.',
        error: 'SUBSCRIPTION_ACTIVATION_FAILED',
        retryable: true,
        data: {
          orderId: cleanOrderId,
          paymentId: finalPaymentId,
          paymentStatus: 'SUCCESS',
          subscriptionStatus: 'PENDING',
        },
      });
    }

    // Atomically record coupon redemption if coupon was applied (executed only once per order)
    if (payment.metadata?.couponCode && payment.metadata?.couponId) {
      try {
        await CouponRedemption.create({
          couponId: payment.metadata.couponId,
          couponCode: payment.metadata.couponCode,
          userId,
          campaignId: payment.metadata.campaignId,
          planKey: plan.key,
          originalAmount: payment.metadata.originalAmount || payment.amount,
          discountAmount: payment.metadata.discountAmount || 0,
          finalAmount: payment.metadata.finalAmount || payment.amount,
          paymentId: finalPaymentId,
          orderId: cleanOrderId,
          status: 'SUCCESS',
        });
        await Coupon.findByIdAndUpdate(payment.metadata.couponId, { $inc: { usedCount: 1 } });
      } catch (couponErr) {
        console.error('Error recording coupon redemption:', couponErr);
      }
    }

    // Increment campaign analytics
    if (payment.metadata?.campaignId) {
      try {
        const profile = await Profile.findOne({ user: userId });
        const gender = profile?.gender || 'Male';

        const updateObj: any = {
          $inc: {
            usedCount: 1,
            'analytics.timesClaimed': 1,
            'analytics.totalDiscountGiven': payment.metadata.discountAmount || 0,
            'analytics.totalRevenueGenerated': payment.metadata.finalAmount || payment.amount,
          },
        };
        if (gender === 'Female') updateObj.$inc['genderUsageLimit.femaleUsed'] = 1;
        if (gender === 'Male') updateObj.$inc['genderUsageLimit.maleUsed'] = 1;

        await Campaign.findByIdAndUpdate(payment.metadata.campaignId, updateObj);
      } catch (campaignErr) {
        console.error('Error updating campaign analytics:', campaignErr);
      }
    }

    // Log to AuditLog
    await AuditLog.create({
      adminEmail: 'system@wonderfuljodi.com',
      action: 'PAYMENT_SUCCESS',
      targetModel: 'Subscription',
      targetId: String(subscription._id),
      targetUserId: userId,
      details: `Verified payment ${finalPaymentId} for order ${cleanOrderId}. Activated ${plan.name} (₹${payment.amount}) with ${contactCredits} contact credits for user ${userId}. Expiry: ${expiryDate.toISOString()}`,
      ipAddress: req.ip || '127.0.0.1',
      status: 'SUCCESS',
    }).catch(() => {});

    res.json({
      success: true,
      message: `Congratulations! Your ${plan.name} membership has been activated successfully.`,
      data: {
        payment: {
          ...(payment.toObject ? payment.toObject() : payment),
          status: 'SUCCESS',
          paymentId: finalPaymentId,
          providerPaymentId: finalPaymentId,
        },
        subscription,
        plan,
      },
    });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    next(error);
  }
}

/**
 * 4. Get Current User's Membership Status
 * GET /api/memberships/status or /api/memberships/my-status
 */
export async function getMyMembershipStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let subscription = await Subscription.findOne({
      user: userId,
      status: 'ACTIVE',
      $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
    }).sort({ createdAt: -1 });

    // Self-healing reconciliation: If user has a verified SUCCESS payment whose subscription was never activated
    if (!subscription) {
      subscription = await reconcileVerifiedPaymentSubscription(userId);
    }

    const activePlan = plans.find(
      (p) =>
        p.key === subscription?.plan ||
        p.slug === subscription?.planId ||
        p.slug === (subscription?.plan || '').toLowerCase()
    ) || plans[0];

    const isPremium =
      req.user?.role === 'admin' ||
      Boolean(
        subscription &&
          ['DOCTOR_CONNECT', 'PREMIUM_MATCH', 'PRIORITY_MATCHMAKING', 'EXCLUSIVE_CONCIERGE', 'PREMIUM', 'PREMIUM_VIP', 'GOLD', 'PLATINUM', 'DIAMOND', 'VVIP'].includes(
            subscription.plan
          )
      );

    const isUnlimited = activePlan.isUnlimitedContact || activePlan.contactRequestLimit === -1;

    res.json({
      success: true,
      data: {
        isPremium,
        plan: activePlan.name,
        planKey: activePlan.key,
        slug: activePlan.slug,
        status: subscription ? subscription.status : 'ACTIVE',
        startDate: subscription?.startDate,
        expiryDate: subscription?.expiryDate,
        contactRequestsUsed: subscription?.contactRequestsUsed ?? 0,
        contactRequestsRemaining: isUnlimited
          ? 9999
          : subscription?.contactRequestsRemaining ?? activePlan.contactRequestLimit,
        contactRequestLimit: activePlan.contactRequestLimit,
        isUnlimitedContact: isUnlimited,
        badge: activePlan.badge || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. Get Current User's Full Subscription Details
 * GET /api/subscription/me
 */
export async function getMySubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const now = new Date();
    let subscription = await Subscription.findOne({
      user: userId,
      status: 'ACTIVE',
      $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
    }).sort({ createdAt: -1 });

    // Self-healing reconciliation: If user has a verified SUCCESS payment whose subscription was never activated
    if (!subscription) {
      subscription = await reconcileVerifiedPaymentSubscription(userId);
    }

    const activePlan = plans.find(
      (p) =>
        p.key === subscription?.plan ||
        p.slug === subscription?.planId ||
        p.slug === (subscription?.plan || '').toLowerCase()
    ) || plans[0];

    const isUnlimited = activePlan.isUnlimitedContact || activePlan.contactRequestLimit === -1;
    const requestsUsed = subscription?.contactRequestsUsed ?? 0;
    const requestsRemaining = isUnlimited
      ? 9999
      : subscription?.contactRequestsRemaining ?? activePlan.contactRequestLimit;

    res.json({
      success: true,
      data: {
        id: subscription?._id || 'free_sub',
        userId,
        plan: activePlan.name,
        planKey: activePlan.key,
        slug: activePlan.slug,
        planId: activePlan.slug,
        status: subscription ? subscription.status : 'ACTIVE',
        price: activePlan.price,
        duration: activePlan.duration,
        startDate: subscription?.startDate || new Date(),
        expiryDate: subscription?.expiryDate || null,
        contactRequestsUsed: requestsUsed,
        contactRequestsRemaining: requestsRemaining,
        contactRequestLimit: activePlan.contactRequestLimit,
        isUnlimitedContact: isUnlimited,
        fairUsageEnabled: activePlan.fairUsageEnabled ?? false,
        isPopular: activePlan.isPopular ?? false,
        badge: activePlan.badge || null,
        isExpired: false,
      },
    });
  } catch (error) {
    next(error);
  }
}
