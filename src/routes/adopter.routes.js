const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage }); // 👈 sin fileFilter

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

// ✅ Subida de foto sin errores
router.post('/upload-photo', verifyToken, upload.any(), uploadAdopterPhoto);

module.exports = router;
