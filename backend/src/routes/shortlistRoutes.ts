import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
<<<<<<< HEAD
import { validateObjectIdParam } from '../middleware/validationMiddleware';
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
import { addShortlist, removeShortlist, getShortlisted } from '../controllers/shortlistController';

const router = Router();

router.post('/', requireAuth, addShortlist);
<<<<<<< HEAD
router.delete('/:profileId', requireAuth, validateObjectIdParam('profileId'), removeShortlist);
=======
router.delete('/:profileId', requireAuth, removeShortlist);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
router.get('/', requireAuth, getShortlisted);

export default router;
