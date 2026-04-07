const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  start: { lat: Number, lng: Number },
  end: { lat: Number, lng: Number },
  distance: String,
  duration: Number,
  traffic: String,
  coords: [[Number]],
  signals: [{ id: String, lat: Number, lng: Number, status: String }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Route', routeSchema);
