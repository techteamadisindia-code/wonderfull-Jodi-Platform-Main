"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.getUnreadCount = getUnreadCount;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
const Notification_1 = require("../models/Notification");
const Broadcast_1 = require("../models/Broadcast");
const securityUtils_1 = require("../utils/securityUtils");
/**
 * Get paginated notifications for the authenticated user
 */
async function getNotifications(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;
        const query = { user: userId };
        if (String(unreadOnly).toLowerCase() === 'true') {
            query.read = false;
        }
        const pageSize = Math.min(50, Math.max(1, Number(limit) || 20));
        const pageNumber = Math.max(1, Number(page) || 1);
        const skip = (pageNumber - 1) * pageSize;
        const [total, unreadCount, notifications] = await Promise.all([
            Notification_1.Notification.countDocuments(query),
            Notification_1.Notification.countDocuments({ user: userId, read: false }),
            Notification_1.Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize),
        ]);
        res.json({
            success: true,
            data: {
                notifications,
                total,
                unreadCount,
                page: pageNumber,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize) || 1,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Fast endpoint for unread count
 */
async function getUnreadCount(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const count = await Notification_1.Notification.countDocuments({ user: userId, read: false });
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Mark a single notification as read with strict ownership verification
 */
async function markNotificationRead(req, res, next) {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }
        const notification = await Notification_1.Notification.findOne({ _id: id, user: userId });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        if (!notification.read) {
            notification.read = true;
            notification.readAt = new Date();
            await notification.save();
            // If associated with a broadcast, increment readCount
            if (notification.broadcast) {
                await Broadcast_1.Broadcast.findByIdAndUpdate(notification.broadcast, {
                    $inc: { readCount: 1 },
                }).catch(() => null);
            }
        }
        res.json({ success: true, data: notification });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Mark all unread notifications for the user as read in a single batch
 */
async function markAllNotificationsRead(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const unreadNotifications = await Notification_1.Notification.find({ user: userId, read: false }).select('_id broadcast');
        if (unreadNotifications.length === 0) {
            return res.json({ success: true, message: 'No unread notifications', count: 0 });
        }
        const result = await Notification_1.Notification.updateMany({ user: userId, read: false }, { $set: { read: true, readAt: new Date() } });
        // Update broadcast read counts
        const broadcastIds = unreadNotifications
            .map((n) => n.broadcast)
            .filter((b) => Boolean(b));
        if (broadcastIds.length > 0) {
            const countsByBroadcast = {};
            broadcastIds.forEach((bId) => {
                const idStr = String(bId);
                countsByBroadcast[idStr] = (countsByBroadcast[idStr] || 0) + 1;
            });
            const updatePromises = Object.entries(countsByBroadcast).map(([bId, incCount]) => Broadcast_1.Broadcast.findByIdAndUpdate(bId, { $inc: { readCount: incCount } }).catch(() => null));
            await Promise.all(updatePromises);
        }
        res.json({
            success: true,
            message: 'All notifications marked as read',
            count: result.modifiedCount,
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=notificationController.js.map