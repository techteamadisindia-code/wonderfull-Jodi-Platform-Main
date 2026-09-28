import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class NotificationRepository {
  static async send(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }) {
    const id = generateObjectId();
    const notif = await prisma.notification.create({
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
    return toClient(notif);
  }

  static async getUserNotifications(userId: string, limit = 30) {
    const notifs = await prisma.notification.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return toClientArray(notifs);
  }

  static async markAsRead(id: string, userId: string) {
    const notif = await prisma.notification.updateMany({
      where: { id: String(id), userId: String(userId) },
      data: { read: true, readAt: new Date() },
    });
    return notif.count > 0;
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId: String(userId), read: false },
    });
  }
}
