import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { addShortlist, removeShortlist, getShortlisted } from '../controllers/shortlistController';

const router = Router();

router.post('/', requireAuth, addShortlist);
router.delete('/:profileId', requireAuth, removeShortlist);
router.get('/', requireAuth, getShortlisted);

export default router;
