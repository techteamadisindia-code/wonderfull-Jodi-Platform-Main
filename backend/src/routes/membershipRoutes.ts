import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  getMembershipPlans,
  createOrder,
  verifyPayment,
  getMyMembershipStatus,
} from '../controllers/membershipController';

const router = Router();

// Public: Fetch active membership plans
router.get('/', getMembershipPlans);
router.get('/plans', getMembershipPlans);
router.get('/status', requireAuth, getMyMembershipStatus);
router.get('/my-status', requireAuth, getMyMembershipStatus);
router.post('/create-order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);

export default router;
