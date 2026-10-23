import { Response, NextFunction } from 'express';
import { Notification, isNotificationTrashed } from '../models/Notification';
import { Broadcast } from '../models/Broadcast';
import { AuthRequest } from '../middleware/authMiddleware';
import { isValidObjectId } from '../utils/securityUtils';

/**
 * Get paginated notifications for the authenticated user (excludes trashed notifications)
 */
export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;

    const query: any = { user: userId };
    if (String(unreadOnly).toLowerCase() === 'true') {
      query.read = false;
    }

    const pageSize = Math.min(50, Math.max(1, Number(limit) || 20));
    const pageNumber = Math.max(1, Number(page) || 1);
    const skip = (pageNumber - 1) * pageSize;

    let items: any;
    const findQuery = Notification.find(query);
    if (findQuery && typeof findQuery.sort === 'function') {
      const sorted = findQuery.sort({ createdAt: -1, _id: -1 });
      if (sorted && typeof sorted.skip === 'function') {
        const skipped = sorted.skip(skip);
        if (skipped && typeof skipped.limit === 'function') {
          items = await skipped.limit(pageSize);
        } else {
          items = await skipped;
        }
      } else {
        items = await sorted;
      }
    } else {
      items = await findQuery;
    }

    const allNotifications: any[] = Array.isArray(items) ? items : [];

    // Canonical filtering: exclude soft-deleted/trashed notifications from active inbox
    const activeNotifications = allNotifications.filter((n: any) => !isNotificationTrashed(n.metadata));

    let total = activeNotifications.length;
    let unreadCount = activeNotifications.filter((n: any) => !n.read).length;
    let isTotalCapped = false;
    let isUnreadCapped = false;

    if (typeof Notification.countDocuments === 'function') {
      try {
        const rawTotal: any = await Notification.countDocuments(query);
        if (typeof rawTotal === 'number' || rawTotal instanceof Number) {
          total = Number(rawTotal);
          if ((rawTotal as any)?.isCapped) isTotalCapped = true;
        }
        const rawUnread: any = await Notification.countDocuments({ user: userId, read: false });
        if (typeof rawUnread === 'number' || rawUnread instanceof Number) {
          unreadCount = Number(rawUnread);
          if ((rawUnread as any)?.isCapped) isUnreadCapped = true;
        }
      } catch {
        // Fall back gracefully to active notifications length
      }
    }

    const isTruncated = Boolean(
      (allNotifications as any)?.isTruncated ||
      (allNotifications as any)?.scanBudgetExceeded ||
      isTotalCapped
    );

    res.json({
      success: true,
      data: {
        notifications: activeNotifications,
        total,
        unreadCount,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        isTruncated,
        isCapped: isTotalCapped || isUnreadCapped,
        isTotalCapped,
        isUnreadCapped,
        hasMore: isTruncated || pageNumber < (Math.ceil(total / pageSize) || 1),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fast endpoint for unread count (excludes trashed notifications)
 */
export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let count = 0;
    let isCapped = false;
    if (typeof Notification.countDocuments === 'function') {
      const rawCount: any = await Notification.countDocuments({ user: userId, read: false });
      if (typeof rawCount === 'number' || rawCount instanceof Number) {
        count = Number(rawCount);
        if ((rawCount as any)?.isCapped) isCapped = true;
      }
    } else {
      const unread = await Notification.find({ user: userId, read: false }).limit(500);
      const list = Array.isArray(unread) ? unread : [];
      count = list.filter((n: any) => !isNotificationTrashed(n.metadata)).length;
    }

    res.json({
      success: true,
      data: {
        count,
        isCapped,
        cappedAt: isCapped ? 5000 : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark a single notification as read with strict ownership verification
 */
export async function markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOne({ _id: id, user: userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();

      // If associated with a broadcast, increment readCount
      if (notification.broadcast) {
        await Broadcast.findByIdAndUpdate(notification.broadcast, {
          $inc: { readCount: 1 },
        }).catch(() => null);
      }
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all unread notifications for the user as read in a single batch
 */
export async function markAllNotificationsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const unreadNotifications = await Notification.find({ user: userId, read: false }).select('_id broadcast');
    if (unreadNotifications.length === 0) {
      return res.json({ success: true, message: 'No unread notifications', count: 0 });
    }

    const result = await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Update broadcast read counts
    const broadcastIds = unreadNotifications
      .map((n) => n.broadcast)
      .filter((b) => Boolean(b));

    if (broadcastIds.length > 0) {
      const countsByBroadcast: Record<string, number> = {};
      broadcastIds.forEach((bId) => {
        const idStr = String(bId);
        countsByBroadcast[idStr] = (countsByBroadcast[idStr] || 0) + 1;
      });

      const updatePromises = Object.entries(countsByBroadcast).map(([bId, incCount]) =>
        Broadcast.findByIdAndUpdate(bId, { $inc: { readCount: incCount } }).catch(() => null)
      );
      await Promise.all(updatePromises);
    }

    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Permanently trash/soft-delete a read notification with strict recipient ownership verification
 */
export async function deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Strict ownership verification: only recipient can delete their own notification
    const recipientId = typeof notification.user === 'object' && notification.user !== null
      ? String((notification.user as any)._id || (notification.user as any).id)
      : String(notification.user || (notification as any).userId);

    if (recipientId !== String(userId)) {
      // Return 404 to avoid leaking existence of other users' notifications
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Idempotent: if already trashed/deleted, return success
    if (isNotificationTrashed(notification.metadata)) {
      return res.json({
        success: true,
        message: 'Notification deleted successfully',
        data: { id: notification._id || notification.id, deleted: true },
      });
    }

    // Only read notifications can be deleted
    if (!notification.read) {
      return res.status(400).json({
        success: false,
        message: 'Only read notifications can be deleted. Please mark the notification as read first.',
      });
    }

    // Canonical soft deletion: update JSON metadata with trash state
    let currentMeta: Record<string, any> = {};
    if (typeof notification.metadata === 'object' && notification.metadata !== null) {
      currentMeta = { ...notification.metadata };
    } else if (typeof notification.metadata === 'string') {
      try {
        currentMeta = JSON.parse(notification.metadata);
      } catch {
        currentMeta = {};
      }
    }

    notification.metadata = {
      ...currentMeta,
      isDeleted: true,
      trashed: true,
      trashedAt: new Date().toISOString(),
      deletedBy: String(userId),
    };
    await notification.save();

    res.json({
      success: true,
      message: 'Notification deleted successfully',
      data: { id: notification._id || notification.id, deleted: true },
    });
  } catch (error) {
    next(error);
  }
}
