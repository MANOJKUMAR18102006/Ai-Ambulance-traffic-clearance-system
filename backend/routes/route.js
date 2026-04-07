const express = require('express');
const { fetchRoute } = require('../controllers/routeController');
const router = express.Router();
router.post('/', fetchRoute);
module.exports = router;
