"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const shortlistController_1 = require("../controllers/shortlistController");
const router = (0, express_1.Router)();
router.post('/', authMiddleware_1.requireAuth, shortlistController_1.addShortlist);
router.delete('/:profileId', authMiddleware_1.requireAuth, (0, validationMiddleware_1.validateObjectIdParam)('profileId'), shortlistController_1.removeShortlist);
router.get('/', authMiddleware_1.requireAuth, shortlistController_1.getShortlisted);
exports.default = router;
//# sourceMappingURL=shortlistRoutes.js.map