"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const membershipController_1 = require("../controllers/membershipController");
const router = (0, express_1.Router)();
// Public: GET /api/membership-plans
router.get('/', membershipController_1.getMembershipPlans);
exports.default = router;
//# sourceMappingURL=membershipPlanRoutes.js.map