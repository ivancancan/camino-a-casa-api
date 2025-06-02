const express = require('express');
const router = express.Router();
const giverController = require('../controllers/giver.controller');
const verifyToken = require('../middleware/auth.middleware');

// Ver interesados en una mascota
router.get('/pet/:petId/interested', verifyToken, giverController.getInterestedAdopters);

// Aceptar o rechazar a un interesado
router.post('/swipe', verifyToken, giverController.respondToSwipe);

// Obtener perfil del giver
router.get('/profile', verifyToken, giverController.getGiverProfile);

// Guardar/actualizar perfil del giver
router.post('/profile', verifyToken, giverController.saveGiverProfile);

// Subir foto de perfil del giver
router.post('/upload-photo', verifyToken, giverController.uploadPhoto);

module.exports = router;
