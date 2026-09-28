import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactInquiry } from '../controllers/contactInquiryController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Rate limit: 5 contact submissions per IP per 15 minutes
const contactSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  message: {
    success: false,
    message: 'Too many contact submissions from this IP. Please try again in 15 minutes.',
  },
});

// POST /api/contact – Public, optional auth to detect registered members
router.post('/', contactSubmitLimiter, optionalAuth, submitContactInquiry);

export default router;
