"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonetizationSummary = getMonetizationSummary;
exports.getMembershipPlans = getMembershipPlans;
exports.updateMembershipPlan = updateMembershipPlan;
exports.getSafetySummary = getSafetySummary;
exports.getContactRequestsOversight = getContactRequestsOversight;
exports.getBlocksList = getBlocksList;
exports.getModerationQueue = getModerationQueue;
exports.getSecuritySummary = getSecuritySummary;
exports.getAdminUsers = getAdminUsers;
exports.updateAdminPermissions = updateAdminPermissions;
exports.getAuditLogs = getAuditLogs;
exports.getSupportInquiries = getSupportInquiries;
exports.getSupportInquiryDetails = getSupportInquiryDetails;
exports.addInquiryNote = addInquiryNote;
exports.replyToSupportInquiry = replyToSupportInquiry;
exports.retrySupportInquiryEmail = retrySupportInquiryEmail;
const Admin_1 = require("../models/Admin");
const User_1 = require("../models/User");
const MembershipPlan_1 = require("../models/MembershipPlan");
const Subscription_1 = require("../models/Subscription");
const Payment_1 = require("../models/Payment");
const ContactRequest_1 = require("../models/ContactRequest");
const Block_1 = require("../models/Block");
const Report_1 = require("../models/Report");
const AuditLog_1 = require("../models/AuditLog");
const ContactInquiry_1 = require("../models/ContactInquiry");
const emailService_1 = require("../services/emailService");
/**
 * Helper to record Super Admin actions in AuditLog
 */
