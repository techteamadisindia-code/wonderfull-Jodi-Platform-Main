import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import mongoose from '../db/prismaBridge';
import { prisma } from '../db/client';
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

    const history = Array.isArray(inquiry.statusHistory) ? [...inquiry.statusHistory] : [];
    history.push({
      status: inquiry.status,
      changedBy: callerId as any,
      changedByEmail: callerEmail,
      note: note.trim(),
      eventType: 'NOTE_ADDED',
      timestamp: new Date(),
    });
    inquiry.statusHistory = history;

    const formattedNote = `[${new Date().toISOString()} - ${callerEmail}]: ${note.trim()}`;
    inquiry.adminNotes = inquiry.adminNotes ? `${inquiry.adminNotes}\n${formattedNote}` : formattedNote;

    // Persist note into statusHistory via database save
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

export const inFlightReplies = new Set<string>();

/**
 * Computes canonical payload hash binding inquiry ID, recipient email, email subject, and normalized body.
 */
export function computeReplyPayloadHash(inquiryId: string, recipientEmail: string, emailSubject: string, normalizedBody: string): string {
  const canonical = [
    `inquiry:${String(inquiryId).trim()}`,
    `recipient:${String(recipientEmail).toLowerCase().trim()}`,
    `subject:${String(emailSubject).trim()}`,
    `body:${String(normalizedBody).trim()}`,
  ].join('\n');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Distinguishes definitive permanent SMTP rejections (5xx) from ambiguous network/connection failures.
 */
export function classifySmtpOutcome(err: any): { isDefinitiveFailure: boolean; isUncertain: boolean; message: string } {
  if (!err) {
    return { isDefinitiveFailure: false, isUncertain: false, message: '' };
  }
  const responseCode = Number(err.responseCode || err.status || 0);
  const errMsg = String(err.message || '').toLowerCase();

  // Permanent SMTP 5xx rejections are definitive rejections
  if (responseCode >= 500 && responseCode < 600) {
    return {
      isDefinitiveFailure: true,
      isUncertain: false,
      message: err.message || `SMTP Permanent Rejection (${responseCode})`,
    };
  }

  // Known mailbox/recipient definitive rejections
  if (
    errMsg.includes('recipient rejected') ||
    errMsg.includes('mailbox unavailable') ||
    errMsg.includes('user not found') ||
    errMsg.includes('does not exist') ||
    errMsg.includes('550 ') ||
    errMsg.includes('551 ') ||
    errMsg.includes('552 ') ||
    errMsg.includes('553 ') ||
    errMsg.includes('554 ')
  ) {
    return {
      isDefinitiveFailure: true,
      isUncertain: false,
      message: err.message,
    };
  }

  // All network errors, timeouts, connection drops, resets, or unclassified exceptions are UNCERTAIN
  return {
    isDefinitiveFailure: false,
    isUncertain: true,
    message: err.message || 'Ambiguous SMTP network or connection error',
  };
}

export async function replyToSupportInquiry(req: AuthRequest, res: Response, next: NextFunction) {
  let activeIdempKey: string | null = null;
  try {
    const { id } = req.params;
    const { replyText, newStatus, idempotencyKey: bodyIdempKey } = req.body;
    const callerId = req.user?.userId;
    const callerEmail = req.user?.email || 'support@wonderfuljodi.com';

    if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text is required' });
    }

    const cleanReplyText = replyText.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // 1. Determine canonical payload hash bound to complete request: inquiry ID, recipient email, subject, and normalized body
    const emailSubject = `Re: Your Inquiry ${inquiry.inquiryId || id} - Wonderful Jodi Support`;
    const payloadHash = computeReplyPayloadHash(id, inquiry.email || '', emailSubject, cleanReplyText);

    const rawKey = (bodyIdempKey || (req.headers?.['idempotency-key'] as string) || req.body?.replyId || '').toString().trim();
    const idempotencyKey = rawKey && rawKey.length >= 8 && rawKey.length <= 128
      ? rawKey
      : 'auto_' + crypto.createHash('sha256').update(`${id}:${callerId || 'admin'}:${cleanReplyText}`).digest('hex').substring(0, 27);

    // Fast in-process concurrency guard
    if (inFlightReplies.has(idempotencyKey)) {
      return res.status(409).json({
        success: false,
        code: 'REPLY_IN_PROGRESS',
        message: 'This reply is currently being transmitted to the SMTP server.',
      });
    }
    inFlightReplies.add(idempotencyKey);
    activeIdempKey = idempotencyKey;

    const rawReplies = inquiry.adminReplies || inquiry.replies;
    const replies = Array.isArray(rawReplies) ? [...rawReplies] : [];

    // Idempotency check with Complete Request Payload Binding:
    const existingReply = replies.find(
      (r: any) => r.idempotencyKey === idempotencyKey || r.replyId === idempotencyKey
    );
    if (existingReply) {
      const existingHash = existingReply.payloadHash ||
        computeReplyPayloadHash(id, inquiry.email || '', emailSubject, existingReply.replyText || '');
      if (existingHash !== payloadHash) {
        return res.status(409).json({
          success: false,
          code: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
          message: 'The provided idempotency key has already been used with a different reply payload.',
          data: inquiry,
        });
      }
      if (existingReply.deliveryStatus === 'SENT' || existingReply.emailSent) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'This reply was already processed and accepted by SMTP.',
          data: inquiry,
        });
      }
      if (existingReply.deliveryStatus === 'SENDING') {
        return res.status(409).json({
          success: false,
          code: 'REPLY_IN_PROGRESS',
          message: 'This reply is currently being transmitted to the SMTP server.',
          data: inquiry,
        });
      }
      if (existingReply.deliveryStatus === 'DELIVERY_UNKNOWN') {
        return res.status(409).json({
          success: false,
          code: 'DELIVERY_STATUS_UNCERTAIN',
          message: 'Email delivery status is uncertain. Please reconcile delivery before retrying.',
          data: inquiry,
        });
      }
    }

    // 2. Distributed database-backed unique claim with Durable State Machine & Ownership Fencing:
    // Mandatory database AuditLog capability check: missing capabilities must produce a safe server error, not a successful check.
    if (!(prisma as any)?.auditLog?.create || !(prisma as any)?.auditLog?.findUnique) {
      return res.status(500).json({
        success: false,
        code: 'DATABASE_ERROR',
        message: 'Audit log database capability is required for durable reply claiming.',
      });
    }

    const claimAuditId = 'c_' + crypto.createHash('sha256').update(idempotencyKey).digest('hex').substring(0, 22);
    if (claimAuditId.length !== 24) {
      throw new Error(`AuditLog claim ID length mismatch: expected 24, got ${claimAuditId.length}`);
    }

    const initialOwnerToken = crypto.randomBytes(12).toString('hex');
    let currentOwnerToken = initialOwnerToken;
    let fencingVersion = 1;
    let claimCreated = false;

    // Helper to verify that current worker still owns the durable claim lease in AuditLog
    // Mandatory check: if findUnique is unavailable or throws, fails closed with error.
    const checkClaimOwnership = async (expectedToken: string): Promise<boolean> => {
      if (!(prisma as any)?.auditLog?.findUnique) {
        throw new Error('Database auditLog capability is unavailable.');
      }
      const claim = await (prisma as any).auditLog.findUnique({
        where: { id: claimAuditId },
      });
      if (!claim) return false;
      let p: any = null;
      if (claim.details) {
        try {
          p = typeof claim.details === 'string' ? JSON.parse(claim.details) : claim.details;
        } catch (e) {
          p = null;
        }
      }
      const tokenInDb = claim.reason || p?.o;
      return tokenInDb === expectedToken;
    };

    try {
      await (prisma as any).auditLog.create({
        data: {
          id: claimAuditId,
          adminEmail: callerEmail,
          action: 'INQUIRY_REPLY_CLAIM',
          targetModel: 'ContactInquiry',
          targetId: id,
          reason: initialOwnerToken,
          details: JSON.stringify({
            k: idempotencyKey,
            h: payloadHash,
            exp: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            st: 'CLAIMED',
            o: initialOwnerToken,
            v: 1,
          }),
        },
      });
      claimCreated = true;
    } catch (claimErr: any) {
      if (
        claimErr?.code === 'P2002' ||
        claimErr?.message?.includes('Unique constraint') ||
        claimErr?.message?.includes('Duplicate entry')
      ) {
        // Inspect existing claim in AuditLog to check payload binding & lease expiration
        let existingClaim: any = null;
        try {
          existingClaim = await (prisma as any).auditLog.findUnique({
            where: { id: claimAuditId },
          });
        } catch (inspectErr) {
          // Fall through
        }

        let parsed: any = null;
        if (existingClaim?.details) {
          try {
            parsed = typeof existingClaim.details === 'string'
              ? JSON.parse(existingClaim.details)
              : existingClaim.details;
          } catch (e) {
            parsed = null;
          }
        }

        const existingHash = parsed?.h || parsed?.payloadHash;
        const existingExpiry = parsed?.exp || parsed?.leaseExpiresAt;
        const claimState = parsed?.st || '';

        // Payload-hash mismatch protection across complete canonical request
        if (existingHash && existingHash !== payloadHash) {
          return res.status(409).json({
            success: false,
            code: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
            message: 'The provided idempotency key has already been used with a different reply payload.',
          });
        }

        // Check if a reply was committed in ContactInquiry
        let dbReplies: any[] = [];
        try {
          if ((prisma as any)?.contactInquiry?.findUnique) {
            const dbInq = await (prisma as any).contactInquiry.findUnique({ where: { id } });
            dbReplies = Array.isArray(dbInq?.replies) ? dbInq.replies : [];
          }
        } catch (dbErr) {
          dbReplies = [];
        }

        const existingReplyInDb = dbReplies.find(
          (r: any) => r.idempotencyKey === idempotencyKey || r.replyId === idempotencyKey
        );

        if (existingReplyInDb) {
          // Reply exists in database: do NOT allow reclamation or duplicate sending
          if (existingReplyInDb.deliveryStatus === 'SENT' || existingReplyInDb.emailSent) {
            return res.status(200).json({
              success: true,
              duplicate: true,
              message: 'This reply was already processed and accepted by SMTP.',
              data: inquiry,
            });
          }
          if (existingReplyInDb.deliveryStatus === 'DELIVERY_UNKNOWN') {
            return res.status(409).json({
              success: false,
              code: 'DELIVERY_STATUS_UNCERTAIN',
              message: 'Email delivery status is uncertain. Please reconcile delivery before retrying.',
              data: inquiry,
            });
          }
          return res.status(409).json({
            success: false,
            code: 'REPLY_IN_PROGRESS',
            message: 'This reply is currently being transmitted to the SMTP server.',
            data: inquiry,
          });
        }

        // Protection: Prevent lease expiry from allowing another worker to reclaim a claim already transitioning to SENDING
        if (claimState === 'SENDING') {
          return res.status(409).json({
            success: false,
            code: 'REPLY_IN_PROGRESS',
            message: 'This reply is currently transitioning to SENDING or being transmitted.',
            data: inquiry,
          });
        }

        // If NO reply was ever persisted in the database and claim is not in SENDING, check if claim lease has expired
        const leaseExpiresAt = existingExpiry ? new Date(existingExpiry).getTime() : 0;
        const isExpired = leaseExpiresAt > 0 && Date.now() > leaseExpiresAt;

        if (isExpired) {
          // Safe abandoned claim recovery: process crashed after claim creation but before SENDING transition.
          // Safely reclaim the lease for this retry via atomic conditional update and unique ownership token / fencing version.
          const newOwnerToken = crypto.randomBytes(12).toString('hex');
          const newVersion = (parsed?.v || 1) + 1;
          const newExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          const newDetails = JSON.stringify({
            k: idempotencyKey,
            h: payloadHash,
            exp: newExpiry,
            st: 'RECLAIMED',
            o: newOwnerToken,
            v: newVersion,
          });

          let reclaimSucceeded = false;
          try {
            if (typeof (prisma as any)?.$executeRaw === 'function') {
              const prevReason = existingClaim?.reason || '';
              const affected = await (prisma as any).$executeRaw`
                UPDATE auditlogs
                SET admin_email = ${callerEmail},
                    reason = ${newOwnerToken},
                    details = ${newDetails},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${claimAuditId}
                  AND (reason = ${prevReason} OR reason IS NULL)
              `;
              reclaimSucceeded = affected === 1;
            } else if ((prisma as any)?.auditLog?.update) {
              await (prisma as any).auditLog.update({
                where: { id: claimAuditId },
                data: {
                  adminEmail: callerEmail,
                  reason: newOwnerToken,
                  details: newDetails,
                },
              });
              reclaimSucceeded = true;
            }
          } catch (reclaimErr) {
            reclaimSucceeded = false;
          }

          if (reclaimSucceeded) {
            claimCreated = true;
            currentOwnerToken = newOwnerToken;
            fencingVersion = newVersion;
          } else {
            return res.status(409).json({
              success: false,
              code: 'REPLY_IN_PROGRESS',
              message: 'This reply has already been claimed by another active process or server.',
            });
          }
        } else {
          return res.status(409).json({
            success: false,
            code: 'REPLY_IN_PROGRESS',
            message: 'This reply has already been claimed by another active process or server.',
          });
        }
      } else {
        // Non-duplicate database failure: return appropriate server error rather than treating as duplicate key conflict
        console.error('[SupportReply] Database error during claim creation:', claimErr);
        return res.status(500).json({
          success: false,
          code: 'DATABASE_ERROR',
          message: 'Failed to record support reply claim due to a database error: ' + (claimErr?.message || 'Database error'),
        });
      }
    }

    // Fencing check 1: confirm worker still holds active lease ownership before persisting SENDING
    const ownsBeforePersist = await checkClaimOwnership(currentOwnerToken);
    if (!ownsBeforePersist) {
      console.warn(`[SupportReply] Worker lost claim ownership for ${claimAuditId} before persistence. Aborting.`);
      return res.status(409).json({
        success: false,
        code: 'CLAIM_OWNERSHIP_LOST',
        message: 'Claim lease expired and ownership was acquired by another process.',
        data: inquiry,
      });
    }

    // Transition claim state to SENDING in AuditLog to protect against concurrent lease-expiry reclamation during persistence
    try {
      if ((prisma as any)?.auditLog?.update) {
        await (prisma as any).auditLog.update({
          where: { id: claimAuditId },
          data: {
            details: JSON.stringify({
              k: idempotencyKey,
              h: payloadHash,
              exp: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              st: 'SENDING',
              o: currentOwnerToken,
              v: fencingVersion,
            }),
          },
        });
      }
    } catch (transErr) {
      // Non-fatal if auditLog update is unavailable
    }

    // 3. Persist queued reply in inquiry BEFORE attempting SMTP delivery
    const replyId = 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const newReply: any = {
      replyId,
      idempotencyKey,
      payloadHash,
      replyText: cleanReplyText,
      sentBy: callerId as any,
      sentByEmail: callerEmail,
      sentAt: new Date(),
      deliveryStatus: 'SENDING',
      emailSent: false,
    };

    replies.push(newReply);
    inquiry.adminReplies = replies;
    inquiry.replies = replies;

    if (newStatus && ['RESOLVED', 'CLOSED', 'IN_PROGRESS', 'WAITING_FOR_USER'].includes(newStatus)) {
      inquiry.status = newStatus;
      if (newStatus === 'RESOLVED') {
        inquiry.resolvedAt = new Date();
      }
    }

    // RULE 1: Persist the queued reply record BEFORE attempting SMTP delivery.
    // Never delete a claim merely because a verification query failed; release only after confirming the SENDING reply was NOT committed.
    try {
      await inquiry.save();
    } catch (queueErr) {
      let isCommitted = false;
      let verifyQuerySucceeded = false;
      try {
        if ((prisma as any)?.contactInquiry?.findUnique) {
          const dbInq = await (prisma as any).contactInquiry.findUnique({ where: { id } });
          const dbReplies = Array.isArray(dbInq?.replies) ? dbInq.replies : [];
          isCommitted = dbReplies.some((r: any) => r.replyId === replyId);
          verifyQuerySucceeded = true;
        }
      } catch (checkErr) {
        verifyQuerySucceeded = false;
      }

      // Safe release: only delete if query verified that the record was definitively not committed.
      if (verifyQuerySucceeded && !isCommitted && claimCreated && (prisma as any)?.auditLog?.delete) {
        try {
          await (prisma as any).auditLog.delete({ where: { id: claimAuditId } });
        } catch (releaseErr) {
          // Non-fatal
        }
      }
      throw queueErr;
    }

    // Fencing check 2: confirm worker still holds active lease ownership immediately before SMTP transmission
    const ownsBeforeSmtp = await checkClaimOwnership(currentOwnerToken);
    if (!ownsBeforeSmtp) {
      console.warn(`[SupportReply] Worker lost claim ownership for ${claimAuditId} before SMTP transmission. Aborting email send.`);
      return res.status(409).json({
        success: false,
        code: 'CLAIM_OWNERSHIP_LOST',
        message: 'Claim lease expired and ownership was acquired by another process before SMTP transmission.',
        data: inquiry,
      });
    }

    // RULE 2: Transmit email via SMTP only after durable persistence and active ownership are confirmed
    let emailSent = false;
    let emailAccepted = false;
    let smtpMessageId: string | undefined;
    let deliveryError: string | undefined;

    newReply.deliveryStatus = 'SENDING';

    try {
      const emailResult = await sendMail({
        to: inquiry.email,
        subject: emailSubject,
        text: `Dear ${inquiry.name},\n\n${cleanReplyText}\n\nBest regards,\nWonderful Jodi Support Team`,
        html: `<p>Dear ${inquiry.name},</p><p>${cleanReplyText.replace(/\n/g, '<br/>')}</p><p>Best regards,<br/><strong>Wonderful Jodi Support Team</strong></p>`,
      });

      if (emailResult.success) {
        emailSent = true;
        emailAccepted = true;
        smtpMessageId = emailResult.messageId;
        newReply.deliveryStatus = 'SENT';
        newReply.emailSent = true;
        newReply.smtpMessageId = emailResult.messageId;
      } else {
        const classified = classifySmtpOutcome(emailResult);
        deliveryError = classified.message;
        newReply.deliveryStatus = classified.isUncertain ? 'DELIVERY_UNKNOWN' : 'FAILED';
        newReply.emailSent = false;
        newReply.deliveryError = deliveryError;
        newReply.emailError = deliveryError;
      }
    } catch (mailErr: any) {
      const classified = classifySmtpOutcome(mailErr);
      deliveryError = classified.message;
      newReply.deliveryStatus = classified.isUncertain ? 'DELIVERY_UNKNOWN' : 'FAILED';
      newReply.emailSent = false;
      newReply.deliveryError = deliveryError;
      newReply.emailError = deliveryError;
    }

    // RULE 3: Update durable delivery state in database
    const persistedReplies = Array.isArray(inquiry.adminReplies)
      ? inquiry.adminReplies
      : Array.isArray(inquiry.replies)
      ? inquiry.replies
      : replies;
    const target = persistedReplies.find((r: any) => r.replyId === replyId) || newReply;
    target.deliveryStatus = newReply.deliveryStatus;
    target.emailSent = newReply.emailSent;
    target.smtpMessageId = newReply.smtpMessageId;
    target.deliveryError = newReply.deliveryError;
    target.emailError = newReply.emailError;

    inquiry.adminReplies = persistedReplies;
    inquiry.replies = persistedReplies;

    try {
      await inquiry.save();
    } catch (persistErr: any) {
      if (emailAccepted) {
        newReply.deliveryStatus = 'DELIVERY_UNKNOWN';
        return res.status(500).json({
          success: false,
          code: 'EMAIL_ACCEPTED_PERSISTENCE_FAILED',
          message: 'Email was accepted by SMTP server, but updating inquiry delivery record failed.',
          email: {
            status: 'SENT',
            smtpMessageId,
          },
          persistence: {
            status: 'FAILED',
            replyId: newReply.replyId,
            error: persistErr?.message || 'Database persistence error',
          },
          data: inquiry,
        });
      }
      throw persistErr;
    }

    await recordSuperAdminAudit({
      adminUser: callerId,
      adminEmail: callerEmail,
      action: 'INQUIRY_REPLIED',
      targetModel: 'ContactInquiry',
      targetId: id,
      details: JSON.stringify({
        replyId: newReply.replyId,
        deliveryStatus: newReply.deliveryStatus,
        smtpMessageId,
        deliveryError,
        status: inquiry.status,
      }),
      ipAddress: req.ip,
    });

    res.json({
      success: emailSent,
      message: emailSent
        ? 'Reply saved and email accepted by SMTP for delivery.'
        : `Reply saved, but email delivery ${newReply.deliveryStatus === 'DELIVERY_UNKNOWN' ? 'outcome is uncertain' : 'failed'}: ${deliveryError || 'SMTP error'}`,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  } finally {
    if (activeIdempKey) {
      inFlightReplies.delete(activeIdempKey);
    }
  }
}

