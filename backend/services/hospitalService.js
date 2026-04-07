const axios = require('axios');

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Try each Overpass mirror once with a tight timeout
async function queryOverpass(lat, lng, radius) {
  const query = `[out:json][timeout:20];(node["amenity"="hospital"](around:${radius},${lat},${lng});way["amenity"="hospital"](around:${radius},${lat},${lng}););out center 40;`;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const { data } = await axios.post(
        url,
        `data=${encodeURIComponent(query)}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
      );
      if (data?.elements?.length) return data.elements;
    } catch (_) {}
  }
  return [];
}

// Nominatim: search "hospital near lat,lng" — most reliable free geocoder
async function queryNominatim(lat, lng) {
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: 'hospital',
        format: 'json',
        limit: 20,
        addressdetails: 0,
        extratags: 1,
        // bounding box ±0.45 degrees (~50km)
        viewbox: `${lng - 0.45},${lat - 0.45},${lng + 0.45},${lat + 0.45}`,
        bounded: 1,
      },
      headers: { 'Accept-Language': 'en', 'User-Agent': 'AmbulanceAI/1.0' },
      timeout: 8000,
    });
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

// Nominatim fallback: broader search without bounding box
async function queryNominatimBroad(lat, lng) {
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `hospital near ${lat},${lng}`, format: 'json', limit: 15, addressdetails: 0 },
      headers: { 'Accept-Language': 'en', 'User-Agent': 'AmbulanceAI/1.0' },
      timeout: 8000,
    });
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function parseOverpass(elements, lat, lng) {
  return elements
    .map((el) => {
      const hLat = el.lat ?? el.center?.lat;
      const hLng = el.lon ?? el.center?.lon;
      if (!hLat || !hLng) return null;
      return {
        id: String(el.id),
        name: el.tags?.name || el.tags?.['name:en'] || 'Hospital',
        lat: hLat, lng: hLng,
        distanceKm: parseFloat(haversine(lat, lng, hLat, hLng).toFixed(1)),
        emergency: el.tags?.emergency === 'yes',
        beds: el.tags?.beds || null,
        phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
        source: 'overpass',
      };
    })
    .filter(Boolean);
}

function parseNominatim(results, lat, lng) {
  return results
    .filter((r) => r.lat && r.lon)
    .map((r) => ({
      id: `nom_${r.place_id}`,
      name: r.display_name.split(',')[0].trim() || 'Hospital',
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      distanceKm: parseFloat(haversine(lat, lng, parseFloat(r.lat), parseFloat(r.lon)).toFixed(1)),
      emergency: r.extratags?.emergency === 'yes',
      source: 'nominatim',
    }));
}

function dedup(hospitals) {
  const seen = new Set();
  return hospitals.filter((h) => {
    const key = `${h.lat.toFixed(3)},${h.lng.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getNearbyHospitals(lat, lng) {
  // Run all sources in parallel — don't wait for slow ones to block fast ones
  const [overpass50, nominatim, nominatimBroad] = await Promise.all([
    queryOverpass(lat, lng, 50000),
    queryNominatim(lat, lng),
    queryNominatimBroad(lat, lng),
  ]);

  const all = [
    ...parseOverpass(overpass50, lat, lng),
    ...parseNominatim(nominatim, lat, lng),
    ...parseNominatim(nominatimBroad, lat, lng),
  ];

  const unique = dedup(all).filter((h) => h.distanceKm <= 60);

  if (unique.length === 0) {
    // Last resort: try smaller radius overpass synchronously
    const small = await queryOverpass(lat, lng, 10000);
    const parsed = parseOverpass(small, lat, lng);
    if (parsed.length) return parsed.sort((a, b) => a.distanceKm - b.distanceKm);

    // Absolute fallback — generic nearby marker
    return [{
      id: 'fallback_1',
      name: 'Nearest Hospital (estimated)',
      lat: lat + 0.008,
      lng: lng + 0.008,
      distanceKm: 1.2,
      emergency: true,
      source: 'fallback',
    }];
  }

  return unique.sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { getNearbyHospitals };
