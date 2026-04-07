const { getNearbyHospitals } = require('../services/hospitalService');

async function fetchHospitals(req, res) {
  const { lat, lng, search } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  try {
    let hospitals = await getNearbyHospitals(parseFloat(lat), parseFloat(lng));
    if (search) {
      const q = search.toLowerCase();
      hospitals = hospitals.filter((h) => h.name.toLowerCase().includes(q));
    }
    res.json(hospitals);
  } catch (err) {
    console.error('Hospital fetch error:', err.message);
    res.json([]); // never crash — return empty array
  }
}

module.exports = { fetchHospitals };
