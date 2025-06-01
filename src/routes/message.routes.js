// src/routes/message.routes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const verifyToken = require('../middleware/auth.middleware');

router.post('/', verifyToken, messageController.sendMessage);
router.get('/conversations/:id/messages', verifyToken, messageController.getMessages);
router.get('/conversations', verifyToken, messageController.getConversationsForUser);
router.get('/unread-count', verifyToken, messageController.getUnreadMessagesCount);
router.patch(
  '/conversations/:conversationId/mark-read',
  verifyToken,
  messageController.markMessagesAsRead
);
router.get('/unread-counts', verifyToken, messageController.getUnreadCountsByConversation);





module.exports = router;
