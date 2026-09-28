"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const paymentController_1 = require("../controllers/paymentController");
const router = (0, express_1.Router)();
// Public Webhook endpoint
router.post('/webhook', paymentController_1.handleRazorpayWebhook);
// User-facing payment history
router.get('/history', authMiddleware_1.requireAuth, paymentController_1.getUserPaymentHistory);
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map