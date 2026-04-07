const axios = require('axios');

const ORS_BASE = 'https://api.openrouteservice.org/v2';

function parseGeoJSON(feature) {
  const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const seg = feature.properties.segments[0];
  const steps = (seg.steps || []).map((s) => ({
    instruction: s.instruction,
    distance: parseFloat((s.distance / 1000).toFixed(2)),
    duration: Math.round(s.duration / 60),
    wayPoint: s.way_points[0],
    type: s.type,
  }));
  return {
    coords,
    distance: parseFloat((seg.distance / 1000).toFixed(2)),
    duration: Math.round(seg.duration / 60),
    steps,
  };
}

function parseDirections(data) {
  const feature = data.features[0];
  return parseGeoJSON(feature);
}

async function getRoute(startLng, startLat, endLng, endLat) {
  const key = process.env.ORS_API_KEY;

  // Primary: POST geojson endpoint with Bearer token
  try {
    const { data } = await axios.post(
      `${ORS_BASE}/directions/driving-car/geojson`,
      { coordinates: [[startLng, startLat], [endLng, endLat]], instructions: true },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return parseDirections(data);
  } catch (err) {
    console.warn('ORS POST failed:', err.response?.data?.error?.message || err.message);
  }

  // Fallback: POST without Bearer (raw key)
  try {
    const { data } = await axios.post(
      `${ORS_BASE}/directions/driving-car/geojson`,
      { coordinates: [[startLng, startLat], [endLng, endLat]], instructions: true },
      {
        headers: {
          Authorization: key,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return parseDirections(data);
  } catch (err) {
    console.warn('ORS POST (no Bearer) failed:', err.response?.data?.error?.message || err.message);
  }

  // Fallback: GET endpoint with api_key param
  try {
    const { data } = await axios.get(`${ORS_BASE}/directions/driving-car`, {
      params: {
        api_key: key,
        start: `${startLng},${startLat}`,
        end: `${endLng},${endLat}`,
      },
      timeout: 15000,
    });
    return parseDirections(data);
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('ORS GET failed:', msg);
    throw new Error(`ORS routing failed: ${msg}`);
  }
}

module.exports = { getRoute };
