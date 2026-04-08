const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  ambulanceId: { type: String, required: true, unique: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverName: String,
  status: { type: String, enum: ['IDLE', 'EMERGENCY', 'ON_DUTY'], default: 'IDLE' },
  location: { lat: { type: Number, default: 0 }, lng: { type: Number, default: 0 } },
  destination: { lat: { type: Number, default: 0 }, lng: { type: Number, default: 0 } },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  eta: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ambulance', ambulanceSchema);
