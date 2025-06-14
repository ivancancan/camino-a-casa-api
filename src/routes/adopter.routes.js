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

router.post('/profile', verifyToken, saveAdopterProfile);
router.get('/profile', verifyToken, getAdopterProfile);
router.get('/has-profile', verifyToken, hasAdopterProfile);
router.post('/profile/motivation', verifyToken, updateAdopterDescription);

// 👇 CAMBIA esto:
router.post('/upload-photo', verifyToken, upload.single('foto'), uploadAdopterPhoto);

module.exports = router;
