import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';

const STATUS_OPTIONS = [
  {
    value: 'IDLE',
    label: 'Idle',
    icon: '⚪',
    idle:   'border-slate-600 text-slate-400 bg-slate-800/60 hover:brightness-125',
    active: 'border-slate-400 text-white bg-slate-700',
  },
  {
    value: 'ON_DUTY',
    label: 'On Duty',
    icon: '🟢',
    idle:   'border-emerald-800 text-emerald-600 bg-emerald-900/20 hover:brightness-125',
    active: 'border-emerald-500 text-emerald-300 bg-emerald-900/40',
  },
  {
    value: 'EMERGENCY',
    label: 'Emergency',
    icon: '🔴',
    idle:   'border-red-800 text-red-600 bg-red-900/20 hover:brightness-125',
    active: 'border-red-500 text-red-300 bg-red-900/40 animate-pulse',
  },
];

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ambulance, setAmbulance] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchAmbulance = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/ambulance/mine');
      setAmbulance({ ...data, status: 'IDLE' });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchAmbulance(); }, [fetchAmbulance]);

  // Manual status change from buttons
  const updateStatus = useCallback(async (status) => {
    if (updating || ambulance?.status === status) return;
    setUpdating(true);
    try {
      const { data } = await axios.put('/api/ambulance/mine', { status });
      setAmbulance(data);
    } catch (_) {
      setAmbulance((prev) => prev ? { ...prev, status } : prev);
    } finally { setUpdating(false); }
  }, [updating, ambulance?.status]);

  // Automatic status change from simulation (Activate Green Corridor / Stop / Arrived)
  const handleSimulationStateChange = useCallback(async (status, routeId) => {
    try {
      const { data } = await axios.put('/api/ambulance/mine', {
        status,
        routeId: routeId || null,
      });
      setAmbulance(data);
    } catch (_) {
      setAmbulance((prev) => prev ? { ...prev, status } : prev);
    }
  }, []);

  const syncLocation = useCallback(async (lat, lng, arrived = false) => {
    try {
      if (arrived) {
        const { data } = await axios.put('/api/ambulance/mine', {
          location: { lat, lng }, eta: 0, status: 'ON_DUTY',
        });
        setAmbulance(data);
      } else {
        await axios.put('/api/ambulance/mine', { location: { lat, lng } });
      }
    } catch (_) {}
  }, []);

  const currentStatus = ambulance?.status || 'IDLE';
  const isEmergency = currentStatus === 'EMERGENCY';

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e]">
      {/* Driver top bar */}
      <header className={`flex items-center justify-between px-6 py-2.5 border-b shrink-0 transition-colors
        ${isEmergency ? 'bg-red-950/80 border-red-800/60' : 'bg-[#0d1b2a] border-white/5'}`}>

        <div className="flex items-center gap-4">
          {/* Ambulance ID */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base
              ${isEmergency ? 'bg-red-600 animate-pulse' : 'bg-blue-700'}`}>
              🚑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {ambulance?.ambulanceId || '...'}
                </span>
                {isEmergency && (
                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                    EMERGENCY
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">👤 {user?.name}</span>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10" />

          {/* Status buttons — manual + reflects automatic changes */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600 mr-1">Status:</span>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => updateStatus(s.value)}
                disabled={updating}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all disabled:opacity-50
                  ${currentStatus === s.value ? s.active : s.idle}`}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => { logout(); navigate('/login'); }}
          className="text-xs bg-white/5 hover:bg-red-900/40 text-slate-400 hover:text-red-300 px-3 py-1.5 rounded-full border border-white/10 hover:border-red-800 transition-all">
          Sign Out
        </button>
      </header>

      <div className="flex-1 overflow-hidden">
        <Dashboard
          onLocationUpdate={syncLocation}
          role="driver"
          onSimulationStateChange={handleSimulationStateChange}
        />
      </div>
    </div>
  );
}
