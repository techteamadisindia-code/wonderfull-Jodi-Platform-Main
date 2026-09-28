"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeActionUrl = sanitizeActionUrl;
exports.getRecipientCount = getRecipientCount;
exports.resolveRecipientIds = resolveRecipientIds;
exports.createAndDispatchBroadcast = createAndDispatchBroadcast;
const mongoose_1 = __importDefault(require("mongoose"));
const Broadcast_1 = require("../models/Broadcast");
const Notification_1 = require("../models/Notification");
const User_1 = require("../models/User");
const Subscription_1 = require("../models/Subscription");
const AuditLog_1 = require("../models/AuditLog");
const securityUtils_1 = require("../utils/securityUtils");
/**
 * Validates and sanitizes internal or relative action URLs
 */
function sanitizeActionUrl(url) {
    if (!url)
        return undefined;
    const trimmed = url.trim();
    if (!trimmed)
        return undefined;
    // Reject unsafe schemes
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('javascript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('file:')) {
        return undefined;
    }
    // Allow relative URLs starting with / or safe https URLs
    if (trimmed.startsWith('/') || trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
        return trimmed.slice(0, 500);
    }
    // Default to relative path
    return `/${trimmed}`.slice(0, 500);
}
/**
 * Calculates target recipient count using efficient MongoDB count queries
 */
async function getRecipientCount(targetType, targetUserIds) {
    switch (targetType) {
        case 'ALL_USERS':
            return await User_1.User.countDocuments({ role: 'user' });
        case 'ACTIVE_USERS':
            return await User_1.User.countDocuments({ role: 'user', isActive: true });
        case 'INACTIVE_USERS':
            return await User_1.User.countDocuments({ role: 'user', isActive: false });
        case 'VERIFIED_USERS':
            return await User_1.User.countDocuments({
                role: 'user',
                isActive: true,
                $or: [{ verified: true }, { verificationStatus: 'VERIFIED' }],
            });
        case 'PREMIUM_USERS': {
            const activeUsers = await User_1.User.find({ role: 'user', isActive: true }).select('_id');
            const activeIds = activeUsers.map((u) => u._id);
            if (!activeIds.length)
                return 0;
            const subscribedUsers = await Subscription_1.Subscription.distinct('user', {
                user: { $in: activeIds },
                status: 'ACTIVE',
                $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
            });
            return subscribedUsers.length;
        }
        case 'SELECTED_USERS': {
            if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
                return 0;
            }
            const validIds = targetUserIds.filter((id) => (0, securityUtils_1.isValidObjectId)(id));
            if (!validIds.length)
                return 0;
            return await User_1.User.countDocuments({ _id: { $in: validIds }, role: 'user' });
        }
        default:
            return await User_1.User.countDocuments({ role: 'user', isActive: true });
    }
}
/**
 * Resolves recipient user IDs based on targeting criteria
 */
async function resolveRecipientIds(targetType, targetUserIds) {
    switch (targetType) {
        case 'ALL_USERS': {
            const users = await User_1.User.find({ role: 'user' }).select('_id');
            return users.map((u) => u._id);
        }
        case 'ACTIVE_USERS': {
            const users = await User_1.User.find({ role: 'user', isActive: true }).select('_id');
            return users.map((u) => u._id);
        }
        case 'INACTIVE_USERS': {
            const users = await User_1.User.find({ role: 'user', isActive: false }).select('_id');
            return users.map((u) => u._id);
        }
        case 'VERIFIED_USERS': {
            const users = await User_1.User.find({
                role: 'user',
                isActive: true,
                $or: [{ verified: true }, { verificationStatus: 'VERIFIED' }],
            }).select('_id');
            return users.map((u) => u._id);
        }
        case 'PREMIUM_USERS': {
            const activeUsers = await User_1.User.find({ role: 'user', isActive: true }).select('_id');
            const activeIds = activeUsers.map((u) => u._id);
            if (!activeIds.length)
                return [];
            const subscribedUserIds = await Subscription_1.Subscription.distinct('user', {
                user: { $in: activeIds },
                status: 'ACTIVE',
                $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
            });
            return subscribedUserIds;
        }
        case 'SELECTED_USERS': {
            if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
                return [];
            }
            const validIds = targetUserIds.filter((id) => (0, securityUtils_1.isValidObjectId)(id));
            if (!validIds.length)
                return [];
            const users = await User_1.User.find({ _id: { $in: validIds }, role: 'user' }).select('_id');
            return users.map((u) => u._id);
        }
        default: {
            const users = await User_1.User.find({ role: 'user', isActive: true }).select('_id');
            return users.map((u) => u._id);
        }
    }
}
/**
 * Creates and dispatches a broadcast notification to target users with chunked bulk insertions
 */
async function createAndDispatchBroadcast(params) {
    const { adminId, adminEmail, title, message, type, targetType, targetUserIds, actionUrl, io } = params;
    const sanitizedUrl = sanitizeActionUrl(actionUrl);
    const recipientIds = await resolveRecipientIds(targetType, targetUserIds);
    const broadcast = await Broadcast_1.Broadcast.create({
        title,
        message,
        type,
        targetType,
        targetUserIds: targetType === 'SELECTED_USERS'
            ? recipientIds
            : undefined,
        actionUrl: sanitizedUrl,
        createdBy: new mongoose_1.default.Types.ObjectId(adminId),
        status: 'SENT',
        totalRecipients: recipientIds.length,
        deliveredCount: recipientIds.length,
        readCount: 0,
        sentAt: new Date(),
    });
    // Perform bulk insertion in chunks of 500 to maintain high performance and low memory
    if (recipientIds.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < recipientIds.length; i += CHUNK_SIZE) {
            const chunk = recipientIds.slice(i, i + CHUNK_SIZE);
            const notificationsToInsert = chunk.map((userId) => ({
                user: userId,
                broadcast: broadcast._id,
                type,
                title,
                message,
                actionUrl: sanitizedUrl,
                link: sanitizedUrl,
                read: false,
            }));
            await Notification_1.Notification.insertMany(notificationsToInsert, { ordered: false });
        }
    }
    // Audit Logging
    try {
        await AuditLog_1.AuditLog.create({
            adminEmail: adminEmail || 'admin@wonderfuljodi.com',
            action: 'BROADCAST_SENT',
            details: `Sent ${type} broadcast "${title}" to ${recipientIds.length} recipients (${targetType})`,
            targetModel: 'Broadcast',
            targetId: String(broadcast._id),
            status: 'SUCCESS',
        });
    }
    catch (err) {
        console.error('Failed to log admin action for broadcast:', err);
    }
    // Real-time emission via Socket.IO if available
    if (io) {
        try {
            io.emit('new_notification', {
                broadcastId: broadcast._id,
                title,
                message,
                type,
                actionUrl: sanitizedUrl,
                createdAt: new Date().toISOString(),
            });
        }
        catch (socketErr) {
            console.warn('Socket.IO notification broadcast emit skipped:', socketErr);
        }
    }
    return broadcast;
}
//# sourceMappingURL=notificationBroadcastService.js.map