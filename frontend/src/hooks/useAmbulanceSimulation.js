import { useState, useRef, useCallback } from 'react';
import { updateSignals } from '../services/api';
import { useVoice } from './useVoice';

const GREEN_AHEAD_KM = 1.0;   // turn green when ambulance is within 1000m ahead
const RED_BEHIND_KM  = 0.1;   // turn back to red once ambulance is 100m past the signal

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find the closest route coord index to a given lat/lng
function closestRouteIdx(coords, lat, lng) {
  let minD = Infinity, idx = 0;
  for (let i = 0; i < coords.length; i++) {
    const d = haversine(lat, lng, coords[i][0], coords[i][1]);
    if (d < minD) { minD = d; idx = i; }
  }
  return idx;
}

/*
  Green corridor logic (index-based, direction-aware):
  - Find each signal's position index on the route
  - If signal index > ambulance index  AND  distance <= GREEN_AHEAD_KM  → GREEN
  - If signal index <= ambulance index AND  distance >  RED_BEHIND_KM   → RED  (passed)
  - Otherwise keep current status
*/
function computeCorridorSignals(signals, coords, ambulanceIdx, ambulanceLat, ambulanceLng) {
  return signals.map((sig) => {
    const sigIdx = closestRouteIdx(coords, sig.lat, sig.lng);
    const dist   = haversine(ambulanceLat, ambulanceLng, sig.lat, sig.lng);
    const isAhead  = sigIdx > ambulanceIdx;
    const isPassed = sigIdx <= ambulanceIdx;

    let status = sig.status;
    if (isAhead && dist <= GREEN_AHEAD_KM) {
      status = 'green';   // upcoming signal within 1000m → green
    } else if (isPassed && dist > RED_BEHIND_KM) {
      status = 'red';     // already passed → back to red
    }
    return { ...sig, status };
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

export function useAmbulanceSimulation(routeData, signals, onSignalUpdate, onAlert, routeId, onVehicleUpdate) {
  const [ambulancePos, setAmbulancePos]       = useState(null);
  const [stepIndex, setStepIndex]             = useState(0);
  const [isRunning, setIsRunning]             = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState('');

  const intervalRef        = useRef(null);
  const stepRef            = useRef(0);
  const lastStepWaypoint   = useRef(-1);
  const greenAlertedIdx    = useRef(-1); // which signal we last alerted for

  const { speak } = useVoice();

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (!routeData?.coords || routeData.coords.length < 2) return;

    const coords = routeData.coords;
    const steps  = routeData.steps || [];

    stepRef.current          = 0;
    lastStepWaypoint.current = -1;
    greenAlertedIdx.current  = -1;

    setStepIndex(0);
    setAmbulancePos(coords[0]);
    setIsRunning(true);
    setCurrentInstruction('Green corridor activated');
    speak('Starting navigation. Green corridor activated.');

    intervalRef.current = setInterval(async () => {
      const idx = stepRef.current;

      if (idx >= coords.length - 1) {
        clearInterval(intervalRef.current);
        setIsRunning(false);
        speak('You have arrived at the hospital.');
        onAlert('🏥 Ambulance has arrived at the hospital!', 'success');
        return;
      }

      const nextIdx = idx + 1;
      stepRef.current = nextIdx;
      setStepIndex(nextIdx);
      const pos = coords[nextIdx];
      setAmbulancePos(pos);

      // ── Turn-by-turn voice ──────────────────────────────────────────
      for (const s of steps) {
        if (s.wayPoint === nextIdx && s.wayPoint !== lastStepWaypoint.current) {
          lastStepWaypoint.current = s.wayPoint;
          const phrase = stepToVoice(s);
          if (phrase) { setCurrentInstruction(phrase); speak(phrase); }
          break;
        }
      }

      // ── Vehicle clearance ───────────────────────────────────────────
      if (onVehicleUpdate) onVehicleUpdate(pos[0], pos[1]);

      // ── Green corridor: index-based, direction-aware ────────────────
      const updatedSignals = computeCorridorSignals(
        signals, coords, nextIdx, pos[0], pos[1]
      );
      onSignalUpdate(updatedSignals);

      // Find the nearest upcoming green signal
      const nextGreen = updatedSignals.find((s) => {
        const sigIdx = closestRouteIdx(coords, s.lat, s.lng);
        return s.status === 'green' && sigIdx > nextIdx;
      });

      if (nextGreen) {
        const dist     = haversine(pos[0], pos[1], nextGreen.lat, nextGreen.lng);
        const sigIdx   = closestRouteIdx(coords, nextGreen.lat, nextGreen.lng);
        const density  = nextGreen.trafficDensity || 'low';

        // Alert only once per signal (avoid spam every 500ms)
        if (sigIdx !== greenAlertedIdx.current) {
          greenAlertedIdx.current = sigIdx;

          const distM = Math.round(dist * 1000);
          if (density === 'high') {
            speak(`Heavy traffic signal ahead in ${distM} metres. Clearing the lane now.`);
            onAlert(`🚦 HIGH traffic signal ${distM}m ahead — green corridor active`, 'warning');
          } else {
            speak(`Traffic signal ahead in ${distM} metres. Signal turned green.`);
            onAlert(`🟢 Signal turned GREEN — ${distM}m ahead. Ambulance approaching!`, 'info');
          }
        }
      }

      // Persist to backend (fire-and-forget, non-blocking)
      updateSignals(signals, pos[0], pos[1], routeId).catch(() => {});

    }, 500);
  }, [routeData, signals, onSignalUpdate, onAlert, routeId, speak, onVehicleUpdate]);

  return { ambulancePos, stepIndex, isRunning, currentInstruction, start, stop };
}
