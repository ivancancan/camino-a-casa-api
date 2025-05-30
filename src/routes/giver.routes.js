const express = require('express');
const router = express.Router();
const giverController = require('../controllers/giver.controller');
const verifyToken = require('../middleware/auth.middleware');

// Ver interesados en una mascota
router.get('/pet/:petId/interested', verifyToken, giverController.getInterestedAdopters);

// Aceptar o rechazar a un interesado
router.post('/swipe', verifyToken, giverController.respondToSwipe);

// Subir foto de mascota (usa express-fileupload middleware global)
router.post('/upload-pet-photo', verifyToken, giverController.uploadPetPhoto);

module.exports = router;
