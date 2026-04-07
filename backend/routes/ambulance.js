const express = require('express');
const { getAllAmbulances, getMyAmbulance, updateAmbulance } = require('../controllers/ambulanceController');
const { verifyToken, allowAdmin, allowDriver } = require('../middleware/auth');
const router = express.Router();

router.get('/all', verifyToken, allowAdmin, getAllAmbulances);
router.get('/mine', verifyToken, allowDriver, getMyAmbulance);
router.put('/mine', verifyToken, allowDriver, updateAmbulance);

module.exports = router;
