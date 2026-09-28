"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(authMiddleware_1.requireAuth);
router.get('/', notificationController_1.getNotifications);
router.get('/unread-count', notificationController_1.getUnreadCount);
router.patch('/read-all', notificationController_1.markAllNotificationsRead);
router.put('/read-all', notificationController_1.markAllNotificationsRead);
router.patch('/:id/read', notificationController_1.markNotificationRead);
router.put('/:id/read', notificationController_1.markNotificationRead);
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map