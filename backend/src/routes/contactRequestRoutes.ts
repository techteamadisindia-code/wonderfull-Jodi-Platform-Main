import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  createContactRequest,
  getContactRequests,
  acceptContactRequest,
  declineContactRequest,
} from '../controllers/contactRequestController';

const router = Router();

// All contact request interactions require authentication
router.post('/', requireAuth, createContactRequest);
router.get('/', requireAuth, getContactRequests);
router.patch('/:id/accept', requireAuth, acceptContactRequest);
router.patch('/:id/decline', requireAuth, declineContactRequest);

export default router;
