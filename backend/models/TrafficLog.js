const mongoose = require('mongoose');

const trafficLogSchema = new mongoose.Schema({
  level: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TrafficLog', trafficLogSchema);
