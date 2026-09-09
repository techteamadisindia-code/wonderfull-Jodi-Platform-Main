import { Router } from 'express';
<<<<<<< HEAD
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
=======
import { requireAuth } from '../middleware/authMiddleware';
import { createProfile, getProfile, updateProfile, deleteProfile, getMyProfile } from '../controllers/profileController';
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

const router = Router();

router.get('/me', requireAuth, getMyProfile);
<<<<<<< HEAD
router.put('/me', requireAuth, updateMyProfile);
router.get('/my-profile', requireAuth, getMyProfile);
router.put('/my-profile', requireAuth, updateMyProfile);
router.get('/:id', optionalAuth, validateObjectIdParam('id'), getProfile);
router.post('/', requireAuth, createProfile);
router.put('/:id', requireAuth, validateObjectIdParam('id'), updateProfile);
router.delete('/:id', requireAuth, validateObjectIdParam('id'), deleteProfile);
=======
router.get('/:id', getProfile);
router.post('/', requireAuth, createProfile);
router.put('/:id', requireAuth, updateProfile);
router.delete('/:id', requireAuth, deleteProfile);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

export default router;
