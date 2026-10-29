import { Response, NextFunction } from 'express';
import mongoose from '../db/prismaBridge';
import { AuthRequest } from '../middleware/authMiddleware';
import { Admin } from '../models/Admin';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { MembershipPlan } from '../models/MembershipPlan';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { ContactRequest } from '../models/ContactRequest';
import { Block } from '../models/Block';
import { Report } from '../models/Report';
import { AuditLog } from '../models/AuditLog';
import { ContactInquiry } from '../models/ContactInquiry';
import { sendMail, getEmailConfig } from '../services/emailService';

/**
 * Helper to record Super Admin actions in AuditLog
 */
async function recordSuperAdminAudit(params: {
  adminUser?: string;
  adminEmail: string;
  adminName?: string;
  action: string;
  targetModel?: string;
  targetId?: string;
  details?: string;
  status?: 'SUCCESS' | 'FAILED' | 'WARNING';
  ipAddress?: string;
}) {
  try {
    await AuditLog.create({
      adminUser: params.adminUser as any,
      adminEmail: params.adminEmail,
      adminName: params.adminName || 'Super Admin',
      action: params.action,
      targetModel: params.targetModel,
      targetId: params.targetId,
      details: params.details,
      status: params.status || 'SUCCESS',
      ipAddress: params.ipAddress || '127.0.0.1',
    });
  } catch (err: any) {
    console.error('[SuperAdminAudit] Failed to record audit log:', err?.message || err);
  }
}

// ==========================================
// 1. MONETIZATION & PROMOTION
// ==========================================

