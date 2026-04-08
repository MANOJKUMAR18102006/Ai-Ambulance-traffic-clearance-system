import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import { getSignals } from '../services/api';
import { signalIcon } from '../utils/icons';

// ── Icons ──────────────────────────────────────────────────────────────────
const ambulanceMarker = (status, isSelected) => L.divIcon({
  className: '',
  html: `<div style="position:relative;filter:drop-shadow(0 0 ${isSelected ? '12px' : '6px'} ${status === 'EMERGENCY' ? '#ef4444' : status === 'ON_DUTY' ? '#22c55e' : '#94a3b8'});">
    <div style="font-size:${isSelected ? '32px' : '26px'};transition:font-size 0.3s;">🚑</div>
    ${status === 'EMERGENCY' ? '<div style="position:absolute;top:-2px;right:-2px;width:9px;height:9px;background:#ef4444;border-radius:50%;animation:pulse 0.8s infinite;border:1.5px solid white"></div>' : ''}
    ${isSelected ? '<div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:6px;height:6px;background:#3b82f6;border-radius:50%;border:1px solid white"></div>' : ''}
  </div>`,
  iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
  iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15],
});

// ── Status styles ──────────────────────────────────────────────────────────
const STATUS_STYLE = {
  IDLE:      { bg: 'bg-slate-700/50',   border: 'border-slate-600',   dot: 'bg-slate-400',            badge: 'bg-slate-700 text-slate-300 border-slate-600',          label: 'Idle' },
  EMERGENCY: { bg: 'bg-red-900/30',     border: 'border-red-700',     dot: 'bg-red-500 animate-pulse', badge: 'bg-red-900/60 text-red-300 border-red-700 animate-pulse', label: 'Emergency' },
  ON_DUTY:   { bg: 'bg-emerald-900/20', border: 'border-emerald-700', dot: 'bg-emerald-400',           badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',  label: 'On Duty' },
};

// ── Route start/end icons ──────────────────────────────────────────────────
const startMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:22px;filter:drop-shadow(0 0 6px #3b82f6);">📍</div>`,
  iconSize: [26, 26], iconAnchor: [13, 26],
});
const endMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:22px;filter:drop-shadow(0 0 6px #22c55e);">🏥</div>`,
  iconSize: [26, 26], iconAnchor: [13, 26],
});

