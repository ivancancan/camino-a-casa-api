// src/routes/message.routes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const verifyToken = require('../middleware/auth.middleware');

// Enviar mensaje
router.post('/', verifyToken, messageController.sendMessage);

// Obtener mensajes de una conversación
router.get('/conversations/:id/messages', verifyToken, messageController.getMessages);

// Obtener todas las conversaciones del usuario
router.get('/conversations', verifyToken, messageController.getConversationsForUser);

// Contar mensajes no leídos global
router.get('/unread-count', verifyToken, messageController.getUnreadMessagesCount);

// Marcar como leídos los mensajes de una conversación
router.patch(
  '/conversations/:conversationId/mark-read',
  verifyToken,
  messageController.markMessagesAsRead
);

// Contador de mensajes no leídos por conversación (para burbujas/badges)
router.get('/unread-counts', verifyToken, messageController.getUnreadCountsByConversation);

module.exports = router;
