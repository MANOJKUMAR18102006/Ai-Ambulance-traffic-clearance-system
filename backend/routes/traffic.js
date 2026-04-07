const express = require('express');
const { fetchTraffic } = require('../controllers/trafficController');
const router = express.Router();
router.get('/', fetchTraffic);
module.exports = router;
