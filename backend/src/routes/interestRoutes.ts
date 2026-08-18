import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { createInterest, updateInterest, getSentInterests, getReceivedInterests } from '../controllers/interestController';

const router = Router();

router.post('/', requireAuth, createInterest);
router.put('/:id', requireAuth, updateInterest);
router.get('/sent', requireAuth, getSentInterests);
router.get('/received', requireAuth, getReceivedInterests);

export default router;
