const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  signalId: { type: String, required: true },
  lat: Number,
  lng: Number,
  status: { type: String, enum: ['red', 'yellow', 'green'], default: 'red' },
  trafficDensity: { type: String, enum: ['low', 'medium', 'high', 'none'], default: 'low' },
  greenDuration: { type: Number, default: 10 },
  queueLength: { type: Number, default: 0 },
  isVirtual: { type: Boolean, default: false },
  clearanceRadius: { type: Number, default: 300 },
  inTrafficZone: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Signal', signalSchema);
