import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';
import { isNotificationTrashed } from '../models/Notification';

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
    const BATCH_SIZE = 100;
    const MAX_SCAN_BUDGET = 2000;
    const active: any[] = [];
    let dbOffset = 0;
    let isTruncated = false;

    while (active.length < limit && dbOffset < MAX_SCAN_BUDGET) {
      const batch = await prisma.notification.findMany({
        where: { userId: String(userId) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: dbOffset,
        take: BATCH_SIZE,
      });
      if (!batch || batch.length === 0) break;

      for (const n of batch) {
        if (!isNotificationTrashed(n.metadata)) {
          active.push(n);
          if (active.length === limit) break;
        }
      }

      dbOffset += batch.length;
      if (batch.length < BATCH_SIZE) break;
    }

    if (dbOffset >= MAX_SCAN_BUDGET && active.length < limit) {
      isTruncated = true;
    }

    const result = toClientArray(active);
    (result as any).isTruncated = isTruncated;
    (result as any).scanBudgetExceeded = isTruncated;
    (result as any).totalScanned = dbOffset;
    return result;
  }

  static async markAsRead(id: string, userId: string) {
    const notif = await prisma.notification.updateMany({
      where: { id: String(id), userId: String(userId) },
      data: { read: true, readAt: new Date() },
    });
    return notif.count > 0;
  }

  static async softDelete(id: string, userId: string) {
    const notif = await prisma.notification.findFirst({
      where: { id: String(id), userId: String(userId) },
    });
    if (!notif) return false;
    if (!notif.read) return false; // Must be read

    let meta: any = notif.metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch (_) {
        meta = {};
      }
    } else if (!meta || typeof meta !== 'object') {
      meta = {};
    }

    meta.isDeleted = true;
    meta.trashed = true;
    meta.trashedAt = new Date().toISOString();
    meta.deletedBy = String(userId);

    await prisma.notification.update({
      where: { id: String(id) },
      data: {
        metadata: meta,
      },
    });
    return true;
  }

  static async getUnreadCount(userId: string) {
    const BATCH_SIZE = 250;
    const MAX_COUNT_BUDGET = 5000;
    let count = 0;
    let dbOffset = 0;
    let isCapped = false;

    while (dbOffset < MAX_COUNT_BUDGET) {
      const batch = await prisma.notification.findMany({
        where: { userId: String(userId), read: false },
        select: { id: true, read: true, metadata: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: dbOffset,
        take: BATCH_SIZE,
      });
      if (!batch || batch.length === 0) break;

      for (const n of batch) {
        if (n.read === false && !isNotificationTrashed(n.metadata)) {
          count++;
        }
      }

      dbOffset += batch.length;
      if (batch.length < BATCH_SIZE) break;
    }

    if (dbOffset >= MAX_COUNT_BUDGET) {
      isCapped = true;
    }

    const countNum = new Number(count) as any;
    countNum.count = count;
    countNum.isCapped = isCapped;
    countNum.cappedAt = isCapped ? MAX_COUNT_BUDGET : undefined;
    return countNum;
  }
}