async function recordSuperAdminAudit(params) {
    try {
        await AuditLog_1.AuditLog.create({
            adminUser: params.adminUser,
            adminEmail: params.adminEmail,
            adminName: params.adminName || 'Super Admin',
            action: params.action,
            targetModel: params.targetModel,
            targetId: params.targetId,
            details: params.details,
            status: params.status || 'SUCCESS',
            ipAddress: params.ipAddress || '127.0.0.1',
        });
    }
    catch (err) {
        console.error('[SuperAdminAudit] Failed to record audit log:', err?.message || err);
    }
}
// ==========================================
// 1. MONETIZATION & PROMOTION
// ==========================================
async function getMonetizationSummary(req, res, next) {
    try {
        const [successfulPayments, totalSubscriptions, activeSubscriptions, plans, totalActiveUsers] = await Promise.all([
            Payment_1.Payment.find({ status: 'SUCCESS' }).select('amount planId createdAt'),
            Subscription_1.Subscription.countDocuments(),
            Subscription_1.Subscription.find({ status: 'ACTIVE' }).select('plan planId userId'),
            MembershipPlan_1.MembershipPlan.find().sort({ displayOrder: 1, originalPrice: 1 }),
            User_1.User.countDocuments({ status: 'Active', isDeleted: false, isActive: true }),
        ]);
        const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const planSubscribers = {};
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
    }
    catch (error) {
        next(error);
    }
}
async function getMembershipPlans(req, res, next) {
    try {
        const plans = await MembershipPlan_1.MembershipPlan.find().sort({ displayOrder: 1, originalPrice: 1 });
        res.json({
            success: true,
            data: plans,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateMembershipPlan(req, res, next) {
    try {
        const { id } = req.params;
        const callerId = req.user?.userId;
        const callerEmail = req.user?.email || 'superadmin@wonderfuljodi.com';
        const plan = await MembershipPlan_1.MembershipPlan.findById(id);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Membership plan not found' });
        }
        const { name, description, originalPrice, discountedPrice, durationDays, durationMonths, features, isActive, isPopular, contactRequestLimit, isUnlimitedContact, ctaText, badge, } = req.body;
        const previousState = {
            name: plan.name,
            originalPrice: plan.originalPrice,
            discountedPrice: plan.discountedPrice,
            isActive: plan.isActive,
            contactRequestLimit: plan.contactRequestLimit,
            isUnlimitedContact: plan.isUnlimitedContact,
        };
        if (name !== undefined)
            plan.name = String(name).trim();
        if (description !== undefined)
            plan.description = String(description).trim();
        if (originalPrice !== undefined)
            plan.originalPrice = Number(originalPrice);
        if (discountedPrice !== undefined) {
            plan.discountedPrice = Number(discountedPrice);
            plan.price = Number(discountedPrice);
        }
        if (durationDays !== undefined)
            plan.durationDays = Number(durationDays);
        if (durationMonths !== undefined)
            plan.durationMonths = durationMonths !== null ? Number(durationMonths) : null;
        if (Array.isArray(features))
            plan.features = features.map(String);
        if (isActive !== undefined)
            plan.isActive = Boolean(isActive);
        if (isPopular !== undefined)
            plan.isPopular = Boolean(isPopular);
        if (contactRequestLimit !== undefined)
            plan.contactRequestLimit = Number(contactRequestLimit);
        if (isUnlimitedContact !== undefined)
            plan.isUnlimitedContact = Boolean(isUnlimitedContact);
        if (ctaText !== undefined)
            plan.ctaText = String(ctaText).trim();
        if (badge !== undefined)
            plan.badge = badge ? String(badge).trim() : undefined;
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
    }
    catch (error) {
        next(error);
    }
}
// ==========================================
// 2. ENGAGEMENT & SAFETY
// ==========================================
async function getSafetySummary(req, res, next) {
    try {
        const [totalRequests, pendingRequests, acceptedRequests, declinedRequests, totalBlocks, pendingReports, resolvedReports,] = await Promise.all([
            ContactRequest_1.ContactRequest.countDocuments(),
            ContactRequest_1.ContactRequest.countDocuments({ status: 'PENDING' }),
            ContactRequest_1.ContactRequest.countDocuments({ status: 'ACCEPTED' }),
            ContactRequest_1.ContactRequest.countDocuments({ status: 'DECLINED' }),
            Block_1.Block.countDocuments(),
            Report_1.Report.countDocuments({ status: 'PENDING' }),
            Report_1.Report.countDocuments({ status: 'RESOLVED' }),
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
    }
    catch (error) {
        next(error);
    }
}
async function getContactRequestsOversight(req, res, next) {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;
        const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
        const query = {};
        if (status) {
            query.status = status;
        }
        const [requests, total] = await Promise.all([
            ContactRequest_1.ContactRequest.find(query)
                .populate('requester', 'fullName email mobile status verified')
                .populate('recipient', 'fullName email mobile status verified')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ContactRequest_1.ContactRequest.countDocuments(query),
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
    }
    catch (error) {
        next(error);
    }
}
async function getBlocksList(req, res, next) {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;
        const [blocks, total] = await Promise.all([
            Block_1.Block.find()
                .populate('blocker', 'fullName email mobile')
                .populate('blockedUser', 'fullName email mobile')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Block_1.Block.countDocuments(),
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
    }
    catch (error) {
        next(error);
    }
}
async function getModerationQueue(req, res, next) {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;
        const status = req.query.status ? String(req.query.status).toUpperCase() : 'PENDING';
        const query = {};
        if (status !== 'ALL') {
            query.status = status;
        }
        const [reports, total] = await Promise.all([
            Report_1.Report.find(query)
                .populate('reporter', 'fullName email mobile')
                .populate('reportedUser', 'fullName email mobile')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Report_1.Report.countDocuments(query),
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
    }
    catch (error) {
        next(error);
    }
}
// ==========================================
// 3. SECURITY & SYSTEM OPERATIONS
// ==========================================
async function getSecuritySummary(req, res, next) {
    try {
        const admins = await Admin_1.Admin.find().populate('user', 'fullName email role status isActive');
        let superAdminCount = 0;
        for (const a of admins) {
            let perms = [];
            if (Array.isArray(a.permissions))
                perms = a.permissions;
            else if (typeof a.permissions === 'string') {
                try {
                    perms = JSON.parse(a.permissions);
                }
                catch {
                    perms = [];
                }
            }
            if (perms.includes('all'))
                superAdminCount++;
        }
        const recentAuditLogsCount = await AuditLog_1.AuditLog.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });
        const emailDiag = (0, emailService_1.getEmailConfig)();
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
    }
    catch (error) {
        next(error);
    }
}
async function getAdminUsers(req, res, next) {
    try {
        const admins = await Admin_1.Admin.find().populate('user', 'fullName email role status isActive isDeleted');
        res.json({
            success: true,
            data: admins,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateAdminPermissions(req, res, next) {
    try {
        const { id } = req.params;
        const { permissions } = req.body;
        const callerId = req.user?.userId;
        const callerEmail = req.user?.email || 'superadmin@wonderfuljodi.com';
        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, message: 'Permissions must be an array of strings' });
        }
        const admin = await Admin_1.Admin.findById(id);
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
    }
    catch (error) {
        next(error);
    }
}
async function getAuditLogs(req, res, next) {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;
        const action = req.query.action ? String(req.query.action) : undefined;
        const query = {};
        if (action) {
            query.action = action;
        }
        const [logs, total] = await Promise.all([
            AuditLog_1.AuditLog.find(query)
                .populate('adminUser', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog_1.AuditLog.countDocuments(query),
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
    }
    catch (error) {
        next(error);
    }
}
// ==========================================
// 4. SUPPORT NOTES & EMAIL INQUIRIES
// ==========================================
async function getSupportInquiries(req, res, next) {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;
        const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
        const query = {};
        if (status && status !== 'ALL') {
            query.status = status;
        }
        const [inquiries, total] = await Promise.all([
            ContactInquiry_1.ContactInquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            ContactInquiry_1.ContactInquiry.countDocuments(query),
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
    }
    catch (error) {
        next(error);
    }
}
async function getSupportInquiryDetails(req, res, next) {
    try {
        const { id } = req.params;
        const inquiry = await ContactInquiry_1.ContactInquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        res.json({
            success: true,
            data: inquiry,
        });
    }
    catch (error) {
        next(error);
    }
}
async function addInquiryNote(req, res, next) {
    try {
        const { id } = req.params;
        const { note } = req.body;
        const callerId = req.user?.userId;
        const callerEmail = req.user?.email || 'superadmin@wonderfuljodi.com';
        if (!note || typeof note !== 'string' || !note.trim()) {
            return res.status(400).json({ success: false, message: 'Note text is required' });
        }
        const inquiry = await ContactInquiry_1.ContactInquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        const formattedNote = `[${new Date().toISOString()} - ${callerEmail}]: ${note.trim()}`;
        inquiry.adminNotes = inquiry.adminNotes ? `${inquiry.adminNotes}\n${formattedNote}` : formattedNote;
        const history = Array.isArray(inquiry.statusHistory) ? inquiry.statusHistory : [];
        history.push({
            status: inquiry.status,
            changedBy: callerId,
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
    }
    catch (error) {
        next(error);
    }
}
async function replyToSupportInquiry(req, res, next) {
    try {
        const { id } = req.params;
        const { replyText, newStatus } = req.body;
        const callerId = req.user?.userId;
        const callerEmail = req.user?.email || 'support@wonderfuljodi.com';
        if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
            return res.status(400).json({ success: false, message: 'Reply text is required' });
        }
        const inquiry = await ContactInquiry_1.ContactInquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        // Sanitize reply text
        const cleanReplyText = replyText.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // Send email using system mail service
        let emailSent = false;
        let emailError;
        try {
            const emailResult = await (0, emailService_1.sendMail)({
                to: inquiry.email,
                subject: `Re: Your Inquiry ${inquiry.inquiryId || id} - Wonderful Jodi Support`,
                text: `Dear ${inquiry.name},\n\n${cleanReplyText}\n\nBest regards,\nWonderful Jodi Support Team`,
                html: `<p>Dear ${inquiry.name},</p><p>${cleanReplyText.replace(/\n/g, '<br/>')}</p><p>Best regards,<br/><strong>Wonderful Jodi Support Team</strong></p>`,
            });
            emailSent = emailResult.success;
            if (!emailResult.success) {
                emailError = emailResult.messageId || 'Email delivery failed';
            }
        }
        catch (mailErr) {
            emailSent = false;
            emailError = mailErr?.message || 'SMTP delivery error';
        }
        const replies = Array.isArray(inquiry.adminReplies) ? inquiry.adminReplies : [];
        replies.push({
            replyText: cleanReplyText,
            sentBy: callerId,
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
    }
    catch (error) {
        next(error);
    }
}
async function retrySupportInquiryEmail(req, res, next) {
    try {
        const { id } = req.params;
        const callerId = req.user?.userId;
        const callerEmail = req.user?.email || 'support@wonderfuljodi.com';
        const inquiry = await ContactInquiry_1.ContactInquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        const replies = Array.isArray(inquiry.adminReplies) ? inquiry.adminReplies : [];
        const lastReply = replies[replies.length - 1];
        if (!lastReply) {
            return res.status(400).json({ success: false, message: 'No reply found to retry' });
        }
        let emailSent = false;
        let emailError;
        try {
            const emailResult = await (0, emailService_1.sendMail)({
                to: inquiry.email,
                subject: `Re: Your Inquiry ${inquiry.inquiryId || id} - Wonderful Jodi Support`,
                text: `Dear ${inquiry.name},\n\n${lastReply.replyText}\n\nBest regards,\nWonderful Jodi Support Team`,
                html: `<p>Dear ${inquiry.name},</p><p>${lastReply.replyText.replace(/\n/g, '<br/>')}</p><p>Best regards,<br/><strong>Wonderful Jodi Support Team</strong></p>`,
            });
            emailSent = emailResult.success;
            if (!emailResult.success) {
                emailError = emailResult.messageId || 'Email delivery failed';
            }
        }
        catch (mailErr) {
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
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=superAdminController.js.map