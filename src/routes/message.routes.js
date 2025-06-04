// src/routes/message.routes.js

const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth.middleware');
const messageController = require('../controllers/message.controller');

// Enviar un mensaje
router.post('/', verifyToken, messageController.sendMessage);

// Obtener todos los mensajes de una conversación específica
router.get('/:id', verifyToken, messageController.getMessages); // usa 'id' según tu controller

// Obtener todas las conversaciones activas para el usuario autenticado
router.get('/user/conversations', verifyToken, messageController.getConversationsForUser);

// Obtener el conteo total de mensajes no leídos
router.get('/user/unread-count', verifyToken, messageController.getUnreadMessagesCount);

// Obtener conteo de mensajes no leídos por conversación
router.get('/user/unread-by-conversation', verifyToken, messageController.getUnreadCountsByConversation);

// Marcar mensajes como leídos en una conversación específica
router.put('/:conversationId/mark-read', verifyToken, messageController.markMessagesAsRead);

module.exports = router;
