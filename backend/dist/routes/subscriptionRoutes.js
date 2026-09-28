"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const membershipController_1 = require("../controllers/membershipController");
const router = (0, express_1.Router)();
// GET /api/subscription/me - current user subscription details with contact credits
router.get('/me', authMiddleware_1.requireAuth, membershipController_1.getMySubscription);
router.get('/status', authMiddleware_1.requireAuth, membershipController_1.getMyMembershipStatus);
exports.default = router;
//# sourceMappingURL=subscriptionRoutes.js.map