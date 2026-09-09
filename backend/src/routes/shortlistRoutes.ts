import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { validateObjectIdParam } from '../middleware/validationMiddleware';
import { addShortlist, removeShortlist, getShortlisted } from '../controllers/shortlistController';

const router = Router();

router.post('/', requireAuth, addShortlist);
router.delete('/:profileId', requireAuth, validateObjectIdParam('profileId'), removeShortlist);
router.get('/', requireAuth, getShortlisted);

export default router;
