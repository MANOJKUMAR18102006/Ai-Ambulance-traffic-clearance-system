const TRAFFIC_LEVELS = ['low', 'medium', 'high'];

function getTrafficLevel() {
  const hour = new Date().getHours();
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) return 'high';
  if ((hour >= 7 && hour < 8) || (hour >= 10 && hour < 12) || (hour >= 16 && hour < 17)) return 'medium';
  return TRAFFIC_LEVELS[Math.floor(Math.random() * 3)];
}

/*
  Pre-clearance distance by density:
  HIGH   → start clearing 3 km ahead (long queue, needs time to clear)
  MEDIUM → start clearing 2 km ahead
  LOW    → start clearing 1 km ahead (no queue, immediate green)
  NONE   → virtual signal, immediate green at 0.5 km
*/
const PRE_CLEAR_KM = { high: 3.0, medium: 2.0, low: 1.0, none: 0.5 };

// Extra green hold time after ambulance passes (seconds simulated as ms)
const GREEN_HOLD_MS = { high: 6000, medium: 3000, low: 1000, none: 500 };

function generateSignalsOnRoute(routeCoords) {
  if (!routeCoords || routeCoords.length < 2) return [];
  const signals = [];
  const step = Math.max(1, Math.floor(routeCoords.length / 6));
  const densities = ['low', 'medium', 'high'];
  for (let i = step; i < routeCoords.length - 1; i += step) {
    const density = densities[Math.floor(Math.random() * densities.length)];
    // Estimate queue length: high=12 vehicles, medium=6, low=2
    const queueLength = density === 'high' ? 12 : density === 'medium' ? 6 : 2;
    signals.push({
      id: `sig_${i}`,
      lat: routeCoords[i][0],
      lng: routeCoords[i][1],
      status: 'red',
      trafficDensity: density,
      queueLength,
      greenDuration: density === 'high' ? 15 : density === 'medium' ? 10 : 6,
      isVirtual: false,
    });
  }
  return signals;
}

// Generate virtual signals at midpoints between real signals (uncontrolled intersections)
function generateVirtualSignals(routeCoords, realSignals) {
  if (!routeCoords || realSignals.length < 2) return [];
  const virtuals = [];
  for (let i = 0; i < realSignals.length - 1; i++) {
    const a = realSignals[i];
    const b = realSignals[i + 1];
    const midLat = (a.lat + b.lat) / 2;
    const midLng = (a.lng + b.lng) / 2;
    virtuals.push({
      id: `vsig_${i}`,
      lat: midLat,
      lng: midLng,
      status: 'red',
      trafficDensity: 'none',
      queueLength: 0,
      greenDuration: 3,
      isVirtual: true,
    });
  }
  return virtuals;
}

function generateTrafficZones(routeCoords) {
  if (!routeCoords || routeCoords.length < 10) return [];
  const zones = [];
  const count = Math.random() > 0.4 ? 2 : 1;
  const used = new Set();
  for (let z = 0; z < count; z++) {
    let start;
    do { start = Math.floor(Math.random() * (routeCoords.length - 6)) + 2; } while (used.has(start));
    used.add(start);
    const end = Math.min(start + Math.floor(routeCoords.length * 0.12) + 3, routeCoords.length - 1);
    zones.push({
      id: `zone_${z}`,
      level: 'high',
      segmentCoords: routeCoords.slice(start, end + 1),
      startIdx: start,
      endIdx: end,
    });
  }
  return zones;
}

function generateVehicles(routeCoords) {
  if (!routeCoords || routeCoords.length < 4) return [];
  const vehicles = [];
  const step = Math.max(1, Math.floor(routeCoords.length / 8));
  for (let i = step; i < routeCoords.length - 1; i += step) {
    const side = Math.random() > 0.5 ? 1 : -1;
    vehicles.push({
      id: `veh_${i}`,
      lat: routeCoords[i][0] + (Math.random() * 0.0003 * side),
      lng: routeCoords[i][1] + (Math.random() * 0.0003),
      cleared: false,
      offsetLat: 0,
      offsetLng: 0,
    });
  }
  return vehicles;
}

/*
  Traffic-aware signal state computation:
  - Each signal has its own pre-clearance distance based on density
  - HIGH density → green starts 3km ahead to allow queue to clear
  - Signal turns RED 100m after ambulance passes
*/
function computeSignalStates(signals, ambulanceLat, ambulanceLng) {
  return signals.map((sig) => {
    const dist = haversine(ambulanceLat, ambulanceLng, sig.lat, sig.lng);
    const preClearKm = PRE_CLEAR_KM[sig.trafficDensity] || PRE_CLEAR_KM.low;
    const status = dist <= preClearKm ? 'green' : 'red';
    return { ...sig, status };
  });
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  getTrafficLevel,
  generateSignalsOnRoute,
  generateVirtualSignals,
  generateTrafficZones,
  generateVehicles,
  computeSignalStates,
  PRE_CLEAR_KM,
  haversine,
};
