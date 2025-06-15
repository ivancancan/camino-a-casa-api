const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth.middleware');
const messageController = require('../controllers/message.controller');

// Enviar un mensaje
router.post('/', verifyToken, messageController.sendMessage);

// ✅ Primero todas las rutas que empiezan con /user
router.get('/user/conversations', verifyToken, messageController.getConversationsForUser);
router.get('/user/unread-count', verifyToken, messageController.getUnreadMessagesCount);
router.get('/user/unread-by-conversation', verifyToken, messageController.getUnreadCountsByConversation);

// ✅ Luego las rutas dinámicas (con IDs)
router.get('/:id', verifyToken, messageController.getMessages);
router.put('/:conversationId/mark-read', verifyToken, messageController.markMessagesAsRead);

module.exports = router;
