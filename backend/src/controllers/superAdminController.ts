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
import { normalizeAdminPermissions, hasSuperAdminPermission } from '../utils/permissionUtils';

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

    const sanitizedRequests = requests.map((item: any) => {
      const raw = typeof item?.toObject === 'function' ? item.toObject() : { ...item };
      const missingRecipient = !raw.recipient;
      const missingRequester = !raw.requester;
      const hasOrphanedReference = missingRecipient || missingRequester;

      return {
        ...raw,
        recipient: raw.recipient || null,
        requester: raw.requester || null,
        dataIntegrity: {
          hasOrphanedReference,
          missingRecipient,
          missingRequester,
          warning: missingRecipient
            ? `Orphaned record: Recipient user '${raw.recipientId || raw.recipient}' does not exist in users database.`
            : missingRequester
            ? `Orphaned record: Requester user '${raw.requesterId || raw.requester}' does not exist in users database.`
            : null,
        },
      };
    });

    res.json({
      success: true,
      data: {
        requests: sanitizedRequests,
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

/**
 * Dedicated Authoritative Super Admin Authorization Verification Endpoint
 * (GET /api/admin/super/auth/verify)
 * Returns authoritative session details and confirms active super admin status.
 */
export async function verifySuperAdminAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    if (!callerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required: Administrator identity missing.',
      });
    }

    const user = await User.findById(callerId).select('-password');
    if (!user || user.role !== 'admin' || user.isDeleted || user.isActive === false) {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_DEACTIVATED',
        message: 'Administrator account is deactivated or not found.',
      });
    }

    const adminRecord = await Admin.findOne({ user: callerId });
    const permissions = normalizeAdminPermissions(adminRecord?.permissions);
    const isSuperAdmin = permissions.includes('all');

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Access denied: Super Administrator privileges required.',
      });
    }

    return res.json({
      success: true,
      authorized: true,
      data: {
        id: user._id,
        _id: user._id,
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions,
        isSuperAdmin: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSecuritySummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const admins = await Admin.find().populate('user', 'fullName email role status isActive');
    let superAdminCount = 0;
    for (const a of admins) {
      if (hasSuperAdminPermission(a.permissions)) superAdminCount++;
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
    const formattedAdmins = admins.map((a: any) => {
      const plain = typeof a.toObject === 'function' ? a.toObject() : { ...a };
      const adminId = plain.id || plain._id;
      return {
        ...plain,
        id: adminId,
        _id: adminId,
        permissions: normalizeAdminPermissions(plain.permissions),
      };
    });

    res.json({
      success: true,
      data: formattedAdmins,
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
      return res.status(400).json({
        success: false,
        code: 'INVALID_PERMISSIONS_FORMAT',
        message: 'Permissions must be an array of strings.',
      });
    }

    // Validate that all items in permissions are strings
    for (const p of permissions) {
      if (typeof p !== 'string') {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PERMISSION_ITEM',
          message: 'All permission entries must be valid strings.',
        });
      }
    }

    const cleanPermissions = normalizeAdminPermissions(permissions);

    // 1. Identify target Admin row using persisted Admin primary key (admin.id)
    const admin = await Admin.findById(id);
    if (!admin) {
      // Check if the caller supplied a User ID instead of an Admin ID
      const user = await User.findById(id);
      if (user) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ADMIN_IDENTIFIER',
          message: 'The supplied ID belongs to a User account, not an Admin record. Admin primary key required.',
        });
      }

      return res.status(404).json({
        success: false,
        code: 'ADMIN_NOT_FOUND',
        message: 'Administrator record not found.',
      });
    }

    // Verify linked user account exists
    const targetUserId = admin.user?._id || admin.user || admin.userId;
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        code: 'LINKED_USER_NOT_FOUND',
        message: 'Linked administrator user account does not exist.',
      });
    }

    const prevPermissions = normalizeAdminPermissions(admin.permissions);
    const wasSuperAdmin = prevPermissions.includes('all');
    const willBeSuperAdmin = cleanPermissions.includes('all');

    // 2. Safeguard against accidental loss of the last designated Super Admin
    if (wasSuperAdmin && !willBeSuperAdmin) {
      const allAdmins = await Admin.find().populate('user', 'role status isActive isDeleted');
      let otherSuperAdminCount = 0;
      for (const other of allAdmins) {
        const otherAdminId = other.id || other._id;
        const currentAdminId = admin.id || admin._id;
        if (String(otherAdminId) === String(currentAdminId)) continue;

        const otherUser = other.user;
        const isOtherActive =
          otherUser &&
          otherUser.role === 'admin' &&
          otherUser.isActive !== false &&
          otherUser.isDeleted !== true &&
          otherUser.status !== 'Deleted' &&
          otherUser.status !== 'Suspended';

        if (isOtherActive && hasSuperAdminPermission(other.permissions)) {
          otherSuperAdminCount++;
        }
      }

      if (otherSuperAdminCount < 1) {
        return res.status(400).json({
          success: false,
          code: 'LAST_SUPER_ADMIN_PROTECTION',
          message: 'Cannot revoke Super Admin privileges from the last active Super Administrator.',
        });
      }
    }

    // 3. Persist and verify
    admin.permissions = cleanPermissions;
    await admin.save();

    // Verify persisted result from DB before returning success
    const verifiedAdmin = await Admin.findById(id).populate('user', 'fullName email role status isActive isDeleted');
    if (!verifiedAdmin) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify updated administrator permissions in database.',
      });
    }

    const persistedPerms = normalizeAdminPermissions(verifiedAdmin.permissions);
    if (JSON.stringify([...persistedPerms].sort()) !== JSON.stringify([...cleanPermissions].sort())) {
      return res.status(500).json({
        success: false,
        code: 'PERSISTENCE_VERIFICATION_FAILED',
        message: 'Database persistence verification mismatch for administrator permissions.',
      });
    }

    // 4. Audit Log
    await recordSuperAdminAudit({
      adminUser: callerId,
      adminEmail: callerEmail,
      action: 'ADMIN_PERMISSIONS_UPDATED',
      targetModel: 'Admin',
      targetId: String(admin.id || admin._id),
      details: JSON.stringify({
        targetUserEmail: targetUser.email,
        targetUserId: String(targetUser._id || targetUser.id),
        before: prevPermissions,
        after: cleanPermissions,
      }),
      ipAddress: req.ip,
    });

    const adminId = verifiedAdmin.id || verifiedAdmin._id;
    return res.json({
      success: true,
      message: 'Admin permissions updated and verified successfully.',
      data: {
        id: adminId,
        _id: adminId,
        user: verifiedAdmin.user,
        userId: targetUserId,
        permissions: persistedPerms,
        updatedAt: verifiedAdmin.updatedAt,
      },
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
