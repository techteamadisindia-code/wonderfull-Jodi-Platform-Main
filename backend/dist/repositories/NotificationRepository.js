"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const client_1 = require("../db/client");
const Notification_1 = require("../models/Notification");
class NotificationRepository {
    static async send(data) {
        const id = (0, client_1.generateObjectId)();
        const notif = await client_1.prisma.notification.create({
            data: {
                id,
                userId: String(data.userId),
                title: data.title,
                message: data.message,
                type: data.type || 'SYSTEM',
                link: data.link || '',
                read: false,
            },
        });
        return (0, client_1.toClient)(notif);
    }
    static async getUserNotifications(userId, limit = 30) {
        const BATCH_SIZE = 100;
        const MAX_SCAN_BUDGET = 2000;
        const active = [];
        let dbOffset = 0;
        let isTruncated = false;
        while (active.length < limit && dbOffset < MAX_SCAN_BUDGET) {
            const batch = await client_1.prisma.notification.findMany({
                where: { userId: String(userId) },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: dbOffset,
                take: BATCH_SIZE,
            });
            if (!batch || batch.length === 0)
                break;
            for (const n of batch) {
                if (!(0, Notification_1.isNotificationTrashed)(n.metadata)) {
                    active.push(n);
                    if (active.length === limit)
                        break;
                }
            }
            dbOffset += batch.length;
            if (batch.length < BATCH_SIZE)
                break;
        }
        if (dbOffset >= MAX_SCAN_BUDGET && active.length < limit) {
            isTruncated = true;
        }
        const result = (0, client_1.toClientArray)(active);
        result.isTruncated = isTruncated;
        result.scanBudgetExceeded = isTruncated;
        result.totalScanned = dbOffset;
        return result;
    }
    static async markAsRead(id, userId) {
        const notif = await client_1.prisma.notification.updateMany({
            where: { id: String(id), userId: String(userId) },
            data: { read: true, readAt: new Date() },
        });
        return notif.count > 0;
    }
    static async softDelete(id, userId) {
        const notif = await client_1.prisma.notification.findFirst({
            where: { id: String(id), userId: String(userId) },
        });
        if (!notif)
            return false;
        if (!notif.read)
            return false; // Must be read
        let meta = notif.metadata;
        if (typeof meta === 'string') {
            try {
                meta = JSON.parse(meta);
            }
            catch (_) {
                meta = {};
            }
        }
        else if (!meta || typeof meta !== 'object') {
            meta = {};
        }
        meta.isDeleted = true;
        meta.trashed = true;
        meta.trashedAt = new Date().toISOString();
        meta.deletedBy = String(userId);
        await client_1.prisma.notification.update({
            where: { id: String(id) },
            data: {
                metadata: meta,
            },
        });
        return true;
    }
    static async getUnreadCount(userId) {
        const BATCH_SIZE = 250;
        const MAX_COUNT_BUDGET = 5000;
        let count = 0;
        let dbOffset = 0;
        let isCapped = false;
        while (dbOffset < MAX_COUNT_BUDGET) {
            const batch = await client_1.prisma.notification.findMany({
                where: { userId: String(userId), read: false },
                select: { id: true, read: true, metadata: true },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: dbOffset,
                take: BATCH_SIZE,
            });
            if (!batch || batch.length === 0)
                break;
            for (const n of batch) {
                if (n.read === false && !(0, Notification_1.isNotificationTrashed)(n.metadata)) {
                    count++;
                }
            }
            dbOffset += batch.length;
            if (batch.length < BATCH_SIZE)
                break;
        }
        if (dbOffset >= MAX_COUNT_BUDGET) {
            isCapped = true;
        }
        const countNum = new Number(count);
        countNum.count = count;
        countNum.isCapped = isCapped;
        countNum.cappedAt = isCapped ? MAX_COUNT_BUDGET : undefined;
        return countNum;
    }
}
exports.NotificationRepository = NotificationRepository;
//# sourceMappingURL=NotificationRepository.js.map