const express = require('express');
const router = express.Router();
const giverController = require('../controllers/giver.controller');
const verifyToken = require('../middleware/auth.middleware');

// 👉 Agrega multer para subir imágenes
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Ver interesados en una mascota
router.get('/pet/:petId/interested', verifyToken, giverController.getInterestedAdopters);

// Aceptar o rechazar a un interesado
router.post('/swipe', verifyToken, giverController.respondToSwipe);

// Obtener perfil del giver
router.get('/profile', verifyToken, giverController.getGiverProfile);

// Guardar/actualizar perfil del giver
router.post('/profile', verifyToken, giverController.saveGiverProfile);

// Subir foto de perfil del giver (✅ con multer)
router.post('/upload-photo', verifyToken, upload.single('image'), giverController.uploadPhoto);

module.exports = router;
