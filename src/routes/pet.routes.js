const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth.middleware');
const petController = require('../controllers/pet.controller');

router.post('/', verifyToken, petController.createPet);
router.get('/mine', verifyToken, petController.getMyPets);
router.get('/mine/with-interest', verifyToken, petController.getMyPetsWithInterest);
router.put('/:id', verifyToken, petController.updatePet);
router.delete('/:id', verifyToken, petController.deletePet);
router.patch('/:id/mark-adopted', verifyToken, petController.markAsAdopted);
router.patch('/:id/mark-available', verifyToken, petController.markAsAvailable);

// Subida de imagen
router.post('/upload-photo', verifyToken, petController.uploadPetPhoto);

// ✅ Nueva ruta para eliminar una foto
router.post('/delete-photo', verifyToken, petController.deletePetPhoto);

module.exports = router;
