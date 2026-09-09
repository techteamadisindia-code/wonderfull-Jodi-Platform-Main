import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  handleRazorpayWebhook,
  getUserPaymentHistory,
} from '../controllers/paymentController';

const router = Router();

// Public Webhook endpoint
router.post('/webhook', handleRazorpayWebhook);

// User-facing payment history
router.get('/history', requireAuth, getUserPaymentHistory);

export default router;
