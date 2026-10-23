"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(authMiddleware_1.requireAuth);
router.get('/', notificationController_1.getNotifications);
router.get('/unread-count', notificationController_1.getUnreadCount);
router.patch('/read-all', notificationController_1.markAllNotificationsRead);
router.put('/read-all', notificationController_1.markAllNotificationsRead);
router.patch('/:id/read', (0, validationMiddleware_1.validateObjectIdParam)('id'), notificationController_1.markNotificationRead);
router.put('/:id/read', (0, validationMiddleware_1.validateObjectIdParam)('id'), notificationController_1.markNotificationRead);
router.delete('/:id', (0, validationMiddleware_1.validateObjectIdParam)('id'), notificationController_1.deleteNotification);
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map