import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getMembershipPlans, createOrder, verifyPayment } from '../controllers/membershipController';

const router = Router();

router.get('/', requireAuth, getMembershipPlans);
router.post('/create-order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);

export default router;
