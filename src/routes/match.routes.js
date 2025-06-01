const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const authenticateUser = require('../middleware/auth.middleware');

router.get('/giver/confirmed', authenticateUser, matchController.getConfirmedMatchesForGiver);
router.get('/adopter/confirmed', authenticateUser, matchController.getConfirmedMatchesForAdopter);
router.post('/create-conversation/:matchId', authenticateUser, matchController.createConversationIfNotExists);
router.get('/unseen-count', authenticateUser, matchController.getUnseenMatchesCount);
router.patch('/mark-seen', authenticateUser, matchController.markMatchesAsSeen);



module.exports = router;
