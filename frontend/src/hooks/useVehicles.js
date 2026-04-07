import { useState, useRef, useCallback } from 'react';

const CLEAR_RADIUS_KM = 0.08;

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useVehicles(initialVehicles) {
  const [vehicles, setVehicles] = useState(initialVehicles || []);
  const alertedRef = useRef(new Set());

  const reset = useCallback((newVehicles) => {
    alertedRef.current = new Set();
    setVehicles(newVehicles || []);
  }, []);

  // Called each simulation step with current ambulance position
  const updateVehicles = useCallback((ambulanceLat, ambulanceLng, onAlert, speak) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.cleared) return v;
        const dist = haversine(ambulanceLat, ambulanceLng, v.lat, v.lng);
        if (dist < CLEAR_RADIUS_KM) {
          if (!alertedRef.current.has(v.id)) {
            alertedRef.current.add(v.id);
            onAlert('🚗 Vehicles clearing the lane!', 'info');
            speak('Ambulance ahead. Clear the lane. Move to the left.');
          }
          // Move vehicle 0.0004 degrees to the side (simulate pulling over)
          return {
            ...v,
            cleared: true,
            offsetLat: v.lat + 0.0004,
            offsetLng: v.lng + 0.0004,
          };
        }
        return v;
      })
    );
  }, []);

  return { vehicles, updateVehicles, reset };
}
