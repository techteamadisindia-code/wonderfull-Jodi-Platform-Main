import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from '../db/prismaBridge';
import { ContactInquiry, getNextContactInquiryId, InquiryStatus } from '../models/ContactInquiry';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { sendMail, getEmailConfig } from '../services/emailService';
import { AuthRequest } from '../middleware/authMiddleware';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createInquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  mobileNumber: z
    .string()
    .min(6, 'Mobile number is required')
    .max(20)
    .trim()
    .refine(
      (val) => /^(\+91)?[6-9]\d{9}$/.test(val.replace(/[\s\-]/g, '')) || val.length >= 6,
      { message: 'Please enter a valid mobile number' }
    ),
  email: z.string().email('Please enter a valid email address').max(200).trim().toLowerCase(),
  message: z.string().min(5, 'Message must be at least 5 characters').max(5000).trim(),
});

const updateInquirySchema = z.object({
  status: z
    .enum(['NEW', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'])
    .optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  category: z
    .enum([
      'GENERAL',
      'TECHNICAL_SUPPORT',
      'ACCOUNT_ISSUE',
      'MEMBERSHIP',
      'PAYMENT',
      'VERIFICATION',
      'PROFILE_ISSUE',
      'OTHER',
    ])
    .optional(),
  assignedTo: z.string().optional().nullable(),
  adminNotes: z.string().max(5000).optional(),
  note: z.string().max(1000).optional(),
});

const replySchema = z.object({
  replyText: z.string().min(1, 'Reply message is required').max(5000).trim(),
});

// ─── Helper: sanitize text ────────────────────────────────────────────────────
function sanitize(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .trim();
}

// ─── PUBLIC: Submit Contact Inquiry ──────────────────────────────────────────
export async function submitContactInquiry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = createInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.errors[0]?.message || 'Invalid contact submission data',
        errors: parsed.error.errors,
      });
    }

    const { name, mobileNumber, email, message } = parsed.data;

    // Determine if the user is registered
    const isRegistered = !!(req.user?.userId && req.user.role !== 'admin');
    const userId = isRegistered ? new mongoose.Types.ObjectId(req.user!.userId) : undefined;

    // Generate a unique inquiry ID
    const inquiryId = await getNextContactInquiryId();

    const inquiry = await ContactInquiry.create({
      inquiryId,
      name: sanitize(name),
      mobileNumber: sanitize(mobileNumber),
      email: email.toLowerCase().trim(),
      message: sanitize(message),
      userId: userId || null,
      userType: isRegistered ? 'REGISTERED_MEMBER' : 'GUEST',
      status: 'NEW',
      priority: 'NORMAL',
      category: 'GENERAL',
      statusHistory: [
        {
          status: 'NEW',
          note: 'Inquiry submitted',
          timestamp: new Date().toISOString(),
        },
      ],
      adminReplies: [],
    });

    // ── Safe Email Acknowledgment (non-blocking, inquiry already saved reliably) ──
    try {
      const emailConfig = getEmailConfig();
      if (emailConfig.host && emailConfig.user && emailConfig.pass) {
        sendMail({
          to: email.toLowerCase().trim(),
          subject: `Inquiry Received [${inquiryId}] – Wonderful Jodi`,
          text: `Dear ${name},\n\nThank you for reaching out to Wonderful Jodi. We have received your inquiry and our team will review it shortly.\n\nYour Reference ID: ${inquiryId}\n\nBest regards,\nWonderful Jodi Support Team`,
        }).catch((mailErr) => {
          console.warn('Optional contact acknowledgment email failed to send:', mailErr);
        });
      }
    } catch {
      // SMTP issues must never break the contact inquiry submission
    }

    // ── Create Admin Notification (idempotent) ──────────────────────────────
    try {
      await ContactInquiry.findByIdAndUpdate(inquiry._id, { notificationCreated: true });
    } catch {
      // Non-critical – inquiry still saved
    }

    return res.status(201).json({
      success: true,
      message: `Thank you for contacting Wonderful Jodi. Your inquiry has been submitted successfully. Your reference number is ${inquiryId}.`,
      data: {
        inquiryId,
        id: inquiry._id,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN: List Inquiries ────────────────────────────────────────────────────
export async function listContactInquiries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      priority,
      category,
      userType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }
    if (priority && priority !== 'ALL') {
      filter.priority = priority.toUpperCase();
    }
    if (category && category !== 'ALL') {
      filter.category = category.toUpperCase();
    }
    if (userType && userType !== 'ALL') {
      filter.userType = userType.toUpperCase();
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    // Search by inquiry ID, name, email, mobile
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { inquiryId: regex },
        { name: regex },
        { email: regex },
        { mobileNumber: regex },
      ];
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const validSortFields = ['createdAt', 'updatedAt', 'priority', 'status', 'name', 'email'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [inquiries, total] = await Promise.all([
      ContactInquiry.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limitNum)
        .populate('assignedTo', 'fullName email')
        .lean(),
      ContactInquiry.countDocuments(filter),
    ]);

    // Summary counts
    const [
      totalCount,
      newCount,
      inProgressCount,
      waitingCount,
      resolvedCount,
      closedCount,
      highPriorityCount,
    ] = await Promise.all([
      ContactInquiry.countDocuments({}),
      ContactInquiry.countDocuments({ status: 'NEW' }),
      ContactInquiry.countDocuments({ status: 'IN_PROGRESS' }),
      ContactInquiry.countDocuments({ status: 'WAITING_FOR_USER' }),
      ContactInquiry.countDocuments({ status: 'RESOLVED' }),
      ContactInquiry.countDocuments({ status: 'CLOSED' }),
      ContactInquiry.countDocuments({ priority: { $in: ['HIGH', 'URGENT'] }, status: { $nin: ['RESOLVED', 'CLOSED'] } }),
    ]);

    return res.json({
      success: true,
      data: inquiries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      summary: {
        total: totalCount,
        new: newCount,
        inProgress: inProgressCount,
        waitingForUser: waitingCount,
        resolved: resolvedCount,
        closed: closedCount,
        highPriority: highPriorityCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN: Get Single Inquiry ─────────────────────────────────────────────────
export async function getContactInquiry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    const inquiry = await ContactInquiry.findById(id)
      .populate('assignedTo', 'fullName email')
      .populate('userId', 'fullName email mobile')
      .lean();

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Contact inquiry not found' });
    }

    return res.json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN: Update Inquiry ─────────────────────────────────────────────────────
export async function updateContactInquiry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    const parsed = updateInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.errors[0]?.message || 'Invalid update data',
      });
    }

    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Contact inquiry not found' });
    }

    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;

    const previousStatus = inquiry.status;
    const updates: Record<string, any> = {};

    // Status change
    if (parsed.data.status && parsed.data.status !== inquiry.status) {
      updates.status = parsed.data.status;
      const historyEntry = {
        status: parsed.data.status as InquiryStatus,
        changedBy: adminId,
        changedByEmail: adminEmail,
        note: parsed.data.note || `Status changed from ${inquiry.status} to ${parsed.data.status}`,
        timestamp: new Date(),
      };
      updates.$push = { statusHistory: historyEntry };

      // Track resolution time
      if (parsed.data.status === 'RESOLVED' || parsed.data.status === 'CLOSED') {
        updates.resolvedAt = new Date();
      }
    }

    if (parsed.data.priority) updates.priority = parsed.data.priority;
    if (parsed.data.category) updates.category = parsed.data.category;
    if (parsed.data.adminNotes !== undefined) updates.adminNotes = sanitize(parsed.data.adminNotes);

    // Assignment
    if (parsed.data.assignedTo !== undefined) {
      updates.assignedTo =
        parsed.data.assignedTo && mongoose.isValidObjectId(parsed.data.assignedTo)
          ? new mongoose.Types.ObjectId(parsed.data.assignedTo)
          : null;
    }

    const { $push, ...setUpdates } = updates;
    const updateOp: Record<string, any> = { $set: setUpdates };
    if ($push) updateOp.$push = $push;

    const updated = await ContactInquiry.findByIdAndUpdate(id, updateOp, { new: true })
      .populate('assignedTo', 'fullName email')
      .lean();

    // Audit log
    await AuditLog.create({
      adminId,
      adminEmail,
      action: 'UPDATE_CONTACT_INQUIRY',
      targetModel: 'ContactInquiry',
      targetId: id,
      previousStatus,
      newStatus: parsed.data.status || inquiry.status,
      details: `Updated inquiry ${inquiry.inquiryId}`,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: 'Inquiry updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN: Delete Inquiry ─────────────────────────────────────────────────────
export async function deleteContactInquiry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Contact inquiry not found' });
    }

    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;

    await ContactInquiry.findByIdAndDelete(id);

    // Audit log
    await AuditLog.create({
      adminId,
      adminEmail,
      action: 'DELETE_CONTACT_INQUIRY',
      targetModel: 'ContactInquiry',
      targetId: id,
      details: `Deleted inquiry ${inquiry.inquiryId} (${inquiry.name}, ${inquiry.email})`,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Inquiry ${inquiry.inquiryId} deleted successfully` });
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN: Reply to Inquiry via Email ─────────────────────────────────────────
export async function replyToContactInquiry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry ID' });
    }

    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.errors[0]?.message || 'Invalid reply data',
      });
    }

    const inquiry = await ContactInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Contact inquiry not found' });
    }

    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    const emailConfig = getEmailConfig();
    const isEmailConfigured = !!(emailConfig.host && emailConfig.user && emailConfig.pass);

    let emailSent = false;
    let emailError: string | undefined;

    if (isEmailConfigured) {
      try {
        const mailRes = await sendMail({
          to: inquiry.email,
          subject: `Re: Your Inquiry ${inquiry.inquiryId} – Wonderful Jodi Support`,
          text: `Dear ${inquiry.name},\n\n${parsed.data.replyText}\n\nYour inquiry reference: ${inquiry.inquiryId}\n\nBest regards,\nWonderful Jodi Support Team`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FFF9F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFF9F5;padding:40px 10px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:580px;background-color:#FFFFFF;border-radius:20px;border:1px solid #FFE4E8;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0" border="0">
<tr><td style="background:linear-gradient(135deg,#101828 0%,#1E293B 100%);padding:32px 30px;text-align:center;">
<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="background-color:#E51F3E;width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;color:#FFFFFF;font-size:18px;font-weight:bold;">❤</td>
<td style="padding-left:12px;font-size:22px;font-weight:bold;color:#FFFFFF;font-family:Georgia,serif;letter-spacing:-0.5px;">Wonderful <span style="color:#E51F3E;">Jodi</span></td>
</tr>
</table>
<p style="margin:8px 0 0 0;color:#94A3B8;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Support Team Reply</p>
</td></tr>
<tr><td style="padding:40px 36px;">
<h2 style="margin:0 0 16px 0;font-size:20px;color:#0F172A;font-weight:700;font-family:Georgia,serif;">Dear ${inquiry.name},</h2>
<p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#475569;white-space:pre-wrap;">${parsed.data.replyText}</p>
<div style="background-color:#F8FAFC;border-left:3px solid #E51F3E;padding:12px 16px;border-radius:4px;margin:28px 0 24px 0;">
<p style="margin:0;font-size:13px;color:#475569;line-height:1.5;"><strong>Your Inquiry Reference:</strong> ${inquiry.inquiryId}</p>
</div>
<p style="margin:0 0 8px 0;font-size:13.5px;line-height:1.5;color:#64748B;">If you have further questions, please reply to this email or submit a new inquiry at our Contact Us page.</p>
</td></tr>
<tr><td style="background-color:#F8FAFC;border-top:1px solid #F1F5F9;padding:24px 36px;text-align:center;">
<p style="margin:0 0 6px 0;font-size:14px;font-weight:bold;color:#334155;">Wonderful Jodi Support Team</p>
<p style="margin:0;font-size:12px;color:#94A3B8;">© ${new Date().getFullYear()} Wonderful Jodi Matrimonial Platform. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`.trim(),
        });
        if (mailRes && mailRes.delivered) {
          emailSent = true;
        } else {
          emailSent = false;
          emailError = (mailRes && mailRes.error) || 'Email delivery failed';
        }
      } catch (err: any) {
        emailError = err.message || 'Email delivery failed';
      }
    } else {
      emailError = 'SMTP not configured (EMAIL_HOST, EMAIL_USER, EMAIL_PASS missing in .env)';
    }

    // Save reply record regardless of email status
    await ContactInquiry.findByIdAndUpdate(id, {
      $push: {
        adminReplies: {
          replyText: sanitize(parsed.data.replyText),
          sentBy: adminId,
          sentByEmail: adminEmail,
          sentAt: new Date(),
          emailSent,
          emailError,
        },
      },
      $set: {
        status: inquiry.status === 'NEW' ? 'IN_PROGRESS' : inquiry.status,
      },
    });

    // Audit log
    await AuditLog.create({
      adminId,
      adminEmail,
      action: 'REPLY_CONTACT_INQUIRY',
      targetModel: 'ContactInquiry',
      targetId: id,
      details: `Replied to inquiry ${inquiry.inquiryId} – email sent: ${emailSent}`,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: emailSent
        ? 'Reply sent successfully via email'
        : 'Reply saved. Email could not be sent.',
      emailSent,
      emailError: emailSent ? undefined : emailError,
      smtpConfigured: isEmailConfigured,
    });
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN: Get Summary Counts Only ───────────────────────────────────────────
export async function getContactInquirySummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [total, newCount, inProgress, waitingForUser, resolved, closed, highPriority] =
      await Promise.all([
        ContactInquiry.countDocuments({}),
        ContactInquiry.countDocuments({ status: 'NEW' }),
        ContactInquiry.countDocuments({ status: 'IN_PROGRESS' }),
        ContactInquiry.countDocuments({ status: 'WAITING_FOR_USER' }),
        ContactInquiry.countDocuments({ status: 'RESOLVED' }),
        ContactInquiry.countDocuments({ status: 'CLOSED' }),
        ContactInquiry.countDocuments({
          priority: { $in: ['HIGH', 'URGENT'] },
          status: { $nin: ['RESOLVED', 'CLOSED'] },
        }),
      ]);

    return res.json({
      success: true,
      data: { total, new: newCount, inProgress, waitingForUser, resolved, closed, highPriority },
    });
  } catch (error) {
    next(error);
  }
}
