const express = require('express');
const { fetchHospitals } = require('../controllers/hospitalController');
const router = express.Router();
router.get('/', fetchHospitals);
module.exports = router;
