// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const verifyToken = require('../middleware/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/users/:id/roles', verifyToken, authController.updateRoles);

router.get('/profile', verifyToken, (req, res) => {
  res.status(200).json({
    message: 'Perfil accedido correctamente',
    user: req.user,
  });
});

module.exports = router;
