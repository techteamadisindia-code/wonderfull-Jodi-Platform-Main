import { Router } from 'express';
import { getMembershipPlans } from '../controllers/membershipController';

const router = Router();

// Public: GET /api/membership-plans
router.get('/', getMembershipPlans);

export default router;
