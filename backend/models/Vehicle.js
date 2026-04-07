const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  vehicleId: String,
  lat: Number,
  lng: Number,
  offsetLat: { type: Number, default: 0 },
  offsetLng: { type: Number, default: 0 },
  cleared: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
