import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware';
import { validateObjectIdParam } from '../middleware/validationMiddleware';
import {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
  getMyProfile,
  updateMyProfile,
} from '../controllers/profileController';
import {
  getBlockedProfiles,
  blockProfileById,
  unblockProfileById,
} from '../controllers/blockController';

const router = Router();

router.get('/me', requireAuth, getMyProfile);
router.put('/me', requireAuth, updateMyProfile);
router.get('/my-profile', requireAuth, getMyProfile);
router.put('/my-profile', requireAuth, updateMyProfile);
router.get('/blocked', requireAuth, getBlockedProfiles);
router.post('/:id/block', requireAuth, validateObjectIdParam('id'), blockProfileById);
router.delete('/:id/block', requireAuth, validateObjectIdParam('id'), unblockProfileById);
router.get('/:id', optionalAuth, validateObjectIdParam('id'), getProfile);
router.post('/', requireAuth, createProfile);
router.put('/:id', requireAuth, validateObjectIdParam('id'), updateProfile);
router.delete('/:id', requireAuth, validateObjectIdParam('id'), deleteProfile);

export default router;

