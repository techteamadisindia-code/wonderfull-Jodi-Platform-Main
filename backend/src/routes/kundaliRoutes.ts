import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware';
import { kundaliLimiter } from '../middleware/rateLimiters';
import {
  getMyBirthDetails,
  updateMyBirthDetails,
  getLocations,
  calculateKundali,
  matchPublicKundali,
  saveKundaliMatch,
  getKundaliReport,
  getKundaliHistory,
} from '../controllers/kundaliController';

const router = Router();

// ─── 100% FREE PUBLIC KUNDALI MATCH ───
// Anyone (guests, non-registered users, logged-in members) can calculate without authentication
router.post('/match', kundaliLimiter, optionalAuth, matchPublicKundali);
router.get('/locations', optionalAuth, getLocations);

// ─── AUTHENTICATED USER ENDPOINTS ───
router.get('/my-birth-details', requireAuth, getMyBirthDetails);
router.put('/my-birth-details', requireAuth, updateMyBirthDetails);
router.post('/calculate', requireAuth, calculateKundali);
router.post('/save', requireAuth, saveKundaliMatch);
router.get('/report/:id', requireAuth, getKundaliReport);
router.get('/history', requireAuth, getKundaliHistory);

export default router;

