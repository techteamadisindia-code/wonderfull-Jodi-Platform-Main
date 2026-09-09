import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  getMembershipPlans,
  createOrder,
  verifyPayment,
  getMyMembershipStatus,
} from '../controllers/membershipController';

const router = Router();

router.get('/', requireAuth, getMembershipPlans);
router.get('/status', requireAuth, getMyMembershipStatus);
router.get('/my-status', requireAuth, getMyMembershipStatus);
router.post('/create-order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);

export default router;
