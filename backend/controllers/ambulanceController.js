const Ambulance = require('../models/Ambulance');

// Admin: get all ambulances
async function getAllAmbulances(req, res) {
  try {
    const ambulances = await Ambulance.find().lean();
    res.json(ambulances);
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

// Driver: update status and location
async function updateAmbulance(req, res) {
  try {
    const { status, location, destination, eta } = req.body;
    const update = { updatedAt: new Date() };
    if (status) update.status = status;
    if (location) update.location = location;
    if (destination) update.destination = destination;
    if (eta !== undefined) update.eta = eta;

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
