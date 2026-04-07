import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ambulanceMarker = L.divIcon({
  className: '',
  html: `<div style="font-size:24px;filter:drop-shadow(0 0 6px #ef4444);">🚑</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

const statusColors = {
  IDLE: 'text-slate-400 bg-slate-700 border-slate-600',
  EMERGENCY: 'text-red-400 bg-red-900/40 border-red-700',
  ON_DUTY: 'text-emerald-400 bg-emerald-900/40 border-emerald-700',
};

const statusDot = { IDLE: 'bg-slate-400', EMERGENCY: 'bg-red-400 animate-pulse', ON_DUTY: 'bg-emerald-400' };

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ambulances, setAmbulances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAmbulances = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/ambulance/all');
      setAmbulances(data);
      if (!selected && data.length) setSelected(data[0].ambulanceId);
    } catch (_) {}
    finally { setLoading(false); }
  }, [selected]);

  useEffect(() => {
    fetchAmbulances();
    const t = setInterval(fetchAmbulances, 3000);
    return () => clearInterval(t);
  }, [fetchAmbulances]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const active = ambulances.find((a) => a.ambulanceId === selected);
  const mapCenter = active?.location?.lat ? [active.location.lat, active.location.lng] : [20.5937, 78.9629];

  const stats = {
    total: ambulances.length,
    emergency: ambulances.filter((a) => a.status === 'EMERGENCY').length,
    onDuty: ambulances.filter((a) => a.status === 'ON_DUTY').length,
    idle: ambulances.filter((a) => a.status === 'IDLE').length,
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡</span>
          <div>
            <h1 className="text-base font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-slate-400">Traffic Control Authority</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 bg-slate-700 px-3 py-1.5 rounded-full border border-slate-600">
            👤 {user?.name}
          </span>
          <button onClick={handleLogout}
            className="text-xs bg-red-700/40 hover:bg-red-700 text-red-300 px-3 py-1.5 rounded-full border border-red-700 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto p-4 gap-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total', value: stats.total, color: 'text-blue-400' },
              { label: 'Emergency', value: stats.emergency, color: 'text-red-400' },
              { label: 'On Duty', value: stats.onDuty, color: 'text-emerald-400' },
              { label: 'Idle', value: stats.idle, color: 'text-slate-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-700/40 rounded-xl p-3 border border-slate-600 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Ambulance selector */}
          <div className="bg-slate-700/40 rounded-xl p-3 border border-slate-600">
            <label className="text-xs text-slate-400 mb-2 block">Select Ambulance</label>
            <select value={selected || ''} onChange={(e) => setSelected(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none">
              {ambulances.map((a) => (
                <option key={a.ambulanceId} value={a.ambulanceId}>
                  {a.ambulanceId} — {a.status}
                </option>
              ))}
            </select>
          </div>

          {/* Ambulance list */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">All Ambulances</h2>
            {loading && <p className="text-xs text-slate-500 text-center py-4">Loading...</p>}
            {ambulances.map((a) => (
              <button key={a.ambulanceId} onClick={() => setSelected(a.ambulanceId)}
                className={`text-left p-3 rounded-xl border transition-colors
                  ${selected === a.ambulanceId ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/60'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{a.ambulanceId}</span>
                  <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${statusColors[a.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot[a.status]}`}></span>
                    {a.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">Driver: {a.driverName || '—'}</div>
                {a.location?.lat ? (
                  <div className="text-xs text-slate-500 mt-0.5">
                    📍 {a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)}
                  </div>
                ) : null}
                {a.eta > 0 && <div className="text-xs text-blue-400 mt-0.5">⏱ ETA: {a.eta} min</div>}
              </button>
            ))}
            {!loading && ambulances.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No ambulances registered yet.</p>
            )}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <MapContainer center={mapCenter} zoom={12} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors' />
            {ambulances.filter((a) => a.location?.lat).map((a) => (
              <Marker key={a.ambulanceId} position={[a.location.lat, a.location.lng]} icon={ambulanceMarker}>
                <Popup>
                  <div className="text-sm">
                    <b>{a.ambulanceId}</b><br />
                    Driver: {a.driverName}<br />
                    Status: <b>{a.status}</b><br />
                    {a.eta > 0 && <>ETA: {a.eta} min</>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}
