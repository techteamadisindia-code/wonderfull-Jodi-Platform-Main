import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { blockUser, unblockUser, getBlockedUsers } from '../controllers/blockController';
import { validateObjectIdParam } from '../middleware/validationMiddleware';

const router = Router();

router.post('/', requireAuth, blockUser);
router.delete('/:blockedUserId', requireAuth, validateObjectIdParam('blockedUserId'), unblockUser);
router.get('/', requireAuth, getBlockedUsers);

export default router;