// ── Map tracker: follows selected ambulance ────────────────────────────────
function MapTracker({ ambulances, selected, userInteracted }) {
  const map = useMap();
  const prevPos = useRef(null);

  useEffect(() => {
    if (userInteracted.current) return;
    const active = ambulances.find((a) => a.ambulanceId === selected);
    if (!active?.location?.lat) return;
    const pos = [active.location.lat, active.location.lng];
    // Only pan if position actually changed
    if (prevPos.current &&
      prevPos.current[0] === pos[0] &&
      prevPos.current[1] === pos[1]) return;
    prevPos.current = pos;
    map.setView(pos, Math.max(map.getZoom(), 15), { animate: true, duration: 0.6 });
  }, [ambulances, selected, map, userInteracted]);

  return null;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ambulances, setAmbulances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [view, setView] = useState('fleet');
  const [signals, setSignals] = useState([]);
  const userInteracted = useRef(false);
  const resumeTimer = useRef(null);
  const prevRouteId = useRef(null);

  const fetchAmbulances = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/ambulance/all');
      setAmbulances(data);
      setLastUpdate(new Date());
      if (!selected && data.length) setSelected(data[0].ambulanceId);
    } catch (_) {}
    finally { setLoading(false); }
  }, [selected]);

  // Fetch signals for the selected ambulance's active route
  const fetchSignals = useCallback(async (routeId) => {
    if (!routeId) { setSignals([]); return; }
    try {
      const data = await getSignals(routeId);
      // Normalise: backend returns signalId as id
      setSignals(data.map((s) => ({ ...s, id: s.signalId || s.id })));
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchAmbulances();
    const t = setInterval(fetchAmbulances, 2000);
    return () => clearInterval(t);
  }, [fetchAmbulances]);

  // When selected ambulance changes or its routeId changes, reload signals
  const active = ambulances.find((a) => a.ambulanceId === selected);
  const activeRouteId = active?.routeId ? String(active.routeId) : null;

  useEffect(() => {
    if (activeRouteId === prevRouteId.current) return;
    prevRouteId.current = activeRouteId;
    fetchSignals(activeRouteId);
  }, [activeRouteId, fetchSignals]);

  // Poll signals every 2s when there's an active route
  useEffect(() => {
    if (!activeRouteId) return;
    const t = setInterval(() => fetchSignals(activeRouteId), 2000);
    return () => clearInterval(t);
  }, [activeRouteId, fetchSignals]);

  const stats = [
    { label: 'Total',     value: ambulances.length,                                        color: 'text-blue-400',    icon: '🚑', bg: 'bg-blue-900/20 border-blue-800' },
    { label: 'Emergency', value: ambulances.filter((a) => a.status === 'EMERGENCY').length, color: 'text-red-400',     icon: '🆘', bg: 'bg-red-900/20 border-red-800' },
    { label: 'On Duty',   value: ambulances.filter((a) => a.status === 'ON_DUTY').length,   color: 'text-emerald-400', icon: '✅', bg: 'bg-emerald-900/20 border-emerald-800' },
    { label: 'Idle',      value: ambulances.filter((a) => a.status === 'IDLE').length,      color: 'text-slate-400',   icon: '⏸', bg: 'bg-slate-700/30 border-slate-700' },
  ];

  const mapCenter = active?.location?.lat
    ? [active.location.lat, active.location.lng]
    : [20.5937, 78.9629];

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#0d1b2a] border-b border-red-900/30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-base">🛡️</div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Command Center</h1>
              <p className="text-xs text-slate-500">Traffic Control Authority</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 bg-red-900/20 border border-red-800/50 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-red-400 font-medium">LIVE MONITORING</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
            <button onClick={() => setView('fleet')}
              className={`text-xs px-3 py-1 rounded-full transition-all font-medium
                ${view === 'fleet' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              🚨 Fleet
            </button>
            <button onClick={() => setView('simulate')}
              className={`text-xs px-3 py-1 rounded-full transition-all font-medium
                ${view === 'simulate' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              ⚠️ Simulate
            </button>
          </div>

          {lastUpdate && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">A</div>
            <span className="text-xs text-slate-300 font-medium">{user?.name}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="text-xs bg-red-900/40 hover:bg-red-700 text-red-400 hover:text-white px-3 py-1.5 rounded-full border border-red-800 transition-all">
            Sign Out
          </button>
        </div>
      </header>

      {view === 'simulate' ? (
        <div className="flex-1 overflow-hidden">
          <Dashboard role="admin" />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <aside className="w-72 shrink-0 bg-[#0d1b2a] border-r border-white/5 flex flex-col overflow-y-auto p-4 gap-4">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              {stats.map((s) => (
                <div key={s.label} className={`rounded-xl p-3 border ${s.bg} text-center`}>
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Selected ambulance live detail card */}
            {active && (() => {
              const st = STATUS_STYLE[active.status] || STATUS_STYLE.IDLE;
              return (
                <div className={`rounded-xl p-4 border ${st.bg} ${st.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`}></span>
                      <span className="text-sm font-bold text-white">{active.ambulanceId}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${st.badge}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Driver</span>
                      <span className="text-slate-300 font-medium">{active.driverName || '—'}</span>
                    </div>
                    {active.location?.lat ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Location</span>
                        <span className="text-slate-300 font-mono">
                          {active.location.lat.toFixed(5)}, {active.location.lng.toFixed(5)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Location</span>
                        <span className="text-slate-600">No GPS data</span>
                      </div>
                    )}
                    {active.eta > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">ETA</span>
                        <span className="text-blue-400 font-semibold">⏱ {active.eta} min</span>
                      </div>
                    )}
                    {active.route && (
                      <div className="mt-1 pt-1.5 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Route</span>
                          <span className="text-blue-400">{active.route.distance} km · {active.route.duration} min</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-emerald-500">●</span>
                          <span className="text-slate-400 text-xs truncate">
                            {active.route.start?.lat?.toFixed(4)}, {active.route.start?.lng?.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-red-400">●</span>
                          <span className="text-slate-400 text-xs truncate">
                            {active.route.end?.lat?.toFixed(4)}, {active.route.end?.lng?.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Last update</span>
                      <span className="text-slate-400">
                        {active.updatedAt ? new Date(active.updatedAt).toLocaleTimeString() : '—'}
                      </span>
                    </div>
                  </div>

                  {active.status === 'EMERGENCY' && (
                    <div className="mt-3 flex items-center gap-2 bg-red-900/40 border border-red-700/60 rounded-lg px-3 py-2">
                      <span className="text-red-400 animate-pulse">🚨</span>
                      <span className="text-xs text-red-300 font-semibold">EMERGENCY IN PROGRESS</span>
                    </div>
                  )}
                  {signals.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500 text-xs">Signals</span>
                        <span className="text-slate-500 text-xs">{signals.length} total</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-emerald-900/30 border border-emerald-800/50 rounded-lg py-1.5 text-center">
                          <div className="text-sm font-bold text-emerald-400">{signals.filter(s => s.status === 'green').length}</div>
                          <div className="text-xs text-emerald-600">🟢 Green</div>
                        </div>
                        <div className="flex-1 bg-amber-900/30 border border-amber-800/50 rounded-lg py-1.5 text-center">
                          <div className="text-sm font-bold text-amber-400">{signals.filter(s => s.status === 'yellow').length}</div>
                          <div className="text-xs text-amber-600">🟡 Yellow</div>
                        </div>
                        <div className="flex-1 bg-red-900/30 border border-red-800/50 rounded-lg py-1.5 text-center">
                          <div className="text-sm font-bold text-red-400">{signals.filter(s => s.status === 'red').length}</div>
                          <div className="text-xs text-red-600">🔴 Red</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Fleet list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fleet</h2>
                <span className="text-xs text-slate-600">{ambulances.length} units</span>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin"></div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {ambulances.map((a) => {
                  const st = STATUS_STYLE[a.status] || STATUS_STYLE.IDLE;
                  const isActive = selected === a.ambulanceId;
                  return (
                    <button key={a.ambulanceId}
                      onClick={() => {
                        setSelected(a.ambulanceId);
                        userInteracted.current = false; // re-enable tracking on select
                      }}
                      className={`text-left p-3 rounded-xl border transition-all ${st.bg} ${st.border}
                        ${isActive ? 'ring-2 ring-blue-500/60' : 'hover:brightness-110'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${st.dot}`}></span>
                          <span className="text-sm font-bold text-white">{a.ambulanceId}</span>
                          {isActive && <span className="text-xs text-blue-400">● tracking</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.badge}`}>
                          {a.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">👤 {a.driverName || 'Unassigned'}</div>
                      {a.location?.lat ? (
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          {a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 mt-1">No location</div>
                      )}
                      {a.eta > 0 && <div className="text-xs text-blue-400 mt-1">⏱ ETA: {a.eta} min</div>}
                    </button>
                  );
                })}
                {!loading && ambulances.length === 0 && (
                  <div className="text-center py-8 text-slate-600 text-xs">
                    <div className="text-3xl mb-2">🚑</div>
                    No ambulances registered
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Map */}
          <main className="flex-1 relative">
            {/* Overlay */}
            <div className="absolute top-3 left-3 z-[999] flex items-center gap-2">
              <div className="bg-[#0d1b2a]/90 backdrop-blur border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-xs text-white font-medium">Live Fleet Map</span>
                <span className="text-xs text-slate-500">· {ambulances.filter(a => a.location?.lat).length} tracked</span>
              </div>
              {active?.status === 'EMERGENCY' && (
                <div className="bg-red-900/90 backdrop-blur border border-red-700 rounded-xl px-4 py-2 flex items-center gap-2 animate-pulse">
                  <span className="text-xs text-red-300 font-bold">🚨 {active.ambulanceId} — EMERGENCY</span>
                </div>
              )}
            </div>

            {/* Manual pan hint */}
            <div className="absolute bottom-4 right-4 z-[999]">
              <button
                onClick={() => { userInteracted.current = false; }}
                className="bg-[#0d1b2a]/90 backdrop-blur border border-white/10 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-full transition-all hover:border-blue-500/50">
                🎯 Re-center
              </button>
            </div>

            <MapContainer
              center={mapCenter}
              zoom={13}
              className="w-full h-full"
              whenCreated={(map) => {
                map.on('dragstart', () => {
                  userInteracted.current = true;
                  clearTimeout(resumeTimer.current);
                  resumeTimer.current = setTimeout(() => { userInteracted.current = false; }, 6000);
                });
              }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors' />

              <MapTracker ambulances={ambulances} selected={selected} userInteracted={userInteracted} />

              {/* Active route for selected ambulance */}
              {active?.route?.coords?.length > 1 && (
                <>
                  <Polyline
                    positions={active.route.coords.map(([lat, lng]) => [lat, lng])}
                    pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.8, dashArray: active.status === 'EMERGENCY' ? null : '8,4' }}
                  />
                  {active.route.start?.lat && (
                    <Marker position={[active.route.start.lat, active.route.start.lng]} icon={startMarkerIcon}>
                      <Popup>
                        <div className="text-sm">
                          <b>🚑 Start</b><br />
                          <span className="text-slate-500 text-xs">{active.route.start.lat.toFixed(5)}, {active.route.start.lng.toFixed(5)}</span>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {active.route.end?.lat && (
                    <Marker position={[active.route.end.lat, active.route.end.lng]} icon={endMarkerIcon}>
                      <Popup>
                        <div className="text-sm">
                          <b>🏥 Destination</b><br />
                          <span className="text-slate-500 text-xs">{active.route.end.lat.toFixed(5)}, {active.route.end.lng.toFixed(5)}</span>
                          {active.route.distance && <><br /><span className="text-blue-500">{active.route.distance} km · {active.route.duration} min</span></>}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </>
              )}

              {/* Live signals for selected ambulance */}
              {signals.map((sig) => (
                <Marker
                  key={sig.id || sig.signalId}
                  position={[sig.lat, sig.lng]}
                  icon={sig.isVirtual ? signalIcon(sig.status, 'virtual') : signalIcon(sig.status, sig.trafficDensity)}
                >
                  <Popup>
                    <div className="text-sm">
                      {sig.isVirtual ? '🔀 Virtual Control Point' : `🚦 Signal`}<br />
                      Status: <b style={{ color: sig.status === 'green' ? '#22c55e' : sig.status === 'yellow' ? '#f59e0b' : '#ef4444' }}>
                        {sig.status?.toUpperCase()}
                      </b><br />
                      {!sig.isVirtual && <>Density: <b>{sig.trafficDensity}</b> · Queue: <b>{sig.queueLength || 0}</b></>}
                      {sig.isVirtual && <span style={{ color: '#a78bfa' }}>Uncontrolled intersection</span>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* VCP clearance zones */}
              {signals
                .filter((sig) => sig.isVirtual && (sig.status === 'green' || sig.status === 'yellow'))
                .map((sig) => (
                  <Circle
                    key={`vcp-${sig.id || sig.signalId}`}
                    center={[sig.lat, sig.lng]}
                    radius={sig.clearanceRadius || 300}
                    pathOptions={{
                      color: sig.status === 'green' ? '#22c55e' : '#f59e0b',
                      fillColor: sig.status === 'green' ? '#22c55e' : '#f59e0b',
                      fillOpacity: 0.07,
                      weight: 1.5,
                      dashArray: '5,5',
                    }}
                  />
                ))
              }

              {ambulances.filter((a) => a.location?.lat).map((a) => (
                <Marker
                  key={a.ambulanceId}
                  position={[a.location.lat, a.location.lng]}
                  icon={ambulanceMarker(a.status, selected === a.ambulanceId)}
                >
                  <Popup>
                    <div className="text-sm p-1 min-w-[160px]">
                      <div className="font-bold text-base mb-1">{a.ambulanceId}</div>
                      <div className="text-slate-500 text-xs">👤 {a.driverName || 'Unassigned'}</div>
                      <div className={`font-semibold mt-1 text-xs ${
                        a.status === 'EMERGENCY' ? 'text-red-600' :
                        a.status === 'ON_DUTY' ? 'text-emerald-600' : 'text-slate-500'
                      }`}>● {a.status}</div>
                      <div className="text-slate-400 text-xs mt-1 font-mono">
                        {a.location.lat.toFixed(5)}, {a.location.lng.toFixed(5)}
                      </div>
                      {a.eta > 0 && <div className="text-blue-500 text-xs mt-1">⏱ ETA: {a.eta} min</div>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </main>
        </div>
      )}
    </div>
  );
}
