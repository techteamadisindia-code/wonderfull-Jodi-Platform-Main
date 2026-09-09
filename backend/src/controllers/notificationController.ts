<<<<<<< HEAD
import { Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { Broadcast } from '../models/Broadcast';
import { AuthRequest } from '../middleware/authMiddleware';
import { isValidObjectId } from '../utils/securityUtils';

/**
 * Get paginated notifications for the authenticated user
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

    const [total, unreadCount, notifications] = await Promise.all([
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userId, read: false }),
      Notification.find(query)
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
=======
import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/authMiddleware';

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await Notification.find({ user: req.user?.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  } catch (error) {
    next(error);
  }
}

<<<<<<< HEAD
/**
 * Fast endpoint for unread count
 */
export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const count = await Notification.countDocuments({ user: userId, read: false });
    res.json({ success: true, data: { count } });
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

=======
export async function markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user?.userId },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
}
<<<<<<< HEAD

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
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
