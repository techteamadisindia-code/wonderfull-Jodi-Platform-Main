"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuthController_1 = require("../controllers/adminAuthController");
const rateLimiters_1 = require("../middleware/rateLimiters");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public Admin Authentication Endpoints (Strict Rate Limited)
router.post('/login', rateLimiters_1.adminLoginLimiter, adminAuthController_1.adminLogin);
router.post('/forgot-password', rateLimiters_1.adminResetLimiter, adminAuthController_1.adminForgotPassword);
router.get('/validate-reset-token', adminAuthController_1.adminValidateResetToken);
router.post('/validate-reset-token', adminAuthController_1.adminValidateResetToken);
router.post('/reset-password', rateLimiters_1.adminResetLimiter, adminAuthController_1.adminResetPassword);
// Authenticated Admin Endpoints
router.get('/me', authMiddleware_1.requireAdminAuth, adminAuthController_1.getAdminMe);
router.post('/logout', authMiddleware_1.requireAdminAuth, adminAuthController_1.adminLogout);
router.post('/change-password', authMiddleware_1.requireAdminAuth, adminAuthController_1.adminChangePassword);
router.get('/sessions', authMiddleware_1.requireAdminAuth, adminAuthController_1.getAdminSessions);
router.post('/revoke-other-sessions', authMiddleware_1.requireAdminAuth, adminAuthController_1.revokeAdminOtherSessions);
router.get('/recent-activity', authMiddleware_1.requireAdminAuth, adminAuthController_1.getAdminRecentActivity);
exports.default = router;
//# sourceMappingURL=adminAuthRoutes.js.map