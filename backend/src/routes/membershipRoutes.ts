import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware';
import {
  getMembershipPlans,
  calculateOfferEndpoint,
  claimFreeMembership,
  createOrder,
  verifyPayment,
  getMyMembershipStatus,
} from '../controllers/membershipController';

const router = Router();

// Public: Fetch active membership plans
router.get('/', getMembershipPlans);
router.get('/plans', getMembershipPlans);
router.post('/calculate-offer', optionalAuth, calculateOfferEndpoint);
router.post('/claim-free', requireAuth, claimFreeMembership);
router.get('/status', requireAuth, getMyMembershipStatus);
router.get('/my-status', requireAuth, getMyMembershipStatus);
router.post('/create-order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);

export default router;
