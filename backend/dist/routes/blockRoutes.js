"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const blockController_1 = require("../controllers/blockController");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const router = (0, express_1.Router)();
router.post('/', authMiddleware_1.requireAuth, blockController_1.blockUser);
router.delete('/:blockedUserId', authMiddleware_1.requireAuth, (0, validationMiddleware_1.validateObjectIdParam)('blockedUserId'), blockController_1.unblockUser);
router.get('/', authMiddleware_1.requireAuth, blockController_1.getBlockedUsers);
exports.default = router;
//# sourceMappingURL=blockRoutes.js.map