"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const contactRequestController_1 = require("../controllers/contactRequestController");
const router = (0, express_1.Router)();
// GET /api/contact-access/:profileId - Check if caller can see contact details of target profile
router.get('/:profileId', authMiddleware_1.optionalAuth, contactRequestController_1.getContactAccessStatus);
exports.default = router;
//# sourceMappingURL=contactAccessRoutes.js.map