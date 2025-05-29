const express = require('express');
const router = express.Router();
const giverController = require('../controllers/giver.controller');
const verifyToken = require('../middleware/auth.middleware');

// Ver interesados en una mascota
router.get('/pet/:petId/interested', verifyToken, giverController.getInterestedAdopters);

// Aceptar o rechazar a un interesado
router.post('/swipe', verifyToken, giverController.respondToSwipe);

module.exports = router;
