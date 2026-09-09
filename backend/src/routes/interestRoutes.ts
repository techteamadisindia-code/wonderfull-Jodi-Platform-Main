import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
<<<<<<< HEAD
import { validateObjectIdParam } from '../middleware/validationMiddleware';
import {
  createInterest,
  updateInterest,
  getSentInterests,
  getReceivedInterests,
  checkInterestStatus,
  acceptInterest,
  declineInterest,
} from '../controllers/interestController';

const router = Router();

router.use(requireAuth);

router.post('/', createInterest);
router.get('/sent', getSentInterests);
router.get('/received', getReceivedInterests);
router.get('/check/:targetId', checkInterestStatus);
router.patch('/:id/accept', validateObjectIdParam('id'), acceptInterest);
router.patch('/:id/decline', validateObjectIdParam('id'), declineInterest);
router.patch('/:id/reject', validateObjectIdParam('id'), declineInterest);
router.put('/:id', validateObjectIdParam('id'), updateInterest);
=======
import { createInterest, updateInterest, getSentInterests, getReceivedInterests } from '../controllers/interestController';

const router = Router();

router.post('/', requireAuth, createInterest);
router.put('/:id', requireAuth, updateInterest);
router.get('/sent', requireAuth, getSentInterests);
router.get('/received', requireAuth, getReceivedInterests);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

export default router;
