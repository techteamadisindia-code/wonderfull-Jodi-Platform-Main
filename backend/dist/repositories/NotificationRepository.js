"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const client_1 = require("../db/client");
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
        const notifs = await client_1.prisma.notification.findMany({
            where: { userId: String(userId) },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return (0, client_1.toClientArray)(notifs);
    }
    static async markAsRead(id, userId) {
        const notif = await client_1.prisma.notification.updateMany({
            where: { id: String(id), userId: String(userId) },
            data: { read: true, readAt: new Date() },
        });
        return notif.count > 0;
    }
    static async getUnreadCount(userId) {
        return client_1.prisma.notification.count({
            where: { userId: String(userId), read: false },
        });
    }
}
exports.NotificationRepository = NotificationRepository;
//# sourceMappingURL=NotificationRepository.js.map