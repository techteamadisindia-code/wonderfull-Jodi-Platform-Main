import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
<<<<<<< HEAD
import {
  getMembershipPlans,
  createOrder,
  verifyPayment,
  getMyMembershipStatus,
} from '../controllers/membershipController';
=======
import { getMembershipPlans, createOrder, verifyPayment } from '../controllers/membershipController';
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

const router = Router();

router.get('/', requireAuth, getMembershipPlans);
<<<<<<< HEAD
router.get('/status', requireAuth, getMyMembershipStatus);
router.get('/my-status', requireAuth, getMyMembershipStatus);
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
router.post('/create-order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);

export default router;
