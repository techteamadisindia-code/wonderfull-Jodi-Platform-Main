import { Router } from 'express';
import { optionalAuth } from '../middleware/authMiddleware';
import { getContactAccessStatus } from '../controllers/contactRequestController';

const router = Router();

// GET /api/contact-access/:profileId - Check if caller can see contact details of target profile
router.get('/:profileId', optionalAuth, getContactAccessStatus);

export default router;
