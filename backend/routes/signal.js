const express = require('express');
const { getSignals, updateSignal, updateSignalsByPosition } = require('../controllers/signalController');
const router = express.Router();

router.get('/', getSignals);
router.put('/:id', updateSignal);
router.post('/', updateSignalsByPosition);

module.exports = router;
