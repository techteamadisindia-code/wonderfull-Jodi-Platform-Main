"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const couponController_1 = require("../controllers/couponController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public / Authenticated Member: Validate Coupon Code
router.post('/validate', authMiddleware_1.optionalAuth, couponController_1.validateCouponEndpoint);
// Authenticated Member: Atomic Redeem Coupon
router.post('/redeem', authMiddleware_1.requireAuth, couponController_1.redeemCouponEndpoint);
// Admin: Coupon Management Endpoints
router.get('/admin', authMiddleware_1.requireAdminAuth, couponController_1.getAdminCoupons);
router.post('/admin', authMiddleware_1.requireAdminAuth, couponController_1.createAdminCoupon);
router.patch('/admin/:id', authMiddleware_1.requireAdminAuth, couponController_1.updateAdminCoupon);
router.put('/admin/:id', authMiddleware_1.requireAdminAuth, couponController_1.updateAdminCoupon);
router.delete('/admin/:id', authMiddleware_1.requireAdminAuth, couponController_1.deleteAdminCoupon);
router.get('/admin/:id/usage', authMiddleware_1.requireAdminAuth, couponController_1.getAdminCouponUsage);
exports.default = router;
//# sourceMappingURL=couponRoutes.js.map