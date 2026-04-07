const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  signalId: { type: String, required: true },
  lat: Number,
  lng: Number,
  status: { type: String, enum: ['red', 'green'], default: 'red' },
  trafficDensity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  greenDuration: { type: Number, default: 10 }, // seconds to stay green
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Signal', signalSchema);
