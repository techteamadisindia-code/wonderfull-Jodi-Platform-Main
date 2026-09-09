<<<<<<< HEAD
import { Response, NextFunction } from 'express';
=======
import { Request, Response, NextFunction } from 'express';
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
<<<<<<< HEAD
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { MembershipPlan } from '../models/MembershipPlan';

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
    // Optionally return plans
=======

const plans = [
  { key: 'FREE', name: 'Free', amount: 0, features: ['Create profile', 'Search profiles', 'Limited interests'] },
  { key: 'PREMIUM', name: 'Premium', amount: 4999, features: ['Advanced search', 'More interests', 'Message access'] },
  { key: 'PREMIUM_PLUS', name: 'Premium Plus', amount: 9999, features: ['Priority visibility', 'Premium recommendations', 'Premium support'] },
];

export async function getMembershipPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

<<<<<<< HEAD
/**
 * Helper to get contact credit limit for a plan
 */
function getContactCreditLimit(planKeyOrSlug: string): number {
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
 * 2. Create Membership Order (Initiate Upgrade)
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

    const { planKey, slug } = req.body;
    const targetKey = planKey || slug;
    if (!targetKey) {
      return res.status(400).json({
        success: false,
        message: 'Please select a membership plan to continue.',
      });
    }

    const plan = plans.find(
      (item) =>
        item.key.toLowerCase() === String(targetKey).toLowerCase() ||
        item.slug.toLowerCase() === String(targetKey).toLowerCase() ||
        item.planId.toLowerCase() === String(targetKey).toLowerCase() ||
        item.name.toLowerCase() === String(targetKey).toLowerCase() ||
        // Support legacy plan aliases
        (targetKey === 'PREMIUM' && item.slug === 'doctor-connect') ||
        (targetKey === 'PREMIUM_VIP' && item.slug === 'premium-match') ||
        (targetKey === 'VVIP' && item.slug === 'exclusive-concierge')
    );

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

    const initialCredits = getContactCreditLimit(plan.slug);

    // Free plan activation
    if (plan.amount === 0 && !plan.isVvip) {
      const subscription = await Subscription.create({
        user: userId,
        plan: plan.key,
        planId: plan.slug,
        status: 'ACTIVE',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
        contactRequestsUsed: 0,
        contactRequestsRemaining: 0,
      });

      return res.json({
        success: true,
        message: 'Free membership activated successfully.',
        data: { subscription, plan },
      });
    }

    // Paid plan upgrade flow
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAPIDPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAPIDPAY_KEY_SECRET || '';
    const isLiveGateway = Boolean(
      keyId && keySecret && keyId !== 'rzp_test_mock' && keyId.startsWith('rzp_')
    );

    let order: any = null;

    let isSimulated = !isLiveGateway;

    // If live/test Razorpay API credentials are configured, attempt real order creation
    if (isLiveGateway) {
      try {
        const razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        order = await razorpay.orders.create({
          amount: Math.round(plan.amount * 100),
          currency: 'INR',
          receipt: `rcpt_${userId}_${Date.now()}`,
          payment_capture: true,
          notes: {
            planKey: plan.key,
            userId: String(userId),
            userEmail: user.email,
          },
        });
      } catch (rzpErr: any) {
        console.warn(
          'Razorpay order creation via gateway API failed, falling back to simulated order:',
          rzpErr?.message || rzpErr
        );
        isSimulated = true;
      }
    }

    // Fallback or Sandbox Simulated Order
    if (!order) {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      order = {
        id: orderId,
        entity: 'order',
        amount: Math.round(plan.amount * 100),
        amount_paid: 0,
        amount_due: Math.round(plan.amount * 100),
        currency: 'INR',
        receipt: `rcpt_${userId}_${Date.now()}`,
        status: 'created',
        attempts: 0,
        notes: {
          planKey: plan.key,
          userId: String(userId),
          userEmail: user.email,
        },
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const durationDays = plan.durationDays || (plan.key === 'PREMIUM_VIP' ? 180 : 90);
    const calculatedExpiry = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // Create a pending subscription record for tracking
    const pendingSubscription = await Subscription.create({
      user: userId,
      plan: plan.key,
      status: 'PENDING',
      startDate: new Date(),
      expiryDate: calculatedExpiry,
    });

    // Create a pending Payment record
    const payment = await Payment.create({
      user: userId,
      subscription: pendingSubscription._id,
      orderId: order.id,
=======
export async function createOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { planKey } = req.body;
    const plan = plans.find((item) => item.key === planKey);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    if (plan.amount === 0) {
      const subscription = await Subscription.create({
        user: req.user?.userId,
        plan: plan.key,
        status: 'ACTIVE',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      return res.json({ success: true, data: { subscription } });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAPIDPAY_KEY_ID ?? '',
      key_secret: process.env.RAPIDPAY_KEY_SECRET ?? '',
    });

    const order = await razorpay.orders.create({
      amount: plan.amount * 100,
      currency: 'INR',
      receipt: `order_${req.user?.userId}_${Date.now()}`,
      payment_capture: 1,
    });

    const pendingSubscription = await Subscription.create({
      user: req.user?.userId,
      plan: plan.key,
      status: 'CANCELLED',
      startDate: new Date(),
    });

    await Payment.create({
      user: req.user?.userId,
      subscription: pendingSubscription._id,
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
      provider: 'razorpay',
      providerPaymentId: order.id,
      amount: plan.amount,
      currency: 'INR',
<<<<<<< HEAD
      planId: plan.planId,
      planName: plan.name,
      status: 'PENDING',
      receipt: order.receipt,
      isSimulated,
      metadata: {
        planKey: plan.key,
        duration: plan.duration,
        userEmail: user.email,
        initiatedAt: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      message: `Order for ${plan.name} initiated successfully.`,
      data: {
        order,
        plan,
        keyId: isLiveGateway ? keyId : 'rzp_test_mock',
        isSimulated,
        subscriptionId: pendingSubscription._id,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
=======
      status: 'PENDING',
    });

    res.json({ success: true, data: { order, plan, subscriptionId: pendingSubscription._id } });
  } catch (error) {
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    next(error);
  }
}

<<<<<<< HEAD
/**
 * 3. Verify Payment & Activate Membership
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

    const { paymentId, orderId, signature, planKey, subscriptionId } = req.body;
    if (!orderId && !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing order and payment identification.',
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAPIDPAY_KEY_SECRET || '';
    const isLiveKey = Boolean(keySecret && keySecret !== 'rzp_secret_mock');

    // If signature provided and live key present, verify HMAC signature
    if (isLiveKey && signature && orderId && paymentId) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Invalid transaction signature.',
        });
      }
    }

    // Locate the Payment record
    const payment = await Payment.findOne({
      $or: [
        { orderId: orderId },
        { providerPaymentId: orderId },
        { paymentId: paymentId },
        { providerPaymentId: paymentId },
      ],
    });

    const targetPlanKey = planKey || payment?.metadata?.planKey || 'PREMIUM';
    const plan = plans.find((p) => p.key === targetPlanKey) || plans[1];
    const durationDays = plan.durationDays || (targetPlanKey === 'PREMIUM_VIP' ? 180 : 90);
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const finalPaymentId = paymentId || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (payment) {
      payment.status = 'SUCCESS';
      payment.paymentId = finalPaymentId;
      payment.providerPaymentId = finalPaymentId;
      payment.paymentMethod = req.body.paymentMethod || payment.paymentMethod || 'UPI';
      if (signature) payment.razorpaySignature = signature;
      await payment.save();
    } else {
      // Create payment record if not found
      await Payment.create({
        user: userId,
        orderId: orderId || `order_${Date.now()}`,
        paymentId: finalPaymentId,
        provider: 'razorpay',
        providerPaymentId: finalPaymentId,
        amount: plan.amount,
        currency: 'INR',
        planId: plan.planId,
        planName: plan.name,
        status: 'SUCCESS',
        isSimulated: !isLiveKey,
        razorpaySignature: signature,
      });
    }

    // Activate the user's subscription
    let subscription = null;
    const targetSubId = payment?.subscription || subscriptionId;
    const contactCredits = getContactCreditLimit(plan.slug);

    if (targetSubId) {
      subscription = await Subscription.findByIdAndUpdate(
        targetSubId,
        {
          status: 'ACTIVE',
          plan: plan.key,
          planId: plan.slug,
          startDate: new Date(),
          expiryDate,
          contactRequestsRemaining: contactCredits,
          contactRequestsUsed: 0,
          paymentReference: finalPaymentId,
        },
        { new: true }
      );
    }

    if (!subscription) {
      subscription = await Subscription.create({
        user: userId,
        plan: plan.key,
        planId: plan.slug,
        status: 'ACTIVE',
        startDate: new Date(),
        expiryDate,
        contactRequestsRemaining: contactCredits,
        contactRequestsUsed: 0,
        paymentReference: finalPaymentId,
      });
    }

    // Log to AuditLog
    await AuditLog.create({
      adminEmail: 'system@wonderfuljodi.com',
      action: 'PAYMENT_SUCCESS',
      targetModel: 'Subscription',
      targetId: String(subscription._id),
      details: `Activated ${plan.name} (₹${plan.amount}) with ${contactCredits} contact credits for user ${userId}. Expiry: ${expiryDate.toISOString()}`,
      ipAddress: req.ip || '127.0.0.1',
      status: 'SUCCESS',
    }).catch(() => {});

    res.json({
      success: true,
      message: `Congratulations! Your ${plan.name} membership has been activated successfully.`,
      data: {
        payment,
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

    const subscription = await Subscription.findOne({
      user: userId,
      status: 'ACTIVE',
      $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
    }).sort({ createdAt: -1 });

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
    const subscription = await Subscription.findOne({
      user: userId,
      status: 'ACTIVE',
      $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
    }).sort({ createdAt: -1 });

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
=======
export async function verifyPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { paymentId, orderId, signature, planKey } = req.body;
    if (!paymentId || !orderId || !signature || !planKey) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAPIDPAY_KEY_ID ?? '',
      key_secret: process.env.RAPIDPAY_KEY_SECRET ?? '',
    });

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAPIDPAY_KEY_SECRET ?? '')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const payment = await Payment.findOneAndUpdate(
      { providerPaymentId: orderId, status: 'PENDING' },
      { providerPaymentId: paymentId, status: 'SUCCESS', metadata: { signature } },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const subscription = await Subscription.findByIdAndUpdate(
      payment.subscription,
      { status: 'ACTIVE', plan: planKey, startDate: new Date(), expiryDate },
      { new: true }
    );

    res.json({ success: true, data: { payment, subscription } });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  } catch (error) {
    next(error);
  }
}
