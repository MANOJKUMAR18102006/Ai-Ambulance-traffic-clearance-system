const Ambulance = require('../models/Ambulance');
const Route = require('../models/Route');

// Admin: get all ambulances with populated route (start, end, coords)
async function getAllAmbulances(req, res) {
  try {
    const ambulances = await Ambulance.find().lean();
    // Attach route data for ambulances that have an active routeId
    const withRoutes = await Promise.all(ambulances.map(async (amb) => {
      if (!amb.routeId) return amb;
      const route = await Route.findById(amb.routeId, 'start end coords distance duration').lean();
      return { ...amb, route: route || null };
    }));
    res.json(withRoutes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Driver: get own ambulance
async function getMyAmbulance(req, res) {
  try {
    const amb = await Ambulance.findOne({ driverId: req.user.id }).lean();
    if (!amb) return res.status(404).json({ error: 'Ambulance not found' });
    res.json(amb);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Driver: update status, location, routeId
async function updateAmbulance(req, res) {
  try {
    const { status, location, destination, eta, routeId } = req.body;
    const update = { updatedAt: new Date() };
    if (status) update.status = status;
    if (location) update.location = location;
    if (destination) update.destination = destination;
    if (eta !== undefined) update.eta = eta;
    if (routeId !== undefined) update.routeId = routeId || null;

    const amb = await Ambulance.findOneAndUpdate(
      { driverId: req.user.id },
      update,
      { new: true }
    );
    if (!amb) return res.status(404).json({ error: 'Ambulance not found' });
    res.json(amb);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAllAmbulances, getMyAmbulance, updateAmbulance };
