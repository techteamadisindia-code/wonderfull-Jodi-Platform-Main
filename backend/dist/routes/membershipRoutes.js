"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const membershipController_1 = require("../controllers/membershipController");
const router = (0, express_1.Router)();
// Public: Fetch active membership plans
router.get('/', membershipController_1.getMembershipPlans);
router.get('/plans', membershipController_1.getMembershipPlans);
router.post('/calculate-offer', authMiddleware_1.optionalAuth, membershipController_1.calculateOfferEndpoint);
router.post('/claim-free', authMiddleware_1.requireAuth, membershipController_1.claimFreeMembership);
router.get('/status', authMiddleware_1.requireAuth, membershipController_1.getMyMembershipStatus);
router.get('/my-status', authMiddleware_1.requireAuth, membershipController_1.getMyMembershipStatus);
router.post('/create-order', authMiddleware_1.requireAuth, membershipController_1.createOrder);
router.post('/verify', authMiddleware_1.requireAuth, membershipController_1.verifyPayment);
exports.default = router;
//# sourceMappingURL=membershipRoutes.js.map