"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const reportController_1 = require("../controllers/reportController");
const router = (0, express_1.Router)();
// Authenticated users can submit reports against inappropriate accounts / messages
router.post('/', authMiddleware_1.requireAuth, reportController_1.submitReport);
router.get('/my-reports', authMiddleware_1.requireAuth, reportController_1.getMyReports);
exports.default = router;
//# sourceMappingURL=reportRoutes.js.map