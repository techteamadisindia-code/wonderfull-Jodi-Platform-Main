import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getNotifications, markNotificationRead } from '../controllers/notificationController';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.put('/:id/read', requireAuth, markNotificationRead);

export default router;
