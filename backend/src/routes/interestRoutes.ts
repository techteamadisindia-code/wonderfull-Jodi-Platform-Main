import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { validateObjectIdParam } from '../middleware/validationMiddleware';
import {
  createInterest,
  updateInterest,
  getSentInterests,
  getReceivedInterests,
  getAcceptedConnections,
  checkInterestStatus,
  acceptInterest,
  declineInterest,
  rejectInterest,
  withdrawInterest,
  undoDeclineInterest,
} from '../controllers/interestController';

const router = Router();

router.use(requireAuth);

router.post('/', createInterest);
router.get('/sent', getSentInterests);
router.get('/received', getReceivedInterests);
router.get('/accepted', getAcceptedConnections);
router.get('/connections', getAcceptedConnections);
router.get('/check/:targetId', checkInterestStatus);
router.patch('/:id/accept', validateObjectIdParam('id'), acceptInterest);
router.patch('/:id/decline', validateObjectIdParam('id'), declineInterest);
router.patch('/:id/reject', validateObjectIdParam('id'), rejectInterest);
router.patch('/:id/withdraw', validateObjectIdParam('id'), withdrawInterest);
router.post('/:id/withdraw', validateObjectIdParam('id'), withdrawInterest);
router.patch('/:id/undo-decline', validateObjectIdParam('id'), undoDeclineInterest);
router.post('/:id/undo-decline', validateObjectIdParam('id'), undoDeclineInterest);
router.patch('/:id/restore', validateObjectIdParam('id'), undoDeclineInterest);
router.put('/:id', validateObjectIdParam('id'), updateInterest);

export default router;
