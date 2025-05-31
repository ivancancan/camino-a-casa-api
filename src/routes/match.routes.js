const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const authenticateUser = require('../middleware/auth.middleware');

router.get('/giver/confirmed', authenticateUser, matchController.getConfirmedMatchesForGiver);
router.get('/adopter/confirmed', authenticateUser, matchController.getConfirmedMatchesForAdopter);

module.exports = router;
