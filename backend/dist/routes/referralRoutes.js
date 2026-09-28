"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const referralController_1 = require("../controllers/referralController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Member: My Referral Dashboard
router.get('/me', authMiddleware_1.requireAuth, referralController_1.getMyReferralDashboard);
// Public: Track Referral Link Click
router.post('/track-click', authMiddleware_1.optionalAuth, referralController_1.recordReferralClick);
// Admin: Referral Tracking Dashboard & Analytics
router.get('/admin', authMiddleware_1.requireAdminAuth, referralController_1.getAdminReferrals);
// Admin: Referral Reward Rules Configuration
router.get('/admin/config', authMiddleware_1.requireAdminAuth, referralController_1.getAdminReferralConfig);
router.put('/admin/config', authMiddleware_1.requireAdminAuth, referralController_1.updateAdminReferralConfig);
exports.default = router;
//# sourceMappingURL=referralRoutes.js.map