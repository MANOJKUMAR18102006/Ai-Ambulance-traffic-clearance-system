import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import MapView from '../components/MapView';
import RouteInfo from '../components/RouteInfo';
import HospitalList from '../components/HospitalList';
import Alert from '../components/Alert';
import StatsPanel from '../components/StatsPanel';
import { fetchRoute, fetchHospitals } from '../services/api';
import { useAmbulanceSimulation } from '../hooks/useAmbulanceSimulation';
import { useVehicles } from '../hooks/useVehicles';
import { useVoice } from '../hooks/useVoice';
import { useAccident } from '../hooks/useAccident';

async function nominatimSearch(q) {
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q, format: 'json', limit: 5 },
    headers: { 'Accept-Language': 'en' },
  });
  return data;
}

export default function Dashboard({ onLocationUpdate, role = 'driver', onSimulationStateChange }) {
  const isAdmin = role === 'admin';
  const [startInput, setStartInput] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [start, setStart] = useState(null);
  const [locating, setLocating] = useState(false);

  const [destInput, setDestInput] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destOpen, setDestOpen] = useState(false);
  const [destination, setDestination] = useState(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);

  const [routeData, setRouteData] = useState(null);
  const [signals, setSignals] = useState([]);
  const [routeId, setRouteId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [hospitalsError, setHospitalsError] = useState(false);
  const [lastStartCoords, setLastStartCoords] = useState(null);

  const [alert, setAlert] = useState(null);
  const startTimer = useRef(null);
  const destTimer = useRef(null);
  const destRef = useRef(null);

  const { speak, stop: stopVoice } = useVoice();
  const { vehicles, updateVehicles, reset: resetVehicles } = useVehicles([]);

  const showAlert = useCallback((message, type = 'info') => {
    setAlert({ message, type, key: Date.now() });
  }, []);

  const {
    accidents, activeAccident, severity, accidentAlertStatus,
    setSeverity,
    simulateOnRoute, removeAccident, checkAccidents,
  } = useAccident(showAlert, routeId);

  const handleVehicleUpdate = useCallback((lat, lng, arrived = false) => {
    updateVehicles(lat, lng, showAlert, speak);
    if (onLocationUpdate) onLocationUpdate(lat, lng, arrived);
    if (arrived && onSimulationStateChange) onSimulationStateChange('ON_DUTY', null);
  }, [updateVehicles, showAlert, speak, onLocationUpdate, onSimulationStateChange]);

  const { ambulancePos, stepIndex, isRunning, currentInstruction, preClearStatus, alertLog, start: startSim, stop: stopSim } =
    useAmbulanceSimulation(routeData, signals, setSignals, showAlert, routeId, handleVehicleUpdate, checkAccidents);

  const handleStart = useCallback(() => {
    if (onSimulationStateChange) onSimulationStateChange('EMERGENCY', routeId);
    startSim();
  }, [startSim, onSimulationStateChange, routeId]);

  const handleStop = useCallback(() => {
    stopSim();
    stopVoice();
    if (onSimulationStateChange) onSimulationStateChange('IDLE', null);
  }, [stopSim, stopVoice, onSimulationStateChange]);

  // Outside click closes dest dropdown
  useEffect(() => {
    const h = (e) => { if (destRef.current && !destRef.current.contains(e.target)) setDestOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Start autocomplete
  useEffect(() => {
    clearTimeout(startTimer.current);
    if (startInput.length < 3) { setStartSuggestions([]); return; }
    startTimer.current = setTimeout(async () => {
      try { setStartSuggestions(await nominatimSearch(startInput)); } catch (_) {}
    }, 400);
  }, [startInput]);

  // Destination search: filter nearby hospitals + Nominatim
  useEffect(() => {
    clearTimeout(destTimer.current);
    if (!destInput.trim()) { setDestSuggestions([]); return; }
    const q = destInput.toLowerCase();
    const matched = hospitals.filter((h) => h.name.toLowerCase().includes(q));
    setDestSuggestions(matched.map((h) => ({ type: 'hospital', ...h })));
    if (destInput.length >= 3) {
      destTimer.current = setTimeout(async () => {
        try {
          const results = await nominatimSearch(destInput + ' hospital');
          const items = results.map((r) => ({
            type: 'nominatim', id: `nom_${r.place_id}`,
            name: r.display_name.split(',').slice(0, 2).join(','),
            fullName: r.display_name,
            lat: parseFloat(r.lat), lng: parseFloat(r.lon),
          }));
          setDestSuggestions((prev) => {
            const ids = new Set(prev.map((x) => x.id));
            return [...prev, ...items.filter((x) => !ids.has(x.id))];
          });
        } catch (_) {}
      }, 500);
    }
  }, [destInput, hospitals]);

  const handleSelectStart = (item) => {
    const lat = parseFloat(item.lat), lng = parseFloat(item.lon);
    setStart([lat, lng]);
    setStartInput(item.display_name.split(',').slice(0, 2).join(','));
    setStartSuggestions([]);
    loadHospitals(lat, lng);
  };

  const handleSelectDest = (item) => {
    setDestination([item.lat, item.lng]);
    setDestInput(item.name);
    setSelectedHospitalId(item.type === 'hospital' ? item.id : null);
    setDestSuggestions([]);
    setDestOpen(false);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return showAlert('Geolocation not supported.', 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        setStart([lat, lng]);
        setStartInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setStartSuggestions([]);
        setLocating(false);
        showAlert('📍 Current location set as start.', 'success');
        loadHospitals(lat, lng);
      },
      () => { setLocating(false); showAlert('Failed to get location.', 'error'); }
    );
  };

  const loadHospitals = async (lat, lng) => {
    setHospitalsLoading(true);
    setHospitalsError(false);
    setLastStartCoords([lat, lng]);
    try {
      const hosp = await fetchHospitals(lat, lng);
      setHospitals(hosp);
      if (hosp.length === 0) setHospitalsError(true);
    } catch (_) { setHospitalsError(true); }
    finally { setHospitalsLoading(false); }
  };

  const handleHospitalCardSelect = (h) => {
    setDestination([h.lat, h.lng]);
    setDestInput(h.name);
    setSelectedHospitalId(h.id);
    setDestSuggestions([]);
  };

  const handleMapClick = useCallback((latlng) => {
    if (!start) {
      setStart([latlng.lat, latlng.lng]);
      setStartInput(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      loadHospitals(latlng.lat, latlng.lng);
    } else if (!destination) {
      setDestination([latlng.lat, latlng.lng]);
      setDestInput(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
    }
  }, [start, destination]);

  const handleFetchRoute = async () => {
    if (!start || !destination) return showAlert('Set both start and destination.', 'error');
    setLoading(true); setRouteData(null); setSignals([]);
    try {
      const data = await fetchRoute(
        { lat: start[0], lng: start[1] },
        { lat: destination[0], lng: destination[1] }
      );
      setRouteData(data);
      setSignals(data.signals || []);
      setRouteId(data.routeId || null);
      resetVehicles(data.vehicles || []);
      showAlert(`Route found! ${data.distance} km · ${data.duration} min`, 'success');
    } catch (err) {
      showAlert(err.message || 'Failed to fetch route.', 'error');
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    stopSim();
    setStart(null); setDestination(null);
    setStartInput(''); setDestInput('');
    setRouteData(null); setSignals([]);
    setHospitals([]); setSelectedHospitalId(null);
    setStartSuggestions([]); setDestSuggestions([]);
    setHospitalsError(false); setLastStartCoords(null);
    resetVehicles([]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#0d1b2a] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚑</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">AI Ambulance Traffic Clearance</h1>
            <p className="text-xs text-slate-400">Smart Green Corridor System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentInstruction && isRunning && (
            <span className="hidden md:flex items-center gap-2 text-xs text-amber-300 bg-amber-900/30 px-3 py-1.5 rounded-full border border-amber-700 max-w-xs truncate">
              🗣 {currentInstruction}
            </span>
          )}
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-900/40 px-3 py-1.5 rounded-full border border-emerald-700 animate-pulse">
              <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block"></span>
              LIVE
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-[#0d1b2a] border-r border-white/5 flex flex-col overflow-y-auto p-4 gap-4">

          {/* Start */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">🚑 Start Location</h2>
            <button onClick={handleCurrentLocation} disabled={locating}
              className="w-full flex items-center justify-center gap-2 mb-2 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/50 text-blue-400 text-sm font-medium transition-all disabled:opacity-50">
              {locating ? <><span className="w-3 h-3 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></span> Locating...</> : '📍 Use Current Location'}
            </button>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
              <input type="text" value={startInput}
                onChange={(e) => { setStartInput(e.target.value); setStart(null); }}
                placeholder="Search start location..."
                className="w-full bg-white/5 border border-white/10 focus:border-blue-500/70 outline-none rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-600 transition-colors" />
              {startSuggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1b2a] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {startSuggestions.map((s) => (
                    <li key={s.place_id}>
                      <button onClick={() => handleSelectStart(s)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 border-b border-white/5 last:border-0">
                        {s.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {start && <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> {start[0].toFixed(5)}, {start[1].toFixed(5)}</p>}
          </div>

          {/* Destination */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4" ref={destRef}>
            <h2 className="text-sm font-semibold text-slate-200 mb-2">🏥 Destination Hospital</h2>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input type="text" value={destInput}
                onChange={(e) => { setDestInput(e.target.value); setDestination(null); setSelectedHospitalId(null); setDestOpen(true); }}
                onFocus={() => setDestOpen(true)}
                placeholder={start ? 'Search hospital name...' : 'Set start location first'}
                disabled={!start}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/70 outline-none rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-600 disabled:opacity-30 transition-colors" />
              {destOpen && destSuggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1b2a] border border-white/10 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                  {destSuggestions.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => handleSelectDest(s)}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-200 truncate">{s.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.type === 'hospital' && s.distanceKm != null && (
                              <span className="text-xs bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full">{s.distanceKm} km</span>
                            )}
                            {s.type === 'hospital' && s.emergency && (
                              <span className="text-xs bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded-full">🚨</span>
                            )}
                            {s.type === 'nominatim' && (
                              <span className="text-xs bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded-full">🌐</span>
                            )}
                          </div>
                        </div>
                        {s.type === 'nominatim' && (
                          <div className="text-xs text-slate-600 truncate mt-0.5">{s.fullName}</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {destOpen && destInput.length >= 1 && destSuggestions.length === 0 && !hospitalsLoading && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1b2a] border border-white/10 rounded-xl shadow-2xl px-3 py-2 text-xs text-slate-500">
                  No hospitals found for "{destInput}"
                </div>
              )}
            </div>
            {destination && <p className="text-xs text-emerald-400 mt-1.5">✓ {destination[0].toFixed(5)}, {destination[1].toFixed(5)}</p>}
          </div>

          {/* Get Route */}
          <div className="flex gap-2">
            <button onClick={handleFetchRoute} disabled={!start || !destination || loading}
              className="flex-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Calculating...</>
                : <><span>🗺️</span> Get Route</>}
            </button>
            <button onClick={handleReset} className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-sm rounded-xl transition-all">
              ↺
            </button>
          </div>

          {/* Accident Panel — admin controls OR driver read-only status */}
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider">⚠️ Accident Zones</h2>
              {routeData && <span className="text-xs text-red-600">{accidents.length} active</span>}
            </div>

            {/* ── DRIVER VIEW ── read-only status banner */}
            {!isAdmin && (
              <div className="flex flex-col gap-2">
                {!routeData && (
                  <p className="text-xs text-slate-500 text-center py-1">Generate route to monitor accidents</p>
                )}
                {routeData && accidentAlertStatus === null && accidents.length === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/20 border border-emerald-800/40">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    <span className="text-xs text-emerald-400">Route clear — no accidents detected</span>
                  </div>
                )}
                {accidentAlertStatus === 'far' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700 animate-pulse">
                    <span className="text-base">⚠️</span>
                    <div>
                      <div className="text-xs font-bold text-amber-300">Accident ahead – 1.5 km</div>
                      <div className="text-xs text-amber-500">Prepare to slow down</div>
                    </div>
                  </div>
                )}
                {accidentAlertStatus === 'near' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/50 border border-red-600 animate-pulse">
                    <span className="text-base">🚨</span>
                    <div>
                      <div className="text-xs font-bold text-red-300">Accident ahead – 500 m</div>
                      <div className="text-xs text-red-400">Clearing traffic now</div>
                    </div>
                  </div>
                )}
                {accidentAlertStatus === 'cleared' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-700">
                    <span className="text-base">✅</span>
                    <div className="text-xs font-bold text-emerald-300">Accident cleared</div>
                  </div>
                )}
                {/* Show active accident zones (read-only) */}
                {accidents.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 max-h-28 overflow-y-auto">
                    {accidents.map((acc) => (
                      <div key={acc._id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border
                          ${activeAccident?._id === acc._id
                            ? 'bg-red-900/50 border-red-600'
                            : 'bg-white/5 border-white/10'}`}>
                        <span className="text-xs">⚠️</span>
                        <span className="text-xs text-slate-300">{acc.severity}</span>
                        {activeAccident?._id === acc._id && (
                          <span className="text-xs text-red-400 font-semibold ml-auto">CLEARING</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ADMIN VIEW ── full simulation controls */}
            {isAdmin && (
              <>
                {!routeData ? (
                  <p className="text-xs text-slate-500 text-center py-2">Generate route to enable accident simulation</p>
                ) : (
                  <>
                    <div className="flex gap-1.5 mb-3">
                      {['LOW', 'MEDIUM', 'HIGH'].map((s) => (
                        <button key={s} onClick={() => setSeverity(s)}
                          className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all
                            ${severity === s
                              ? s === 'HIGH' ? 'bg-red-700 border-red-500 text-white'
                                : s === 'LOW' ? 'bg-amber-700 border-amber-500 text-white'
                                : 'bg-orange-700 border-orange-500 text-white'
                              : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => simulateOnRoute(routeData?.coords)}
                      className="w-full py-2.5 rounded-xl border text-sm font-semibold transition-all mb-3 bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50">
                      ⚠️ Simulate Accident
                    </button>
                    {accidents.length > 0 && (
                      <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                        {accidents.map((acc) => (
                          <div key={acc._id}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border
                              ${activeAccident?._id === acc._id
                                ? 'bg-red-900/50 border-red-600 animate-pulse'
                                : 'bg-white/5 border-white/10'}`}>
                            <div>
                              <span className="text-xs text-white font-medium">⚠️ {acc.severity}</span>
                              <div className="text-xs text-slate-500">{acc.lat.toFixed(4)}, {acc.lng.toFixed(4)}</div>
                              {activeAccident?._id === acc._id && (
                                <div className="text-xs text-red-400 font-semibold">CLEARING TRAFFIC</div>
                              )}
                            </div>
                            <button onClick={() => removeAccident(acc._id)}
                              className="text-xs text-slate-600 hover:text-red-400 transition-colors px-1">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <StatsPanel
            routeData={routeData} ambulancePos={ambulancePos}
            signals={signals} stepIndex={stepIndex}
            vehicles={vehicles} preClearStatus={preClearStatus}
            alertLog={alertLog}
          />

          {/* Route Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">🛣️ Route Details</h2>
            <RouteInfo
              routeData={routeData} signals={signals} stepIndex={stepIndex}
              isRunning={isRunning} onStart={handleStart} onStop={handleStop} loading={loading}
              currentInstruction={currentInstruction}
            />
          </div>

          {/* Hospital List */}
          {hospitalsLoading && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-5 h-5 border-2 border-emerald-600/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Searching hospitals within 50 km...</p>
            </div>
          )}
          {!hospitalsLoading && hospitalsError && (
            <div className="bg-red-900/10 border border-red-800/40 rounded-xl p-4 text-center">
              <p className="text-xs text-red-400 mb-2">⚠️ Could not load hospitals.</p>
              <button onClick={() => lastStartCoords && loadHospitals(...lastStartCoords)}
                className="text-xs bg-red-700/30 hover:bg-red-700/60 text-red-300 px-3 py-1.5 rounded-lg border border-red-700/50 transition-colors">
                🔄 Retry
              </button>
            </div>
          )}
          {!hospitalsLoading && !hospitalsError && (
            <HospitalList hospitals={hospitals} onSelect={handleHospitalCardSelect} selectedId={selectedHospitalId} />
          )}

          {/* Legend */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-3 mt-auto">
            <h2 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Map Legend</h2>
            <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
              <span>🚑 Ambulance</span>
              <span>🏥 Hospital</span>
              <span>🚗 Vehicle</span>
              <span>🚦 Signal</span>
              <span className="text-emerald-400">🟢 Green (priority)</span>
              <span className="text-amber-400">🟡 Yellow (pre-clear)</span>
              <span className="text-red-400">🔴 Red (stop)</span>
              <span className="text-purple-400">◆ Virtual signal</span>
              <span className="text-blue-400">━ Route</span>
              <span className="text-amber-400">⚠️ Accident</span>
            </div>
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <MapView
            start={start} destination={destination}
            routeCoords={routeData?.coords || []}
            trafficZones={routeData?.trafficZones || []}
            signals={signals} ambulancePos={ambulancePos}
            hospitals={hospitals} vehicles={vehicles}
            onMapClick={handleMapClick}
            accidents={accidents}
            activeAccident={activeAccident}
            isRunning={isRunning}
          />
        </main>
      </div>

      {alert && <Alert key={alert.key} message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
    </div>
  );
}
