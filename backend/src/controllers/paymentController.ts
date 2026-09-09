import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { AuthRequest } from '../middleware/authMiddleware';
import { Payment, IPayment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

/**
 * Helper to get Razorpay instance
 */
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAPIDPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAPIDPAY_KEY_SECRET || '';
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Record an action to the AuditLog collection
 */
async function logAdminAction(
  adminEmail: string,
  action: string,
  targetModel: string,
  targetId: string,
  details: string,
  ipAddress: string
) {
  try {
    await AuditLog.create({
      adminEmail,
      action,
      targetModel,
      targetId,
      details,
      ipAddress: ipAddress || '127.0.0.1',
      status: 'SUCCESS',
    });
  } catch (err) {
    console.error('Failed to log admin action to AuditLog:', err);
  }
}

/**
 * 1. Admin: Get all payments with search, multi-filter, sorting and pagination
 * GET /api/admin/payments
 */
export async function getAdminPayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      plan,
      provider,
      dateRange,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const query: any = {};

    // Status Filter
    if (status && status !== 'ALL') {
      query.status = status;
    }

    // Plan Filter
    if (plan && plan !== 'ALL') {
      query.$or = [
        { planId: new RegExp(String(plan), 'i') },
        { planName: new RegExp(String(plan), 'i') },
      ];
    }

    // Provider Filter
    if (provider && provider !== 'ALL') {
      query.provider = provider;
    }

    // Date Range Filter
    const now = new Date();
    if (dateRange) {
      if (dateRange === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: startOfDay };
      } else if (dateRange === '7d') {
        const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: pastDate };
      } else if (dateRange === '30d') {
        const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: pastDate };
      } else if (dateRange === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createdAt = { $gte: startOfMonth };
      }
    } else if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(String(startDate));
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Search query
    let userFilterIds: any[] | null = null;
    if (search && String(search).trim()) {
      const q = String(search).trim();
      const userMatches = await User.find({
        $or: [
          { fullName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { mobile: { $regex: q, $options: 'i' } },
        ],
      }).select('_id');

      userFilterIds = userMatches.map((u) => u._id);

      const searchConditions: any[] = [
        { providerPaymentId: { $regex: q, $options: 'i' } },
        { paymentId: { $regex: q, $options: 'i' } },
        { orderId: { $regex: q, $options: 'i' } },
        { receipt: { $regex: q, $options: 'i' } },
        { refundId: { $regex: q, $options: 'i' } },
      ];

      if (userFilterIds.length > 0) {
        searchConditions.push({ user: { $in: userFilterIds } });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Sort order
    const sortField = String(sortBy);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

    // Fetch paginated payments and total count
    const [payments, totalCount, statsData] = await Promise.all([
      Payment.find(query)
        .populate('user', 'fullName email mobile verified verificationStatus')
        .populate('subscription', 'plan status startDate expiryDate')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Payment.countDocuments(query),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            grossRevenue: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED']] },
                  '$amount',
                  0,
                ],
              },
            },
            totalRefunded: { $sum: '$refundAmount' },
            totalCount: { $sum: 1 },
            successCount: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED']] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const gross = statsData[0]?.grossRevenue || 0;
    const refunded = statsData[0]?.totalRefunded || 0;
    const netRevenue = Math.max(0, gross - refunded);
    const overallTotalCount = statsData[0]?.totalCount || 0;
    const overallSuccessCount = statsData[0]?.successCount || 0;
    const successRate = overallTotalCount > 0 ? Math.round((overallSuccessCount / overallTotalCount) * 100) : 100;

    res.json({
      success: true,
      data: {
        payments,
        totalRevenue: netRevenue,
        grossRevenue: gross,
        totalRefunded: refunded,
        count: totalCount,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNumber) || 1,
        },
        stats: {
          totalRevenue: netRevenue,
          grossRevenue: gross,
          totalRefunded: refunded,
          totalTransactions: overallTotalCount,
          successfulTransactions: overallSuccessCount,
          successRate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Admin: Get comprehensive revenue & transactions statistics
 * GET /api/admin/payments/stats
 */
export async function getAdminPaymentStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const daysParam = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const days = [7, 14, 30, 90].includes(daysParam) ? daysParam : 30;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPeriod = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    startOfPeriod.setHours(0, 0, 0, 0);

    const [
      overallStats,
      todayStats,
      monthStats,
      statusCounts,
      timelineAgg,
    ] = await Promise.all([
      // Overall Revenue & Counts
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [{ $in: ['$status', ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED']] }, '$amount', 0],
              },
            },
            totalRefunded: { $sum: '$refundAmount' },
            totalTransactions: { $sum: 1 },
            successfulTransactions: {
              $sum: {
                $cond: [{ $in: ['$status', ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED']] }, 1, 0],
              },
            },
            failedTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
            },
            pendingTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] },
            },
            refundedTransactions: {
              $sum: {
                $cond: [{ $in: ['$status', ['REFUNDED', 'PARTIALLY_REFUNDED']] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Today's Collections
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday },
            status: { $in: ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            refunds: { $sum: '$refundAmount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Current Month's Collections
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            status: { $in: ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            refunds: { $sum: '$refundAmount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Status breakdown
      Payment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),

      // Daily timeline grouping
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfPeriod },
            status: { $in: ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$amount' },
            refunds: { $sum: '$refundAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const overall = overallStats[0] || {
      totalRevenue: 0,
      totalRefunded: 0,
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      refundedTransactions: 0,
    };

    const grossRevenue = overall.totalRevenue || 0;
    const totalRefunded = overall.totalRefunded || 0;
    const netRevenue = Math.max(0, grossRevenue - totalRefunded);
    const totalTransactions = overall.totalTransactions || 0;
    const successfulTransactions = overall.successfulTransactions || 0;
    const successRate =
      totalTransactions > 0
        ? Math.round((successfulTransactions / totalTransactions) * 100)
        : 100;

    const todayGross = todayStats[0]?.total || 0;
    const todayRefunds = todayStats[0]?.refunds || 0;
    const todayRevenue = Math.max(0, todayGross - todayRefunds);
    const todayCount = todayStats[0]?.count || 0;

    const monthlyGross = monthStats[0]?.total || 0;
    const monthlyRefunds = monthStats[0]?.refunds || 0;
    const monthlyRevenue = Math.max(0, monthlyGross - monthlyRefunds);
    const monthlyCount = monthStats[0]?.count || 0;

    // Build timeline date map for consecutive days
    const timelineMap = new Map<string, { revenue: number; refunds: number; count: number }>();
    timelineAgg.forEach((item) => {
      timelineMap.set(item._id, {
        revenue: item.revenue || 0,
        refunds: item.refunds || 0,
        count: item.count || 0,
      });
    });

    const revenueTrend: Array<{
      date: string;
      displayDate: string;
      revenue: number;
      count: number;
      netRevenue: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const entry = timelineMap.get(dateKey) || { revenue: 0, refunds: 0, count: 0 };
      revenueTrend.push({
        date: dateKey,
        displayDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: entry.revenue,
        count: entry.count,
        netRevenue: Math.max(0, entry.revenue - entry.refunds),
      });
    }

    res.json({
      success: true,
      data: {
        totalRevenue: netRevenue,
        grossRevenue,
        totalRefunded,
        totalTransactions,
        successfulTransactions,
        failedTransactions: overall.failedTransactions || 0,
        pendingTransactions: overall.pendingTransactions || 0,
        refundedTransactions: overall.refundedTransactions || 0,
        successRate,
        todayRevenue,
        todayCount,
        monthlyRevenue,
        monthlyCount,
        statusBreakdown: statusCounts,
        revenueTrend,
        period: days,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Admin: Get single payment details
 * GET /api/admin/payments/:id
 */
export async function getAdminPaymentById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id)
      .populate('user', 'fullName email mobile verified verificationStatus role')
      .populate('subscription', 'plan status startDate expiryDate')
      .lean();

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Admin: Process full or partial refund
 * POST /api/admin/payments/:id/refund
 */
export async function refundPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { amount, reason = 'Customer requested refund' } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (!['SUCCESS', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot refund payment with status '${payment.status}'. Only SUCCESS payments are eligible.`,
      });
    }

    const currentRefunded = payment.refundAmount || 0;
    const remainingRefundable = payment.amount - currentRefunded;

    if (remainingRefundable <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This transaction has already been fully refunded.',
      });
    }

    const refundAmount = amount ? Math.min(Number(amount), remainingRefundable) : remainingRefundable;

    if (refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount must be greater than zero.',
      });
    }

    if (refundAmount > remainingRefundable) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (₹${refundAmount}) exceeds remaining refundable balance of ₹${remainingRefundable}.`,
      });
    }

    let refundId = `rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const razorpay = getRazorpayInstance();

    // If live/test Razorpay instance is active and not a test simulated record, attempt gateway refund
    if (razorpay && !payment.isSimulated && payment.providerPaymentId.startsWith('pay_')) {
      try {
        const rzpRefund = await razorpay.payments.refund(payment.providerPaymentId, {
          amount: Math.round(refundAmount * 100),
          notes: {
            reason,
            adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
            paymentMongoId: String(payment._id),
          },
        });
        if (rzpRefund && (rzpRefund as any).id) {
          refundId = (rzpRefund as any).id;
        }
      } catch (gatewayErr: any) {
        console.warn('Razorpay Gateway refund warning:', gatewayErr?.message || gatewayErr);
        // Fallback to local recorded refund if mock key or sandbox
      }
    }

    const newRefundAmount = currentRefunded + refundAmount;
    const newStatus = newRefundAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    payment.refundId = refundId;
    payment.refundAmount = newRefundAmount;
    payment.refundStatus = 'PROCESSED';
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    payment.status = newStatus;
    if (!payment.metadata) payment.metadata = {};
    payment.metadata.lastRefundDetails = {
      refundId,
      amount: refundAmount,
      reason,
      refundedBy: req.user?.email || 'admin@wonderfuljodi.com',
      date: new Date().toISOString(),
    };

    await payment.save();

    // If fully refunded, mark subscription cancelled if appropriate
    if (newStatus === 'REFUNDED' && payment.subscription) {
      await Subscription.findByIdAndUpdate(payment.subscription, { status: 'CANCELLED' });
    }

    // Log to AuditLog
    await logAdminAction(
      req.user?.email || 'admin@wonderfuljodi.com',
      'PAYMENT_REFUND',
      'Payment',
      String(payment._id),
      `Processed ₹${refundAmount} refund for Payment ID ${payment.providerPaymentId || payment._id}. Reason: ${reason}`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: `Refund of ₹${refundAmount.toLocaleString('en-IN')} processed successfully.`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. Public / Gateway: Razorpay Webhook Handler
 * POST /api/payments/webhook
 */
export async function handleRazorpayWebhook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAPIDPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'] as string;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    if (!event || !payload) {
      return res.status(400).json({ success: false, message: 'Missing event payload' });
    }

    // Handle payment.captured / order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id || payload.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : undefined;
      const method = paymentEntity?.method || 'UPI';

      if (orderId || paymentId) {
        const existingPayment = await Payment.findOne({
          $or: [
            { providerPaymentId: paymentId },
            { paymentId: paymentId },
            { orderId: orderId },
            { providerPaymentId: orderId },
          ],
        });

        if (existingPayment) {
          existingPayment.status = 'SUCCESS';
          existingPayment.paymentId = paymentId || existingPayment.paymentId;
          existingPayment.providerPaymentId = paymentId || existingPayment.providerPaymentId;
          existingPayment.paymentMethod = method;
          if (amount) existingPayment.amount = amount;
          await existingPayment.save();

          if (existingPayment.subscription) {
            await Subscription.findByIdAndUpdate(existingPayment.subscription, {
              status: 'ACTIVE',
              expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            });
          }
        }
      }
    }

    // Handle payment.failed
    if (event === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const failureReason = paymentEntity?.error_description || 'Payment authorization failed at bank';

      if (orderId) {
        await Payment.findOneAndUpdate(
          { $or: [{ orderId }, { providerPaymentId: orderId }] },
          { status: 'FAILED', failureReason }
        );
      }
    }

    // Handle refund.processed
    if (event === 'refund.processed') {
      const refundEntity = payload.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const refundAmount = refundEntity?.amount ? refundEntity.amount / 100 : 0;
      const refundId = refundEntity?.id;

      if (paymentId) {
        const payment = await Payment.findOne({
          $or: [{ paymentId }, { providerPaymentId: paymentId }],
        });
        if (payment) {
          payment.refundId = refundId;
          payment.refundAmount = refundAmount;
          payment.refundStatus = 'PROCESSED';
          payment.status = refundAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
          await payment.save();
        }
      }
    }

    res.json({ success: true, message: 'Webhook event processed successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. User: Get logged-in user's payment history
 * GET /api/payments/history
 */
export async function getUserPaymentHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const payments = await Payment.find({ user: userId })
      .populate('subscription', 'plan status startDate expiryDate')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Dev / Test: Safe Simulated Payment Flow (Non-Production / Testing)
 * POST /api/admin/payments/simulate
 */
export async function simulateDevPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      scenario = 'SUCCESS', // SUCCESS | FAILED | PENDING | REFUND
      planKey = 'PREMIUM',
      amount = 4999,
      paymentMethod = 'UPI',
      userEmail,
    } = req.body;

    let targetUser = userEmail ? await User.findOne({ email: userEmail }) : null;
    if (!targetUser) {
      targetUser = await User.findOne({ role: 'user' });
    }

    if (!targetUser) {
      return res.status(400).json({ success: false, message: 'No matrimonial user found to simulate payment.' });
    }

    const orderId = `order_test_${Date.now()}`;
    const paymentId = `pay_test_${Math.random().toString(36).substring(2, 9)}`;

    let subscription = null;
    if (scenario === 'SUCCESS') {
      subscription = await Subscription.create({
        user: targetUser._id,
        plan: planKey,
        status: 'ACTIVE',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
    }

    const payment = await Payment.create({
      user: targetUser._id,
      subscription: subscription ? subscription._id : undefined,
      orderId,
      paymentId: scenario === 'PENDING' ? undefined : paymentId,
      provider: 'razorpay',
      providerPaymentId: scenario === 'PENDING' ? orderId : paymentId,
      amount: Number(amount) || 4999,
      currency: 'INR',
      planId: `plan_${String(planKey).toLowerCase()}`,
      planName: String(planKey),
      paymentMethod,
      status: scenario === 'FAILED' ? 'FAILED' : scenario === 'PENDING' ? 'PENDING' : 'SUCCESS',
      failureReason: scenario === 'FAILED' ? 'Customer cancelled payment window on test bank simulator' : undefined,
      isSimulated: true,
      receipt: `rcpt_sim_${Date.now()}`,
      metadata: {
        scenario,
        simulatedAt: new Date().toISOString(),
        testSession: true,
      },
    });

    res.json({
      success: true,
      message: `Simulated test ${scenario} transaction created successfully.`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}
