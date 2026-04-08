const Accident = require('../models/Accident');
const Route = require('../models/Route');

async function createAccident(req, res) {
  try {
    // Only admin role may create accidents
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create accident zones' });
    }

    const { lat, lng, severity, routeId } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
    if (!routeId) return res.status(400).json({ error: 'Please generate route first' });

    const route = await Route.findById(routeId).lean();
    if (!route) return res.status(400).json({ error: 'Route not found. Please generate route first' });

    const accident = await Accident.create({ lat, lng, severity: severity || 'MEDIUM', routeId });
    res.status(201).json(accident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAccidents(req, res) {
  try {
    const filter = { active: true };
    if (req.query.routeId) filter.routeId = req.query.routeId;
    const accidents = await Accident.find(filter).sort({ createdAt: -1 }).lean();
    res.json(accidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function resolveAccident(req, res) {
  try {
    const accident = await Accident.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!accident) return res.status(404).json({ error: 'Not found' });
    res.json(accident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createAccident, getAccidents, resolveAccident };
