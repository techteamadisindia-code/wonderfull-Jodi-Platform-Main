import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  sendMessage,
  getUserConversations,
  getConversationMessagesForUser,
  initiateConversation,
} from '../controllers/messageController';

const router = Router();

// All message and conversation routes require authentication
router.use(requireAuth);

// Dedicated conversation initiation endpoints
router.post('/initiate', initiateConversation);
router.post('/conversations/initiate', initiateConversation);
router.post('/conversations', initiateConversation);

// Handles both /api/messages/conversations and /api/conversations (GET list)
router.get('/conversations', getUserConversations);
router.get('/', getUserConversations);

// Handles /api/conversations/:id and /api/conversations/:id/messages
router.get('/conversations/:id', getConversationMessagesForUser);
router.get('/conversations/:id/messages', getConversationMessagesForUser);
router.get('/:id', getConversationMessagesForUser);
router.get('/:id/messages', getConversationMessagesForUser);

// Handles /api/conversations/:id/messages POST
router.post('/conversations/:id/messages', (req, res, next) => {
  req.body.conversationId = req.params.id;
  sendMessage(req, res, next);
});
router.post('/:id/messages', (req, res, next) => {
  req.body.conversationId = req.params.id;
  sendMessage(req, res, next);
});

// Root POST handler:
// If request has receiver/target identification but no text content, treat as initiateConversation
// Otherwise treat as sendMessage
router.post('/', (req, res, next) => {
  if (!req.body?.content && (req.body?.targetUserId || req.body?.receiverId || req.body?.profileId)) {
    return initiateConversation(req, res, next);
  }
  return sendMessage(req, res, next);
});

export default router;
