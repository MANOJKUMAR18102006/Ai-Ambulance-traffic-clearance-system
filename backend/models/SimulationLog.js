const mongoose = require('mongoose');

const simulationLogSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  ambulanceLat: Number,
  ambulanceLng: Number,
  signals: [{ id: String, lat: Number, lng: Number, status: String }],
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SimulationLog', simulationLogSchema);
