const { getRoute } = require('../services/orsService');
const { getTrafficLevel, generateSignalsOnRoute, generateTrafficZones, generateVehicles } = require('../services/aiService');
const Route = require('../models/Route');
const Signal = require('../models/Signal');

async function fetchRoute(req, res) {
  try {
    const { start, end } = req.body;
    if (!start || !end) return res.status(400).json({ error: 'start and end required' });

    const { lat: startLat, lng: startLng } = start;
    const { lat: endLat, lng: endLng } = end;

    const route = await getRoute(startLng, startLat, endLng, endLat);
    const traffic = getTrafficLevel();
    const signals = generateSignalsOnRoute(route.coords);
    const trafficZones = generateTrafficZones(route.coords);
    const vehicles = generateVehicles(route.coords);

    const saved = await Route.create({
      start: { lat: startLat, lng: startLng },
      end: { lat: endLat, lng: endLng },
      distance: String(route.distance),
      duration: route.duration,
      traffic,
      coords: route.coords,
      signals,
    });

    await Signal.insertMany(
      signals.map((s) => ({
        routeId: saved._id,
        signalId: s.id,
        lat: s.lat,
        lng: s.lng,
        status: s.status,
        trafficDensity: s.trafficDensity,
        greenDuration: s.greenDuration,
      }))
    ).catch(() => {});

    res.json({
      coords: route.coords,
      distance: route.distance,
      duration: route.duration,
      steps: route.steps,
      traffic,
      signals,
      trafficZones,
      vehicles,
      routeId: saved._id,
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('Route error:', JSON.stringify(detail));
    res.status(500).json({ error: 'Failed to fetch route', details: typeof detail === 'object' ? JSON.stringify(detail) : detail });
  }
}

module.exports = { fetchRoute };
