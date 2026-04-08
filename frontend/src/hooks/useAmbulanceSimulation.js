import { useState, useRef, useCallback } from 'react';
import { updateSignals } from '../services/api';
import { useVoice } from './useVoice';

const RED_BEHIND_KM    = 0.1;  // revert to red 100m after passing
const PRIORITY_KM      = 1.0;  // full GREEN — ambulance priority range
const PRE_CLEAR_KM = {
  high:   3.0,
  medium: 2.0,
  low:    1.5,
  none:   0.8,
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function closestRouteIdx(coords, lat, lng) {
  let minD = Infinity, idx = 0;
  for (let i = 0; i < coords.length; i++) {
    const d = haversine(lat, lng, coords[i][0], coords[i][1]);
    if (d < minD) { minD = d; idx = i; }
  }
  return idx;
}

/*
  3-state corridor logic:
  AHEAD + dist <= PRIORITY_KM          → GREEN  (ambulance priority)
  AHEAD + dist <= preClearKm           → YELLOW (pre-clearing traffic)
  PASSED + dist > RED_BEHIND_KM        → RED    (restore normal)
*/
function computeCorridorSignals(signals, coords, ambulanceIdx, ambulanceLat, ambulanceLng, boostKm = 0) {
  return signals.map((sig) => {
    const sigIdx   = closestRouteIdx(coords, sig.lat, sig.lng);
    const dist     = haversine(ambulanceLat, ambulanceLng, sig.lat, sig.lng);
    const density  = sig.trafficDensity || 'low';
    const isAhead  = sigIdx > ambulanceIdx;
    const isPassed = sigIdx <= ambulanceIdx;
    const preClearKm = Math.max(PRE_CLEAR_KM[density] || PRE_CLEAR_KM.low, boostKm);

    if (isPassed && dist > RED_BEHIND_KM) return { ...sig, status: 'red' };
    if (isAhead && dist <= PRIORITY_KM)   return { ...sig, status: 'green' };
    if (isAhead && dist <= preClearKm)    return { ...sig, status: 'yellow' };
    return sig;
  });
}

function stepToVoice(step) {
  if (!step) return null;
  const t = step.type;
  if (t === 0) return 'Turn left';
  if (t === 1) return 'Turn right';
  if (t === 6 || t === 11) return 'Continue straight';
  if (t === 12) return 'You have arrived at your destination';
  return step.instruction.replace(/<[^>]+>/g, '');
}

export function useAmbulanceSimulation(routeData, signals, onSignalUpdate, onAlert, routeId, onVehicleUpdate, onAccidentCheck) {
  const [ambulancePos, setAmbulancePos]             = useState(null);
  const [stepIndex, setStepIndex]                   = useState(0);
  const [isRunning, setIsRunning]                   = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [preClearStatus, setPreClearStatus]         = useState(null);
  const [alertLog, setAlertLog]                     = useState([]);

  const intervalRef      = useRef(null);
  const stepRef          = useRef(0);
  const lastStepWaypoint = useRef(-1);
  const alertedGreen     = useRef(new Set());
  const alertedYellow    = useRef(new Set());

  const { speak } = useVoice();

  const addLog = useCallback((msg, type = 'info') => {
    setAlertLog((prev) => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 8));
  }, []);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setPreClearStatus(null);
  }, []);

  const start = useCallback(() => {
    if (!routeData?.coords || routeData.coords.length < 2) return;

    const coords = routeData.coords;
    const steps  = routeData.steps || [];

    stepRef.current          = 0;
    lastStepWaypoint.current = -1;
    alertedGreen.current     = new Set();
    alertedYellow.current    = new Set();

    setStepIndex(0);
    setAmbulancePos(coords[0]);
    setIsRunning(true);
    setAlertLog([]);
    setPreClearStatus('Green corridor activated');
    setCurrentInstruction('Green corridor activated');
    speak('Starting navigation. Green corridor activated.');

    intervalRef.current = setInterval(async () => {
      const idx = stepRef.current;

      if (idx >= coords.length - 1) {
        clearInterval(intervalRef.current);
        setIsRunning(false);
        setPreClearStatus('Arrived at destination');
        speak('You have arrived at the hospital.');
        onAlert('🏥 Ambulance has arrived at the hospital!', 'success');
        addLog('Arrived at hospital', 'success');
        if (onVehicleUpdate) onVehicleUpdate(coords[coords.length - 1][0], coords[coords.length - 1][1], true);
        return;
      }

      const nextIdx = idx + 1;
      stepRef.current = nextIdx;
      setStepIndex(nextIdx);
      const pos = coords[nextIdx];
      setAmbulancePos(pos);

      // Turn-by-turn
      for (const s of steps) {
        if (s.wayPoint === nextIdx && s.wayPoint !== lastStepWaypoint.current) {
          lastStepWaypoint.current = s.wayPoint;
          const phrase = stepToVoice(s);
          if (phrase) { setCurrentInstruction(phrase); speak(phrase); }
          break;
        }
      }

      // Vehicle clearance
      if (onVehicleUpdate) onVehicleUpdate(pos[0], pos[1]);

      // Accident boost
      const boostKm = onAccidentCheck ? (onAccidentCheck(pos[0], pos[1]) ?? 0) : 0;

      // 3-state corridor
      const updatedSignals = computeCorridorSignals(signals, coords, nextIdx, pos[0], pos[1], boostKm);
      onSignalUpdate(updatedSignals);

      // Pre-clearance status text (nearest upcoming yellow/green)
      const nextYellow = updatedSignals.find((s) => {
        const si = closestRouteIdx(coords, s.lat, s.lng);
        return s.status === 'yellow' && si > nextIdx;
      });
      const nextGreen = updatedSignals.find((s) => {
        const si = closestRouteIdx(coords, s.lat, s.lng);
        return s.status === 'green' && si > nextIdx;
      });

      if (nextGreen) {
        const d = Math.round(haversine(pos[0], pos[1], nextGreen.lat, nextGreen.lng) * 1000);
        setPreClearStatus(`🟢 Green corridor ready — signal ${d}m ahead`);
      } else if (nextYellow) {
        const d = Math.round(haversine(pos[0], pos[1], nextYellow.lat, nextYellow.lng) * 1000);
        const density = nextYellow.trafficDensity || 'low';
        setPreClearStatus(`🟡 Preparing signals (${d}m ahead) — clearing ${density} traffic`);
      } else {
        setPreClearStatus('🚑 Corridor active — no signals ahead');
      }

      // Per-signal YELLOW alerts (pre-clearance phase)
      for (const sig of updatedSignals) {
        if (sig.status !== 'yellow') continue;
        const si = closestRouteIdx(coords, sig.lat, sig.lng);
        if (si <= nextIdx || alertedYellow.current.has(sig.id)) continue;
        alertedYellow.current.add(sig.id);
        const dist    = haversine(pos[0], pos[1], sig.lat, sig.lng);
        const distM   = Math.round(dist * 1000);
        const density = sig.trafficDensity || 'low';
        const queue   = sig.queueLength || 0;
        const msg = density === 'high'
          ? `Traffic ahead clearing — ${queue} vehicles at signal ${distM}m ahead`
          : `Preparing signal ${distM}m ahead`;
        speak(msg);
        onAlert(`🟡 Pre-clearing traffic ${distM}m ahead (${density})`, 'warning');
        addLog(`Pre-clearing: ${density} traffic ${distM}m ahead`, 'warning');
      }

      // Per-signal GREEN alerts (priority phase)
      for (const sig of updatedSignals) {
        if (sig.status !== 'green') continue;
        const si = closestRouteIdx(coords, sig.lat, sig.lng);
        if (si <= nextIdx || alertedGreen.current.has(sig.id)) continue;
        alertedGreen.current.add(sig.id);
        const dist    = haversine(pos[0], pos[1], sig.lat, sig.lng);
        const distM   = Math.round(dist * 1000);
        const density = sig.trafficDensity || 'low';
        const isVirt  = sig.isVirtual;
        const msg = isVirt
          ? `Virtual signal cleared at ${distM}m. Cross traffic stopped.`
          : `Signal synchronized at ${distM}m. Green corridor ready.`;
        speak(msg);
        onAlert(isVirt ? `🔀 Virtual signal ${distM}m — cross traffic stopped` : `🟢 Signal synchronized ${distM}m ahead`, 'success');
        addLog(isVirt ? `Virtual control: ${distM}m` : `Signal green: ${distM}m (${density})`, 'success');
      }

      // Backend persist
      updateSignals(signals, pos[0], pos[1], routeId).catch(() => {});

    }, 500);
  }, [routeData, signals, onSignalUpdate, onAlert, routeId, speak, onVehicleUpdate, onAccidentCheck, addLog]);

  return { ambulancePos, stepIndex, isRunning, currentInstruction, preClearStatus, alertLog, start, stop };
}
