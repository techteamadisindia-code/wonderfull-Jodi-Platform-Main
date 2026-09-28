"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const rateLimiters_1 = require("../middleware/rateLimiters");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public Authentication Endpoints (Strict Rate Limited)
router.post('/register', rateLimiters_1.authLimiter, authController_1.registerUser);
router.post('/login', rateLimiters_1.authLimiter, authController_1.loginUser);
router.post('/refresh', authController_1.refreshSession);
router.post('/logout', authController_1.logoutUser);
// Password Recovery (Strict Rate Limited)
router.post('/forgot-password', rateLimiters_1.passwordResetLimiter, authController_1.forgotPassword);
router.get('/validate-reset-token', authController_1.validateResetToken);
router.post('/validate-reset-token', authController_1.validateResetToken);
router.post('/reset-password', rateLimiters_1.passwordResetLimiter, authController_1.resetPassword);
// Authenticated Account Endpoints
router.get('/me', authMiddleware_1.requireAuth, authController_1.getCurrentUser);
router.post('/change-password', authMiddleware_1.requireAuth, authController_1.changePassword);
router.post('/logout-all', authMiddleware_1.requireAuth, authController_1.logoutAllDevices);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map