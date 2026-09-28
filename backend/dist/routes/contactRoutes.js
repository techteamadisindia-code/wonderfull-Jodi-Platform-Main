"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const contactInquiryController_1 = require("../controllers/contactInquiryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Rate limit: 5 contact submissions per IP per 15 minutes
const contactSubmitLimiter = (0, express_rate_limit_1.default)({
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
router.post('/', contactSubmitLimiter, authMiddleware_1.optionalAuth, contactInquiryController_1.submitContactInquiry);
exports.default = router;
//# sourceMappingURL=contactRoutes.js.map