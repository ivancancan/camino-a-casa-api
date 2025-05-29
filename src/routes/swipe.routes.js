const express = require('express');
const router = express.Router();
const swipeController = require('../controllers/swipe.controller');
const verifyToken = require('../middleware/auth.middleware'); // ✅

router.post('/', verifyToken, swipeController.registerSwipe); // ✅ protegido
router.get('/suggestions', verifyToken, swipeController.getSuggestions);
router.get('/interested/:petId', verifyToken, swipeController.getInterestedUsers);
router.post('/confirm-match', verifyToken, swipeController.confirmMatch);



module.exports = router;