export async function getMonetizationSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [successfulPayments, totalSubscriptions, activeSubscriptions, plans, totalActiveUsers] =
      await Promise.all([
        Payment.find({ status: 'SUCCESS' }).select('amount planId createdAt'),
        Subscription.countDocuments(),
        Subscription.find({ status: 'ACTIVE' }).select('plan planId userId'),
        MembershipPlan.find().sort({ displayOrder: 1, originalPrice: 1 }),
        User.countDocuments({ status: 'Active', isDeleted: false, isActive: true }),
      ]);

    const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const planSubscribers: Record<string, number> = {};
    for (const sub of activeSubscriptions) {
      const p = (sub.planId || sub.plan || 'other').toUpperCase();
      planSubscribers[p] = (planSubscribers[p] || 0) + 1;
    }

    const uniquePaidUsers = new Set(activeSubscriptions.map((s) => String(s.user || ''))).size;
    const conversionRate = totalActiveUsers > 0 ? ((uniquePaidUsers / totalActiveUsers) * 100).toFixed(2) : '0';

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions: successfulPayments.length,
        totalSubscriptions,
        activeSubscriptionsCount: activeSubscriptions.length,
        conversionRatePercent: parseFloat(conversionRate),
        subscribersByPlan: planSubscribers,
        plansCount: plans.length,
        plans,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMembershipPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plans = await MembershipPlan.find().sort({ displayOrder: 1, originalPrice: 1 });
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMembershipPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const callerId = req.user?.userId;
    const callerEmail = req.user?.email || 'superadmin@wonderfuljodi.com';

    const plan = await MembershipPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Membership plan not found' });
    }

    const {
      name,
      description,
      originalPrice,
      discountedPrice,
      durationDays,
      durationMonths,
      features,
      isActive,
      isPopular,
      contactRequestLimit,
      isUnlimitedContact,
      ctaText,
      badge,
    } = req.body;

    const previousState = {
      name: plan.name,
      originalPrice: plan.originalPrice,
      discountedPrice: plan.discountedPrice,
      isActive: plan.isActive,
      contactRequestLimit: plan.contactRequestLimit,
      isUnlimitedContact: plan.isUnlimitedContact,
    };

    if (name !== undefined) plan.name = String(name).trim();
    if (description !== undefined) plan.description = String(description).trim();
    if (originalPrice !== undefined) plan.originalPrice = Number(originalPrice);
    if (discountedPrice !== undefined) {
      plan.discountedPrice = Number(discountedPrice);
      plan.price = Number(discountedPrice);
    }
    if (durationDays !== undefined) plan.durationDays = Number(durationDays);
    if (durationMonths !== undefined) plan.durationMonths = durationMonths !== null ? Number(durationMonths) : null;
    if (Array.isArray(features)) plan.features = features.map(String);
    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (isPopular !== undefined) plan.isPopular = Boolean(isPopular);
    if (contactRequestLimit !== undefined) plan.contactRequestLimit = Number(contactRequestLimit);
    if (isUnlimitedContact !== undefined) plan.isUnlimitedContact = Boolean(isUnlimitedContact);
    if (ctaText !== undefined) plan.ctaText = String(ctaText).trim();
    if (badge !== undefined) plan.badge = badge ? String(badge).trim() : undefined;

    await plan.save();

    await recordSuperAdminAudit({
      adminUser: callerId,
      adminEmail: callerEmail,
      action: 'MEMBERSHIP_PLAN_UPDATED',
      targetModel: 'MembershipPlan',
      targetId: id,
      details: JSON.stringify({ before: previousState, after: req.body }),
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Membership plan updated successfully.',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 2. ENGAGEMENT & SAFETY
// ==========================================

export async function getSafetySummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [
      totalRequests,
      pendingRequests,
      acceptedRequests,
      declinedRequests,
      totalBlocks,
      pendingReports,
      resolvedReports,
    ] = await Promise.all([
      ContactRequest.countDocuments(),
      ContactRequest.countDocuments({ status: 'PENDING' }),
      ContactRequest.countDocuments({ status: 'ACCEPTED' }),
      ContactRequest.countDocuments({ status: 'DECLINED' }),
      Block.countDocuments(),
      Report.countDocuments({ status: 'PENDING' }),
      Report.countDocuments({ status: 'RESOLVED' }),
    ]);

    res.json({
      success: true,
      data: {
        contactRequests: {
          total: totalRequests,
          pending: pendingRequests,
          accepted: acceptedRequests,
          declined: declinedRequests,
        },
        safetyMetrics: {
          activeBlocks: totalBlocks,
          pendingReports,
          resolvedReports,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getContactRequestsOversight(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const [requests, total] = await Promise.all([
      ContactRequest.find(query)
        .populate('requester', 'fullName email mobile status verified')
        .populate('recipient', 'fullName email mobile status verified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ContactRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getBlocksList(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const [blocks, total] = await Promise.all([
      Block.find()
        .populate('blocker', 'fullName email mobile')
        .populate('blockedUser', 'fullName email mobile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Block.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        blocks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getModerationQueue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).toUpperCase() : 'PENDING';

    const query: any = {};
    if (status !== 'ALL') {
      query.status = status;
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporter', 'fullName email mobile')
        .populate('reportedUser', 'fullName email mobile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 3. SECURITY & SYSTEM OPERATIONS
// ==========================================

export async function getSecuritySummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const admins = await Admin.find().populate('user', 'fullName email role status isActive');
    let superAdminCount = 0;
    for (const a of admins) {
      let perms: string[] = [];
      if (Array.isArray(a.permissions)) perms = a.permissions;
      else if (typeof a.permissions === 'string') {
        try {
          perms = JSON.parse(a.permissions);
        } catch {
          perms = [];
        }
      }
      if (perms.includes('all')) superAdminCount++;
    }

    const recentAuditLogsCount = await AuditLog.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    const emailDiag = getEmailConfig();

    res.json({
      success: true,
      data: {
        adminsCount: admins.length,
        superAdminCount,
        recentAuditLogsCount,
        emailConfigured: !!(emailDiag.host && emailDiag.user && emailDiag.pass),
        smtpHost: emailDiag.host || 'Not configured',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const admins = await Admin.find().populate('user', 'fullName email role status isActive isDeleted');
    res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const callerId = req.user?.userId;
    const callerEmail = req.user?.email || 'superadmin@wonderfuljodi.com';

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Permissions must be an array of strings' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const prevPermissions = admin.permissions;
    admin.permissions = permissions.map(String);
    await admin.save();

    await recordSuperAdminAudit({
      adminUser: callerId,
      adminEmail: callerEmail,
      action: 'ADMIN_PERMISSIONS_UPDATED',
      targetModel: 'Admin',
      targetId: id,
      details: JSON.stringify({ before: prevPermissions, after: admin.permissions }),
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Admin permissions updated successfully.',
      data: admin,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    const action = req.query.action ? String(req.query.action) : undefined;

    const query: any = {};
    if (action) {
      query.action = action;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('adminUser', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 4. SUPPORT NOTES & EMAIL INQUIRIES
// ==========================================

export async function getSupportInquiries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;

    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const [inquiries, total] = await Promise.all([
      ContactInquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ContactInquiry.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        inquiries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSupportInquiryDetails(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
}

export async function addInquiryNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const callerId = req.user?.userId;
    const callerEmail = req.user?.email || 'superadmin@wonderfuljodi.com';

    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }

    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const formattedNote = `[${new Date().toISOString()} - ${callerEmail}]: ${note.trim()}`;
    inquiry.adminNotes = inquiry.adminNotes ? `${inquiry.adminNotes}\n${formattedNote}` : formattedNote;

    const history = Array.isArray(inquiry.statusHistory) ? inquiry.statusHistory : [];
    history.push({
      status: inquiry.status,
      changedBy: callerId as any,
      changedByEmail: callerEmail,
      note: note.trim(),
      timestamp: new Date(),
    });
    inquiry.statusHistory = history;

    await inquiry.save();

    await recordSuperAdminAudit({
      adminUser: callerId,
      adminEmail: callerEmail,
      action: 'INQUIRY_NOTE_ADDED',
      targetModel: 'ContactInquiry',
      targetId: id,
      details: note.trim(),
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Support note added successfully.',
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
}

export async function replyToSupportInquiry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { replyText, newStatus } = req.body;
    const callerId = req.user?.userId;
    const callerEmail = req.user?.email || 'support@wonderfuljodi.com';

    if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text is required' });
    }

    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Sanitize reply text
    const cleanReplyText = replyText.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Send email using system mail service
    let emailSent = false;
    let emailError: string | undefined;

    try {
      const emailResult = await sendMail({
        to: inquiry.email,
        subject: `Re: Your Inquiry ${inquiry.inquiryId || id} - Wonderful Jodi Support`,
        text: `Dear ${inquiry.name},\n\n${cleanReplyText}\n\nBest regards,\nWonderful Jodi Support Team`,
        html: `<p>Dear ${inquiry.name},</p><p>${cleanReplyText.replace(/\n/g, '<br/>')}</p><p>Best regards,<br/><strong>Wonderful Jodi Support Team</strong></p>`,
      });
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.messageId || 'Email delivery failed';
      }
    } catch (mailErr: any) {
      emailSent = false;
      emailError = mailErr?.message || 'SMTP delivery error';
    }

    const replies = Array.isArray(inquiry.adminReplies) ? inquiry.adminReplies : [];
    replies.push({
      replyText: cleanReplyText,
      sentBy: callerId as any,
      sentByEmail: callerEmail,
      sentAt: new Date(),
      emailSent,
      emailError,
    });
    inquiry.adminReplies = replies;

    if (newStatus && ['RESOLVED', 'CLOSED', 'IN_PROGRESS', 'WAITING_FOR_USER'].includes(newStatus)) {
      inquiry.status = newStatus;
      if (newStatus === 'RESOLVED') {
        inquiry.resolvedAt = new Date();
      }
    }

    await inquiry.save();

    await recordSuperAdminAudit({
      adminUser: callerId,
      adminEmail: callerEmail,
      action: 'INQUIRY_REPLIED',
      targetModel: 'ContactInquiry',
      targetId: id,
      details: JSON.stringify({ emailSent, emailError, status: inquiry.status }),
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: emailSent
        ? 'Reply sent and email delivered successfully.'
        : `Reply saved, but email could not be sent: ${emailError || 'Email delivery issue'}`,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
}

export async function retrySupportInquiryEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const callerId = req.user?.userId;
    const callerEmail = req.user?.email || 'support@wonderfuljodi.com';

    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const replies = Array.isArray(inquiry.adminReplies) ? inquiry.adminReplies : [];
    const lastReply = replies[replies.length - 1];

    if (!lastReply) {
      return res.status(400).json({ success: false, message: 'No reply found to retry' });
    }

    let emailSent = false;
    let emailError: string | undefined;

    try {
      const emailResult = await sendMail({
        to: inquiry.email,
        subject: `Re: Your Inquiry ${inquiry.inquiryId || id} - Wonderful Jodi Support`,
        text: `Dear ${inquiry.name},\n\n${lastReply.replyText}\n\nBest regards,\nWonderful Jodi Support Team`,
        html: `<p>Dear ${inquiry.name},</p><p>${lastReply.replyText.replace(/\n/g, '<br/>')}</p><p>Best regards,<br/><strong>Wonderful Jodi Support Team</strong></p>`,
      });
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.messageId || 'Email delivery failed';
      }
    } catch (mailErr: any) {
      emailSent = false;
      emailError = mailErr?.message || 'SMTP delivery error';
    }

    lastReply.emailSent = emailSent;
    lastReply.emailError = emailError;
    inquiry.adminReplies = replies;
    await inquiry.save();

    await recordSuperAdminAudit({
      adminUser: callerId,
      adminEmail: callerEmail,
      action: 'INQUIRY_EMAIL_RETRY',
      targetModel: 'ContactInquiry',
      targetId: id,
      details: JSON.stringify({ emailSent, emailError }),
      ipAddress: req.ip,
    });

    res.json({
      success: emailSent,
      message: emailSent
        ? 'Email delivered successfully on retry.'
        : `Email retry failed: ${emailError || 'SMTP error'}`,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
}
