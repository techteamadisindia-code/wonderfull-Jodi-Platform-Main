"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const messageController_1 = require("../controllers/messageController");
const router = (0, express_1.Router)();
// All message and conversation routes require authentication
router.use(authMiddleware_1.requireAuth);
// Dedicated conversation initiation endpoints
router.post('/initiate', messageController_1.initiateConversation);
router.post('/conversations/initiate', messageController_1.initiateConversation);
router.post('/conversations', messageController_1.initiateConversation);
// Handles both /api/messages/conversations and /api/conversations (GET list)
router.get('/conversations', messageController_1.getUserConversations);
router.get('/', messageController_1.getUserConversations);
// Handles /api/conversations/:id and /api/conversations/:id/messages
router.get('/conversations/:id', messageController_1.getConversationMessagesForUser);
router.get('/conversations/:id/messages', messageController_1.getConversationMessagesForUser);
router.get('/:id', messageController_1.getConversationMessagesForUser);
router.get('/:id/messages', messageController_1.getConversationMessagesForUser);
// Handles /api/conversations/:id/messages POST
router.post('/conversations/:id/messages', (req, res, next) => {
    req.body.conversationId = req.params.id;
    (0, messageController_1.sendMessage)(req, res, next);
});
router.post('/:id/messages', (req, res, next) => {
    req.body.conversationId = req.params.id;
    (0, messageController_1.sendMessage)(req, res, next);
});
// Root POST handler:
// If request has receiver/target identification but no text content, treat as initiateConversation
// Otherwise treat as sendMessage
router.post('/', (req, res, next) => {
    if (!req.body?.content && (req.body?.targetUserId || req.body?.receiverId || req.body?.profileId)) {
        return (0, messageController_1.initiateConversation)(req, res, next);
    }
    return (0, messageController_1.sendMessage)(req, res, next);
});
exports.default = router;
//# sourceMappingURL=messageRoutes.js.map