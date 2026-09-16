import { Router } from 'express';
import {
  getMyReferralDashboard,
  recordReferralClick,
  getAdminReferrals,
  getAdminReferralConfig,
  updateAdminReferralConfig,
} from '../controllers/referralController';
import { requireAuth, requireAdminAuth, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Member: My Referral Dashboard
router.get('/me', requireAuth, getMyReferralDashboard);

// Public: Track Referral Link Click
router.post('/track-click', optionalAuth, recordReferralClick);

// Admin: Referral Tracking Dashboard & Analytics
router.get('/admin', requireAdminAuth, getAdminReferrals);

// Admin: Referral Reward Rules Configuration
router.get('/admin/config', requireAdminAuth, getAdminReferralConfig);
router.put('/admin/config', requireAdminAuth, updateAdminReferralConfig);

export default router;
