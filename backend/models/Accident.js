const mongoose = require('mongoose');

const accidentSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Accident', accidentSchema);
