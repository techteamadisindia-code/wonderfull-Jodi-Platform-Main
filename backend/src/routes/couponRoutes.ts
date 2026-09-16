import { Router } from 'express';
import {
  validateCouponEndpoint,
  redeemCouponEndpoint,
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  getAdminCouponUsage,
} from '../controllers/couponController';
import { requireAdminAuth, optionalAuth, requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Public / Authenticated Member: Validate Coupon Code
router.post('/validate', optionalAuth, validateCouponEndpoint);

// Authenticated Member: Atomic Redeem Coupon
router.post('/redeem', requireAuth, redeemCouponEndpoint);

// Admin: Coupon Management Endpoints
router.get('/admin', requireAdminAuth, getAdminCoupons);
router.post('/admin', requireAdminAuth, createAdminCoupon);
router.patch('/admin/:id', requireAdminAuth, updateAdminCoupon);
router.put('/admin/:id', requireAdminAuth, updateAdminCoupon);
router.delete('/admin/:id', requireAdminAuth, deleteAdminCoupon);
router.get('/admin/:id/usage', requireAdminAuth, getAdminCouponUsage);

export default router;
