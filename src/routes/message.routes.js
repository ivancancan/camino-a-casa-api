// src/routes/message.routes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const verifyToken = require('../middleware/auth.middleware');

router.post('/', verifyToken, messageController.sendMessage);
router.get('/conversations/:id/messages', verifyToken, messageController.getMessages);
router.get('/conversations', verifyToken, messageController.getConversationsForUser);


module.exports = router;
