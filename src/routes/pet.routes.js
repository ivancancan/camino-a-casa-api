const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth.middleware');
const petController = require('../controllers/pet.controller');

router.post('/', verifyToken, petController.createPet);
router.get('/mine', verifyToken, petController.getMyPets);
router.get('/mine/with-interest', verifyToken, petController.getMyPetsWithInterest); // ✅ Nueva ruta
router.put('/:id', verifyToken, petController.updatePet);
router.delete('/:id', verifyToken, petController.deletePet);

module.exports = router;
