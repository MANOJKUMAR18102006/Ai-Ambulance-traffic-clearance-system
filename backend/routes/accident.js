const express = require('express');
const { createAccident, getAccidents, resolveAccident } = require('../controllers/accidentController');
const router = express.Router();

router.post('/', createAccident);
router.get('/', getAccidents);
router.put('/:id/resolve', resolveAccident);

module.exports = router;
