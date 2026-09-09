import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { uploadLimiter } from '../middleware/rateLimiters';
import {
  submitVerification,
  getUserVerifications,
  getUserVerificationById,
  serveVerificationDocument,
} from '../controllers/verificationController';

const router = Router();

// 1. Submit Verification Document (User)
router.post('/', uploadLimiter, requireAuth, submitVerification);

// 2. Fetch User Verifications & History (User)
router.get('/me', requireAuth, getUserVerifications);

// 3. IDOR-Protected Document Viewer (User or Admin)
router.get('/document/:filename', requireAuth, serveVerificationDocument);

// 4. Fetch Single Verification Record (User or Admin)
router.get('/:id', requireAuth, getUserVerificationById);

export default router;
