import { useMapEvents, MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ambulanceIcon, hospitalIcon, startIcon, signalIcon, vehicleIcon } from '../utils/icons';

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

export default function MapView({
  start, destination, routeCoords, trafficZones,
  signals, ambulancePos, hospitals, vehicles, onMapClick,
}) {
  const center = start || [20.5937, 78.9629];

  return (
    <MapContainer center={center} zoom={start ? 13 : 5} className="w-full h-full rounded-xl" style={{ minHeight: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <ClickHandler onMapClick={onMapClick} />

      {/* Single route */}
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

      {/* Signals with density-aware size */}
      {signals.map((sig) => (
        <Marker key={sig.id} position={[sig.lat, sig.lng]} icon={signalIcon(sig.status, sig.trafficDensity)}>
          <Popup>
            🚦 Signal {sig.id}<br />
            Status: <b style={{ color: sig.status === 'green' ? '#22c55e' : '#ef4444' }}>{sig.status.toUpperCase()}</b><br />
            Density: <b>{sig.trafficDensity || 'low'}</b>
          </Popup>
        </Marker>
      ))}

      {/* Simulated vehicles */}
      {vehicles?.map((v) => (
        <Marker
          key={v.id}
          position={v.cleared ? [v.offsetLat, v.offsetLng] : [v.lat, v.lng]}
          icon={vehicleIcon(v.cleared)}
        >
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
    </MapContainer>
  );
}
