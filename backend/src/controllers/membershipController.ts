import { Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';

export interface MembershipPlanConfig {
  key: string;
  planId: string;
  name: string;
  displayName: string;
  amount: number;
  price: string;
  duration: string;
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

const plans: MembershipPlanConfig[] = [
  {
    key: 'FREE',
    planId: 'plan_free',
    name: 'Free Plan',
    displayName: 'Explore & Build Your Profile',
    amount: 0,
    price: '₹0',
    duration: 'Forever Free',
    description: 'Create your professional doctor matrimonial profile and start discovering compatible matches.',
    badge: 'FREE PLAN',
    bestFor: 'Doctors who are just starting their search',
    features: [
      'Create detailed doctor matrimonial profile',
      'Doctor/profession information',
      'Upload up to 3 photos',
      'Basic profile search',
      'Basic match recommendations',
      'Receive interest requests',
      'Send limited interest requests',
      'Profile privacy controls',
      'Basic profile verification',
    ],
    ctaText: 'Create Your Free Profile',
    ctaAction: 'register',
    sortOrder: 1,
    active: true,
  },
  {
    key: 'PREMIUM',
    planId: 'plan_premium',
    name: 'Premium',
    displayName: 'Connect With Compatible Doctors',
    amount: 4999,
    price: '₹4,999',
    duration: '3 Months',
    description: 'Everything you need to connect directly with compatible verified doctors and accelerate your search.',
    badge: '⭐ MOST POPULAR',
    bestFor: 'Doctors who are seriously looking for a life partner',
    isPopular: true,
    features: [
      'View contact details of selected verified profiles',
      'Unlimited interest requests',
      'Direct messaging & Easy chat access',
      'Respond directly to interested profiles',
      'Advanced match recommendations & search filters',
      'Specialization & City/Location filters',
      'Priority customer support',
      'Premium profile badge',
    ],
    ctaText: 'Start Connecting',
    ctaAction: 'order',
    sortOrder: 2,
    active: true,
  },
  {
    key: 'PREMIUM_VIP',
    planId: 'plan_premium_vip',
    name: 'Premium VIP',
    displayName: 'Personalised Matchmaking',
    amount: 9999,
    price: '₹9,999',
    duration: '6 Months',
    description: 'Everything in Premium, plus personalised assistance and priority matchmaking support.',
    badge: '👑 PREMIUM VIP',
    bestFor: 'Doctors who value time & privacy',
    isVip: true,
    features: [
      'Personal Relationship Manager',
      'One-to-one matchmaking assistance',
      'Unlimited contact access to eligible profiles',
      'Priority introduction requests',
      'Enhanced privacy & hide profile options',
      'VIP profile badge & top placement',
      'Priority WhatsApp/phone support',
    ],
    ctaText: 'Get Personalised Matchmaking',
    ctaAction: 'order',
    sortOrder: 3,
    active: true,
  },
  {
    key: 'VVIP',
    planId: 'plan_vvip',
    name: 'VVIP Concierge',
    displayName: 'Exclusive Concierge Matchmaking',
    amount: 0,
    price: 'Custom',
    duration: 'Tailored Concierge',
    description: 'A discreet, high-touch matchmaking service combining dedicated human assistance, compatibility analysis and coordinated introductions.',
    badge: '💎 VVIP',
    bestFor: 'Doctors and families seeking a fully personalised matchmaking experience',
    isVvip: true,
    features: [
      'Dedicated Senior Matchmaking Consultant',
      'Personally curated match shortlist',
      'AI + Human compatibility assessment',
      'Face-to-face / Video introduction coordination',
      'Enhanced background & profile verification assistance',
      'Family-to-family meeting & intercity coordination',
      'Discreet confidentiality handling',
    ],
    ctaText: 'Request VVIP Matchmaking',
    ctaAction: 'contact',
    sortOrder: 4,
    active: true,
  },
];

export async function getMembershipPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

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
      payment_capture: true,
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
      provider: 'razorpay',
      providerPaymentId: (order as any).id,
      amount: plan.amount,
      currency: 'INR',
      status: 'PENDING',
    });

    res.json({ success: true, data: { order, plan, subscriptionId: pendingSubscription._id } });
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { paymentId, orderId, signature, planKey } = req.body;
    if (!paymentId || !orderId || !signature || !planKey) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

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
  } catch (error) {
    next(error);
  }
}
