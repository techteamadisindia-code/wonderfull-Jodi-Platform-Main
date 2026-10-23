import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { validateObjectIdParam } from '../middleware/validationMiddleware';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../controllers/notificationController';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.put('/read-all', markAllNotificationsRead);
router.patch('/:id/read', validateObjectIdParam('id'), markNotificationRead);
router.put('/:id/read', validateObjectIdParam('id'), markNotificationRead);
router.delete('/:id', validateObjectIdParam('id'), deleteNotification);

export default router;
