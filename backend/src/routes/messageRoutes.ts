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

router.post('/', sendMessage);
router.post('/initiate', initiateConversation);

// Handles both /api/messages/conversations and /api/conversations
router.get('/conversations', getUserConversations);
router.get('/', getUserConversations);

// Handles /api/messages/conversations/:id/messages and /api/conversations/:id/messages
router.get('/conversations/:id/messages', getConversationMessagesForUser);
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

export default router;
