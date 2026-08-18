import { Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';

const plans = [
  { key: 'FREE', name: 'Free', amount: 0, features: ['Create profile', 'Search profiles', 'Limited interests'] },
  { key: 'PREMIUM', name: 'Premium', amount: 4999, features: ['Advanced search', 'More interests', 'Message access'] },
  { key: 'PREMIUM_PLUS', name: 'Premium Plus', amount: 9999, features: ['Priority visibility', 'Premium recommendations', 'Premium support'] },
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
