"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiters_1 = require("../middleware/rateLimiters");
const verificationController_1 = require("../controllers/verificationController");
const router = (0, express_1.Router)();
// 1. Submit Verification Document (User)
router.post('/', rateLimiters_1.uploadLimiter, authMiddleware_1.requireAuth, verificationController_1.submitVerification);
// 2. Fetch User Verifications & History (User)
router.get('/me', authMiddleware_1.requireAuth, verificationController_1.getUserVerifications);
// 3. IDOR-Protected Document Viewer (User or Admin)
router.get('/document/:filename', authMiddleware_1.requireAuth, verificationController_1.serveVerificationDocument);
// 4. Fetch Single Verification Record (User or Admin)
router.get('/:id', authMiddleware_1.requireAuth, verificationController_1.getUserVerificationById);
exports.default = router;
//# sourceMappingURL=verificationRoutes.js.map