export async function retrySupportInquiryEmail(req: AuthRequest, res: Response, next: NextFunction) {
  let activeRetryKey: string | null = null;
  let retryClaimId: string | null = null;
  try {
    const { id } = req.params;
    const { replyId } = req.body || {};
    const callerId = req.user?.userId;
    const callerEmail = req.user?.email || 'support@wonderfuljodi.com';

    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const rawReplies = inquiry.adminReplies || inquiry.replies;
    const replies = Array.isArray(rawReplies) ? rawReplies : [];
    const targetReply = replyId
      ? replies.find((r: any) => r.replyId === replyId)
      : replies[replies.length - 1];

    if (!targetReply) {
      return res.status(400).json({ success: false, message: 'No reply found to retry' });
    }

    // DELIVERY RULES:
    // Never automatically resend a reply in SENT, SENDING, or DELIVERY_UNKNOWN state.
    if (targetReply.deliveryStatus === 'SENT' || targetReply.emailSent) {
      return res.status(400).json({
        success: false,
        message: 'This email has already been accepted by SMTP for delivery. Resend disallowed to prevent duplicate emails.',
      });
    }

    if (targetReply.deliveryStatus === 'SENDING') {
      const sentTime = new Date(targetReply.sentAt || 0).getTime();
      const elapsedMinutes = (Date.now() - sentTime) / (60 * 1000);
      const allowForceReconcile = req.body?.reconcileAction === 'FORCE_RETRY' && elapsedMinutes >= 5;

      if (!allowForceReconcile) {
        return res.status(409).json({
          success: false,
          code: 'SENDING_IN_PROGRESS',
          message: elapsedMinutes >= 5
            ? 'This reply has been in SENDING state for over 5 minutes. Verify your SMTP server logs to confirm the message was not delivered, then retry with { reconcileAction: "FORCE_RETRY" }.'
            : 'This email is currently being transmitted to the SMTP server.',
          details: {
            replyId: targetReply.replyId,
            sentAt: targetReply.sentAt,
            elapsedMinutes: Math.round(elapsedMinutes),
            recoveryPath: 'Pass { reconcileAction: "FORCE_RETRY" } after verifying mail logs.',
          },
        });
      }
    }

    if (targetReply.deliveryStatus === 'DELIVERY_UNKNOWN') {
      const allowForceReconcile = req.body?.reconcileAction === 'FORCE_RETRY';
      if (!allowForceReconcile) {
        return res.status(409).json({
          success: false,
          code: 'DELIVERY_STATUS_UNCERTAIN',
          message: 'Delivery state is uncertain. Please reconcile with mail logs before re-sending to avoid duplicate messages. If confirmed not delivered, retry with { reconcileAction: "FORCE_RETRY" }.',
          details: {
            replyId: targetReply.replyId,
            smtpMessageId: targetReply.smtpMessageId,
            recoveryPath: 'Pass { reconcileAction: "FORCE_RETRY" } after verifying mail logs.',
          },
        });
      }
    }

    // 1. Durable operation identifier for the retry
    const retryOpKey = `retry:${targetReply.replyId}`;
    if (inFlightReplies.has(retryOpKey)) {
      return res.status(409).json({
        success: false,
        code: 'RETRY_IN_PROGRESS',
        message: 'A retry for this reply is already currently in progress.',
      });
    }
    inFlightReplies.add(retryOpKey);
    activeRetryKey = retryOpKey;

    // 2. Database-backed retry claim to protect across concurrent workers
    retryClaimId = 'c_' + crypto.createHash('sha256').update(retryOpKey).digest('hex').substring(0, 22);
    try {
      if ((prisma as any)?.auditLog?.create) {
        await (prisma as any).auditLog.create({
          data: {
            id: retryClaimId,
            adminEmail: callerEmail,
            action: 'INQUIRY_RETRY_CLAIM',
            targetModel: 'ContactInquiry',
            targetId: id,
            details: JSON.stringify({
              r: targetReply.replyId,
              exp: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              st: 'CLAIMED',
            }),
          },
        });
      }
    } catch (claimErr: any) {
      if (
        claimErr?.code === 'P2002' ||
        claimErr?.message?.includes('Unique constraint') ||
        claimErr?.message?.includes('Duplicate entry')
      ) {
        return res.status(409).json({
          success: false,
          code: 'RETRY_IN_PROGRESS',
          message: 'Another worker is already currently executing a retry for this reply.',
        });
      }
      return res.status(500).json({
        success: false,
        code: 'DATABASE_ERROR',
        message: 'Failed to record retry claim: ' + (claimErr?.message || 'Database error'),
      });
    }

    // 3. Persist SENDING state before sending
    targetReply.deliveryStatus = 'SENDING';
    targetReply.sentAt = new Date();
    inquiry.adminReplies = replies;
    inquiry.replies = replies;
    await inquiry.save();

    let emailSent = false;
    let emailAccepted = false;
    let smtpMessageId: string | undefined;
    let deliveryError: string | undefined;

    try {
      const emailResult = await sendMail({
        to: inquiry.email,
        subject: `Re: Your Inquiry ${inquiry.inquiryId || id} - Wonderful Jodi Support`,
        text: `Dear ${inquiry.name},\n\n${targetReply.replyText}\n\nBest regards,\nWonderful Jodi Support Team`,
        html: `<p>Dear ${inquiry.name},</p><p>${targetReply.replyText.replace(/\n/g, '<br/>')}</p><p>Best regards,<br/><strong>Wonderful Jodi Support Team</strong></p>`,
      });

      if (emailResult.success) {
        emailSent = true;
        emailAccepted = true;
        smtpMessageId = emailResult.messageId;
        targetReply.deliveryStatus = 'SENT';
        targetReply.emailSent = true;
        targetReply.smtpMessageId = emailResult.messageId;
        targetReply.deliveryError = undefined;
        targetReply.emailError = undefined;
      } else {
        const classified = classifySmtpOutcome(emailResult);
        deliveryError = classified.message;
        targetReply.deliveryStatus = classified.isUncertain ? 'DELIVERY_UNKNOWN' : 'FAILED';
        targetReply.emailSent = false;
        targetReply.deliveryError = deliveryError;
        targetReply.emailError = deliveryError;
      }
    } catch (mailErr: any) {
      const classified = classifySmtpOutcome(mailErr);
      deliveryError = classified.message;
      targetReply.deliveryStatus = classified.isUncertain ? 'DELIVERY_UNKNOWN' : 'FAILED';
      targetReply.emailSent = false;
      targetReply.deliveryError = deliveryError;
      targetReply.emailError = deliveryError;
    }

    inquiry.adminReplies = replies;
    try {
      await inquiry.save();
    } catch (persistErr: any) {
      if (emailAccepted) {
        targetReply.deliveryStatus = 'DELIVERY_UNKNOWN';
        return res.status(500).json({
          success: false,
          code: 'EMAIL_ACCEPTED_PERSISTENCE_FAILED',
          message: 'Email was accepted by SMTP server on retry, but updating inquiry delivery record failed.',
          email: {
            status: 'SENT',
            smtpMessageId,
          },
          persistence: {
            status: 'FAILED',
            replyId: targetReply.replyId,
            error: persistErr?.message || 'Database persistence error',
          },
          data: inquiry,
        });
      }
      throw persistErr;
    }

    // Clean up retry claim upon completion
    if (retryClaimId && (prisma as any)?.auditLog?.delete) {
      try {
        await (prisma as any).auditLog.delete({ where: { id: retryClaimId } });
      } catch (e) {
        // Non-fatal
      }
    }

    await recordSuperAdminAudit({
      adminUser: callerId,
      adminEmail: callerEmail,
      action: 'INQUIRY_EMAIL_RETRY',
      targetModel: 'ContactInquiry',
      targetId: id,
      details: JSON.stringify({
        replyId: targetReply.replyId,
        deliveryStatus: targetReply.deliveryStatus,
        smtpMessageId,
        deliveryError,
      }),
      ipAddress: req.ip,
    });

    res.json({
      success: emailSent,
      message: emailSent
        ? 'Email accepted by SMTP on retry.'
        : `Email retry ${targetReply.deliveryStatus === 'DELIVERY_UNKNOWN' ? 'outcome is uncertain' : 'failed'}: ${deliveryError || 'SMTP error'}`,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  } finally {
    if (activeRetryKey) {
      inFlightReplies.delete(activeRetryKey);
    }
  }
}
