const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');

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
router.post('/upload-photo', verifyToken, uploadAdopterPhoto);

module.exports = router;
