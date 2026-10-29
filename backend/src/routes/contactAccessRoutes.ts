import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware';
import {
  getContactAccessStatus,
  revealContactDetails,
} from '../controllers/contactRequestController';

const router = Router();

// GET /api/contact-access/:profileId - Check if caller can see contact details of target profile
router.get('/:profileId', optionalAuth, getContactAccessStatus);

// POST /api/contact-access/:profileId/reveal - Reveal contact details (Free 1-reveal allowance or paid credit deduction)
router.post('/:profileId/reveal', requireAuth, revealContactDetails);
router.post('/:profileId', requireAuth, revealContactDetails);

export default router;
