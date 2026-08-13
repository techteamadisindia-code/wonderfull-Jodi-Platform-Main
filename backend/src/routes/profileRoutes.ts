import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { createProfile, getProfile, updateProfile, deleteProfile, getMyProfile } from '../controllers/profileController';

const router = Router();

router.get('/me', requireAuth, getMyProfile);
router.get('/:id', getProfile);
router.post('/', requireAuth, createProfile);
router.put('/:id', requireAuth, updateProfile);
router.delete('/:id', requireAuth, deleteProfile);

export default router;
