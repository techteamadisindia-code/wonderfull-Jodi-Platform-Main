import { Router } from 'express';
import {
  adminLogin,
  getAdminMe,
  adminLogout,
  adminForgotPassword,
  adminValidateResetToken,
  adminResetPassword,
  adminChangePassword,
  getAdminSessions,
  revokeAdminOtherSessions,
  getAdminRecentActivity,
} from '../controllers/adminAuthController';
import { adminLoginLimiter, adminResetLimiter } from '../middleware/rateLimiters';
import { requireAdminAuth } from '../middleware/authMiddleware';

const router = Router();

// Public Admin Authentication Endpoints (Strict Rate Limited)
router.post('/login', adminLoginLimiter, adminLogin);
router.post('/forgot-password', adminResetLimiter, adminForgotPassword);
router.get('/validate-reset-token', adminValidateResetToken);
router.post('/validate-reset-token', adminValidateResetToken);
router.post('/reset-password', adminResetLimiter, adminResetPassword);

// Authenticated Admin Endpoints
router.get('/me', requireAdminAuth, getAdminMe);
router.post('/logout', requireAdminAuth, adminLogout);
router.post('/change-password', requireAdminAuth, adminChangePassword);
router.get('/sessions', requireAdminAuth, getAdminSessions);
router.post('/revoke-other-sessions', requireAdminAuth, revokeAdminOtherSessions);
router.get('/recent-activity', requireAdminAuth, getAdminRecentActivity);

export default router;
