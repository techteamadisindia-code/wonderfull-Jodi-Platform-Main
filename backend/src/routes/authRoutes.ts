import { Router } from 'express';
<<<<<<< HEAD
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
=======
import { registerUser, loginUser, forgotPassword, resetPassword } from '../controllers/authController';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

export default router;
