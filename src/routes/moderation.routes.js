const express = require('express');
const router = express.Router();
const { reportContent, blockUser } = require('../controllers/moderation.controller');
const verifyToken = require('../middleware/auth.middleware');

router.post('/report', verifyToken, reportContent);
router.post('/block', verifyToken, blockUser);

module.exports = router;
