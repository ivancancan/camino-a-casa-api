const express = require('express');
const router = express.Router();
const giverController = require('../controllers/giver.controller');
const verifyToken = require('../middleware/auth.middleware');

// Ver interesados en una mascota
router.get('/pet/:petId/interested', verifyToken, giverController.getInterestedAdopters);

// Aceptar o rechazar a un interesado
router.post('/swipe', verifyToken, giverController.respondToSwipe);

// Subir foto de mascota o de perfil (usa express-fileupload middleware global)
router.post('/upload-pet-photo', verifyToken, giverController.uploadPetPhoto);

// Obtener perfil del giver (foto, etc.)
router.get('/profile', verifyToken, giverController.getGiverProfile);

// Guardar/actualizar perfil del giver (foto)
router.post('/profile', verifyToken, giverController.saveGiverProfile);

const upload = require('../middleware/upload.middleware');

router.post(
  '/upload-photo',
  verifyToken,
  upload.single('file'),
  giverController.uploadPhoto
);

module.exports = router;
