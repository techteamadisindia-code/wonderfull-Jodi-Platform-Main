import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.put('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.put('/:id/read', markNotificationRead);

export default router;
