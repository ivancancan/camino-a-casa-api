const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  saveAdopterProfile,
  hasAdopterProfile,
  getAdopterProfile,
  updateAdopterDescription,
  uploadAdopterPhoto,
} = require('../controllers/adopter.controller');

// Rutas del perfil del adoptante
router.post('/profile', verifyToken, saveAdopterProfile);
router.get('/profile', verifyToken, getAdopterProfile);
router.get('/has-profile', verifyToken, hasAdopterProfile);
router.post('/profile/motivation', verifyToken, updateAdopterDescription);

// Subida de imagen con multer ✅
router.post('/upload-photo', verifyToken, upload.single('image'), uploadAdopterPhoto);

module.exports = router;
