const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const authenticateUser = require('../middleware/auth.middleware');

// Ruta para obtener matches confirmados del rol 'giver'
router.get('/giver/confirmed', authenticateUser, matchController.getConfirmedMatchesForGiver);

module.exports = router;
