import { useState, useRef, useCallback, useEffect } from 'react';
import { createAccident, getAccidents, resolveAccident } from '../services/api';
import { useVoice } from './useVoice';

// Severity-based detection radius (km)
const THRESHOLD = { HIGH: 0.8, MEDIUM: 0.6, LOW: 0.4 };
const BOOST_AHEAD_KM = { HIGH: 1.5, MEDIUM: 1.2, LOW: 1.0 };

// Tiered alert distances (km)
const ALERT_FAR  = 1.5;
const ALERT_NEAR = 0.5;

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// null | 'far' | 'near' | 'cleared'
export function useAccident(onAlert, routeId) {
  const [accidents, setAccidents]           = useState([]);
  const [activeAccident, setActiveAccident] = useState(null);
  const [severity, setSeverity]             = useState('MEDIUM');
  // Driver-facing status: null | 'far' | 'near' | 'cleared'
  const [accidentAlertStatus, setAccidentAlertStatus] = useState(null);

  const alertedFar    = useRef(new Set());
  const alertedNear   = useRef(new Set());
  const wasActive     = useRef(null); // track previous activeAccident id
  const { speak }     = useVoice();

  // Reload accidents scoped to current route; clear on route change
  useEffect(() => {
    setAccidents([]);
    setActiveAccident(null);
    setAccidentAlertStatus(null);
    alertedFar.current.clear();
    alertedNear.current.clear();
    wasActive.current = null;
    if (routeId) {
      getAccidents(routeId).then(setAccidents).catch(() => {});
    }
  }, [routeId]);

  const addAccident = useCallback(async (lat, lng) => {
    if (!routeId) {
      onAlert('Generate route to enable accident simulation', 'error');
      return;
    }
    try {
      const acc = await createAccident(lat, lng, severity, routeId);
      setAccidents((prev) => [acc, ...prev]);
      onAlert(`⚠️ Accident placed on route (${severity} severity)`, 'warning');
      return acc;
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to create accident';
      onAlert(msg, 'error');
    }
  }, [severity, routeId, onAlert]);

  // Admin-only: pick random point from middle 60% of route
  const simulateOnRoute = useCallback(async (routeCoords) => {
    if (!routeId || !routeCoords?.length) {
      onAlert('Generate route to enable accident simulation', 'error');
      return;
    }
    const s = Math.floor(routeCoords.length * 0.2);
    const e = Math.floor(routeCoords.length * 0.8);
    const point = routeCoords[s + Math.floor(Math.random() * (e - s))];
    const [lat, lng] = Array.isArray(point) ? point : [point.lat, point.lng];
    return addAccident(lat, lng);
  }, [addAccident, routeId, onAlert]);

  const removeAccident = useCallback(async (id) => {
    try {
      await resolveAccident(id);
      setAccidents((prev) => prev.filter((a) => a._id !== id));
      if (activeAccident?._id === id) {
        setActiveAccident(null);
        setAccidentAlertStatus(null);
      }
      alertedFar.current.delete(id);
      alertedNear.current.delete(id);
    } catch (_) {}
  }, [activeAccident]);

  // Called every simulation step — returns boosted green corridor km or null
  const checkAccidents = useCallback((ambulanceLat, ambulanceLng) => {
    let boostedAheadKm = null;
    let nearestAcc     = null;

    for (const acc of accidents) {
      const dist      = haversine(ambulanceLat, ambulanceLng, acc.lat, acc.lng);
      const threshold = THRESHOLD[acc.severity] || THRESHOLD.MEDIUM;

      if (dist <= threshold) {
        nearestAcc     = acc;
        boostedAheadKm = BOOST_AHEAD_KM[acc.severity] || BOOST_AHEAD_KM.MEDIUM;

        // 500 m alert (highest priority — fires once per accident)
        if (!alertedNear.current.has(acc._id)) {
          alertedNear.current.add(acc._id);
          const msg = 'Accident ahead, 500 metres. Clearing traffic now.';
          speak(msg);
          onAlert('🚨 Accident ahead – 500 m · Clearing traffic', 'error');
          setAccidentAlertStatus('near');
        }
        break;
      } else if (dist <= ALERT_FAR) {
        nearestAcc = acc;

        // 1.5 km early warning (fires once per accident)
        if (!alertedFar.current.has(acc._id)) {
          alertedFar.current.add(acc._id);
          speak('Accident ahead in 1.5 kilometres. Prepare to slow down.');
          onAlert('⚠️ Accident ahead – 1.5 km · Prepare to slow down', 'warning');
          setAccidentAlertStatus('far');
        }
        break;
      }
    }

    // Cleared: was active, now no longer in range
    if (wasActive.current && !nearestAcc) {
      speak('Accident cleared. Resume normal speed.');
      onAlert('✅ Accident cleared – resuming normal corridor', 'success');
      setAccidentAlertStatus('cleared');
      // Reset cleared status after 4 s so it doesn't linger
      setTimeout(() => setAccidentAlertStatus(null), 4000);
    }

    wasActive.current = nearestAcc?._id ?? null;
    setActiveAccident(nearestAcc);
    return boostedAheadKm;
  }, [accidents, speak, onAlert]);

  return {
    accidents, activeAccident, severity, accidentAlertStatus,
    setSeverity,
    simulateOnRoute, removeAccident, checkAccidents,
  };
}
