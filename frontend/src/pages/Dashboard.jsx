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

async function nominatimSearch(q) {
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q, format: 'json', limit: 5 },
    headers: { 'Accept-Language': 'en' },
  });
  return data;
}

export default function Dashboard({ onLocationUpdate }) {
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

  const { speak } = useVoice();
  const { vehicles, updateVehicles, reset: resetVehicles } = useVehicles([]);

  const showAlert = useCallback((message, type = 'info') => {
    setAlert({ message, type, key: Date.now() });
  }, []);

  const handleVehicleUpdate = useCallback((lat, lng) => {
    updateVehicles(lat, lng, showAlert, speak);
    if (onLocationUpdate) onLocationUpdate(lat, lng);
  }, [updateVehicles, showAlert, speak, onLocationUpdate]);

  const { ambulancePos, stepIndex, isRunning, currentInstruction, start: startSim, stop: stopSim } =
    useAmbulanceSimulation(routeData, signals, setSignals, showAlert, routeId, handleVehicleUpdate);

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
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
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
        <aside className="w-80 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto p-4 gap-4">

          {/* Start */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">🚑 Start Location</h2>
            <button onClick={handleCurrentLocation} disabled={locating}
              className="w-full flex items-center justify-center gap-2 mb-2 py-2 rounded-lg bg-blue-700/40 hover:bg-blue-700/70 border border-blue-600 text-blue-300 text-sm font-medium transition-colors disabled:opacity-50">
              {locating ? '⏳ Locating...' : '📍 Use Current Location'}
            </button>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input type="text" value={startInput}
                onChange={(e) => { setStartInput(e.target.value); setStart(null); }}
                placeholder="Search start location..."
                className="w-full bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500" />
              {startSuggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {startSuggestions.map((s) => (
                    <li key={s.place_id}>
                      <button onClick={() => handleSelectStart(s)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 border-b border-slate-700 last:border-0">
                        {s.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {start && <p className="text-xs text-emerald-400 mt-1.5">✓ {start[0].toFixed(5)}, {start[1].toFixed(5)}</p>}
          </div>

          {/* Destination */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600" ref={destRef}>
            <h2 className="text-sm font-semibold text-slate-200 mb-2">🏥 Destination Hospital</h2>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input type="text" value={destInput}
                onChange={(e) => { setDestInput(e.target.value); setDestination(null); setSelectedHospitalId(null); setDestOpen(true); }}
                onFocus={() => setDestOpen(true)}
                placeholder={start ? 'Search hospital name...' : 'Set start location first'}
                disabled={!start}
                className="w-full bg-slate-800 border border-slate-600 focus:border-emerald-500 outline-none rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 disabled:opacity-40" />
              {destOpen && destSuggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  {destSuggestions.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => handleSelectDest(s)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 border-b border-slate-700 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-200 truncate">{s.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.type === 'hospital' && s.distanceKm != null && (
                              <span className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">{s.distanceKm} km</span>
                            )}
                            {s.type === 'hospital' && s.emergency && (
                              <span className="text-xs bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded">🚨</span>
                            )}
                            {s.type === 'nominatim' && (
                              <span className="text-xs bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded">🌐</span>
                            )}
                          </div>
                        </div>
                        {s.type === 'nominatim' && (
                          <div className="text-xs text-slate-500 truncate mt-0.5">{s.fullName}</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {destOpen && destInput.length >= 1 && destSuggestions.length === 0 && !hospitalsLoading && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl px-3 py-2 text-xs text-slate-400">
                  No hospitals found for "{destInput}"
                </div>
              )}
            </div>
            {destination && <p className="text-xs text-emerald-400 mt-1.5">✓ {destination[0].toFixed(5)}, {destination[1].toFixed(5)}</p>}
          </div>

          {/* Get Route */}
          <div className="flex gap-2">
            <button onClick={handleFetchRoute} disabled={!start || !destination || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
              {loading ? '⏳ Loading...' : '🗺️ Get Route'}
            </button>
            <button onClick={handleReset} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition-colors">
              Reset
            </button>
          </div>

          {/* Stats Panel */}
          <StatsPanel
            routeData={routeData} ambulancePos={ambulancePos}
            signals={signals} stepIndex={stepIndex}
            vehicles={vehicles}
          />

          {/* Route Info */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">🛣️ Route Details</h2>
            <RouteInfo
              routeData={routeData} signals={signals} stepIndex={stepIndex}
              isRunning={isRunning} onStart={startSim} onStop={stopSim} loading={loading}
              currentInstruction={currentInstruction}
            />
          </div>

          {/* Hospital List */}
          {hospitalsLoading && (
            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600 text-center">
              <p className="text-xs text-slate-400 animate-pulse">🔍 Searching hospitals within 50 km...</p>
            </div>
          )}
          {!hospitalsLoading && hospitalsError && (
            <div className="bg-slate-700/40 rounded-xl p-4 border border-red-800 text-center">
              <p className="text-xs text-red-400 mb-2">⚠️ Could not load hospitals.</p>
              <button onClick={() => lastStartCoords && loadHospitals(...lastStartCoords)}
                className="text-xs bg-red-700/50 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg border border-red-600 transition-colors">
                🔄 Retry
              </button>
            </div>
          )}
          {!hospitalsLoading && !hospitalsError && (
            <HospitalList hospitals={hospitals} onSelect={handleHospitalCardSelect} selectedId={selectedHospitalId} />
          )}

          {/* Legend */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600 mt-auto">
            <h2 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Legend</h2>
            <div className="flex flex-col gap-1.5 text-xs text-slate-300">
              <span>🚑 Ambulance</span>
              <span>🏥 Hospital</span>
              <span>🚗 Simulated Vehicle</span>
              <span>🟢 Signal Green (clear)</span>
              <span>🔴 Signal Red (stop)</span>
              <span className="text-blue-400">━━ Route</span>
              <span className="text-red-400">━━ High Traffic Zone</span>
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
          />
        </main>
      </div>

      {alert && <Alert key={alert.key} message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
    </div>
  );
}
