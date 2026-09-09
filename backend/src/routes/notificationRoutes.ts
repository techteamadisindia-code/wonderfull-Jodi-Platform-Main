import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
<<<<<<< HEAD
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
=======
import { getNotifications, markNotificationRead } from '../controllers/notificationController';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.put('/:id/read', requireAuth, markNotificationRead);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

export default router;
