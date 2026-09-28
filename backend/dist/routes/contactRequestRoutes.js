"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const contactRequestController_1 = require("../controllers/contactRequestController");
const router = (0, express_1.Router)();
// All contact request interactions require authentication
router.post('/', authMiddleware_1.requireAuth, contactRequestController_1.createContactRequest);
router.get('/', authMiddleware_1.requireAuth, contactRequestController_1.getContactRequests);
router.patch('/:id/accept', authMiddleware_1.requireAuth, contactRequestController_1.acceptContactRequest);
router.patch('/:id/decline', authMiddleware_1.requireAuth, contactRequestController_1.declineContactRequest);
exports.default = router;
//# sourceMappingURL=contactRequestRoutes.js.map