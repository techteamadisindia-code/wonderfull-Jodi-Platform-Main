import { Router } from 'express';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  logoutAllDevices,
  forgotPassword,
  validateResetToken,
  resetPassword,
  changePassword,
  getCurrentUser,
} from '../controllers/authController';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiters';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Public Authentication Endpoints (Strict Rate Limited)
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/refresh', refreshSession);
router.post('/logout', logoutUser);

// Password Recovery (Strict Rate Limited)
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/validate-reset-token', validateResetToken);
router.post('/reset-password', passwordResetLimiter, resetPassword);

// Authenticated Account Endpoints
router.get('/me', requireAuth, getCurrentUser);
router.post('/change-password', requireAuth, changePassword);
router.post('/logout-all', requireAuth, logoutAllDevices);

export default router;
