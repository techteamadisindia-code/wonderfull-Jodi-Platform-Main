import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getMySubscription, getMyMembershipStatus } from '../controllers/membershipController';

const router = Router();

// GET /api/subscription/me - current user subscription details with contact credits
router.get('/me', requireAuth, getMySubscription);
router.get('/status', requireAuth, getMyMembershipStatus);

export default router;
