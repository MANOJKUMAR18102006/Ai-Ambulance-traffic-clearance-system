import React, { useEffect, useRef } from 'react';
import { useMap, useMapEvents, MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ambulanceIcon, hospitalIcon, startIcon, signalIcon, vehicleIcon, accidentIcon } from '../utils/icons';

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// Handles all programmatic map movement
function MapController({ routeCoords, ambulancePos, isRunning }) {
  const map = useMap();
  const prevRunning = useRef(false);
  const userInteracted = useRef(false);
  const resumeTimer = useRef(null);
  const followTimeout = useRef(null);
  const prevRouteKey = useRef(null);

  // Detect manual zoom/pan — pause follow, auto-resume after 4s of inactivity
  useEffect(() => {
    const onInteract = () => {
      userInteracted.current = true;
      clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => {
        userInteracted.current = false;
      }, 4000);
    };
    map.on('zoomstart', onInteract);
    map.on('dragstart', onInteract);
    return () => {
      map.off('zoomstart', onInteract);
      map.off('dragstart', onInteract);
      clearTimeout(resumeTimer.current);
    };
  }, [map]);

  // Fit route bounds when route is fetched (not running)
  useEffect(() => {
    if (!routeCoords?.length) return;
    const key = `${routeCoords[0]}-${routeCoords[routeCoords.length - 1]}`;
    if (key === prevRouteKey.current || isRunning) return;
    prevRouteKey.current = key;
    const bounds = L.latLngBounds(routeCoords.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding: [40, 40], minZoom: 13, maxZoom: 16, animate: true, duration: 1.0 });
  }, [routeCoords, isRunning, map]);

  // On simulation start: fit full route, then ease into ambulance view
  useEffect(() => {
    if (isRunning && !prevRunning.current && routeCoords?.length > 1) {
      userInteracted.current = false;
      clearTimeout(resumeTimer.current);
      const bounds = L.latLngBounds(routeCoords.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16, animate: true, duration: 1.2 });

      followTimeout.current = setTimeout(() => {
        if (!userInteracted.current && routeCoords[0]) {
          map.setView(routeCoords[0], 16, { animate: true, duration: 1.0 });
        }
      }, 2200);
    }
    if (!isRunning) {
      clearTimeout(followTimeout.current);
      clearTimeout(resumeTimer.current);
      userInteracted.current = false;
      prevRunning.current = false;
    }
    prevRunning.current = isRunning;
    return () => clearTimeout(followTimeout.current);
  }, [isRunning, routeCoords, map]);

  // Follow ambulance on every position update — paused only during manual interaction
  useEffect(() => {
    if (isRunning && ambulancePos && !userInteracted.current) {
      map.setView(ambulancePos, Math.max(map.getZoom(), 16), { animate: true, duration: 0.4, easeLinearity: 0.5 });
    }
  }, [ambulancePos, isRunning, map]);

  return null;
}

export default function MapView({
  start, destination, routeCoords, trafficZones,
  signals, ambulancePos, hospitals, vehicles, onMapClick,
  accidents, activeAccident, isRunning,
}) {
  const center = start || [20.5937, 78.9629];

  return (
    <MapContainer center={center} zoom={start ? 16 : 5} className="w-full h-full rounded-xl" style={{ minHeight: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <ClickHandler onMapClick={onMapClick} />
      <MapController routeCoords={routeCoords} ambulancePos={ambulancePos} isRunning={isRunning} />

      {/* Route */}
      {routeCoords?.length > 1 && (
        <Polyline positions={routeCoords}
          pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.9 }}
        />
      )}

      {/* Traffic zones */}
      {trafficZones?.map((zone) =>
        zone.segmentCoords?.length > 1 ? (
          <Polyline key={zone.id} positions={zone.segmentCoords}
            pathOptions={{ color: '#ef4444', weight: 9, opacity: 0.5 }}>
            <Popup>🚦 High Traffic Zone</Popup>
          </Polyline>
        ) : null
      )}

      {/* Signals */}
      {signals.map((sig) => (
        <Marker key={sig.id} position={[sig.lat, sig.lng]}
          icon={sig.isVirtual ? signalIcon(sig.status, 'virtual') : signalIcon(sig.status, sig.trafficDensity)}>
          <Popup>
            {sig.isVirtual ? '🔀' : '🚦'} {sig.isVirtual ? 'Virtual Control Point' : `Signal ${sig.id}`}<br />
            Status: <b style={{ color: sig.status === 'green' ? '#22c55e' : sig.status === 'yellow' ? '#f59e0b' : '#ef4444' }}>{sig.status.toUpperCase()}</b><br />
            {!sig.isVirtual && <>Density: <b>{sig.trafficDensity}</b> · Queue: <b>{sig.queueLength || 0}</b> vehicles</>}
            {sig.isVirtual && <span style={{ color: '#a78bfa' }}>Uncontrolled intersection</span>}
          </Popup>
        </Marker>
      ))}

      {/* Simulated vehicles */}
      {vehicles?.map((v) => (
        <Marker key={v.id} position={v.cleared ? [v.offsetLat, v.offsetLng] : [v.lat, v.lng]} icon={vehicleIcon(v.cleared)}>
          <Popup>🚗 Vehicle {v.id} {v.cleared ? '— Cleared' : '— On road'}</Popup>
        </Marker>
      ))}

      {/* Start */}
      {start && (
        <Marker position={start} icon={ambulancePos ? startIcon : ambulanceIcon}>
          <Popup>🚑 Start</Popup>
        </Marker>
      )}

      {/* Destination */}
      {destination && (
        <Marker position={destination} icon={hospitalIcon}>
          <Popup>🏥 Destination</Popup>
        </Marker>
      )}

      {/* Live ambulance */}
      {ambulancePos && (
        <Marker position={ambulancePos} icon={ambulanceIcon}>
          <Popup>🚑 Ambulance (Live)</Popup>
        </Marker>
      )}

      {/* Nearby hospitals */}
      {hospitals?.map((h) => (
        <Marker key={h.id} position={[h.lat, h.lng]} icon={hospitalIcon}>
          <Popup>🏥 {h.name}</Popup>
        </Marker>
      ))}

      {/* Accident zones */}
      {accidents?.map((acc) => (
        <React.Fragment key={acc._id}>
          <Marker position={[acc.lat, acc.lng]} icon={accidentIcon(acc.severity)}>
            <Popup>
              <div className="text-sm">
                <b>⚠️ Accident Zone</b><br />
                Severity: <b style={{ color: acc.severity === 'HIGH' ? '#dc2626' : acc.severity === 'LOW' ? '#f59e0b' : '#ef4444' }}>{acc.severity}</b>
              </div>
            </Popup>
          </Marker>
          <Circle
            center={[acc.lat, acc.lng]}
            radius={acc.severity === 'HIGH' ? 120 : acc.severity === 'LOW' ? 60 : 90}
            pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, weight: 2, dashArray: '4,4' }}
          />
        </React.Fragment>
      ))}

      {/* Active accident clearance zone */}
      {activeAccident && (
        <Circle
          center={[activeAccident.lat, activeAccident.lng]}
          radius={activeAccident.severity === 'HIGH' ? 800 : activeAccident.severity === 'LOW' ? 400 : 600}
          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 2.5, dashArray: '6,4' }}
        />
      )}
    </MapContainer>
  );
}
