import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';

const STATUS_OPTIONS = ['IDLE', 'EMERGENCY', 'ON_DUTY'];
const statusColors = {
  IDLE: 'border-slate-600 text-slate-300 bg-slate-700/40',
  EMERGENCY: 'border-red-600 text-red-300 bg-red-900/40',
  ON_DUTY: 'border-emerald-600 text-emerald-300 bg-emerald-900/40',
};

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ambulance, setAmbulance] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchAmbulance = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/ambulance/mine');
      setAmbulance(data);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchAmbulance(); }, [fetchAmbulance]);

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      const { data } = await axios.put('/api/ambulance/mine', { status });
      setAmbulance(data);
    } catch (_) {}
    finally { setUpdating(false); }
  };

  // Called by simulation to sync ambulance location to backend
  const syncLocation = useCallback(async (lat, lng, eta = 0) => {
    try {
      await axios.put('/api/ambulance/mine', {
        location: { lat, lng },
        eta,
        status: 'EMERGENCY',
      });
    } catch (_) {}
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Driver top bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🚑</span>
          <div>
            <span className="text-sm font-semibold text-white">{ambulance?.ambulanceId || 'Loading...'}</span>
            <span className="text-xs text-slate-400 ml-2">Driver: {user?.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status buttons */}
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => updateStatus(s)} disabled={updating || ambulance?.status === s}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors
                ${ambulance?.status === s ? statusColors[s] : 'border-slate-600 text-slate-500 hover:text-slate-300'}`}>
              {s === 'IDLE' ? '⚪ IDLE' : s === 'EMERGENCY' ? '🔴 EMERGENCY' : '🟢 ON DUTY'}
            </button>
          ))}
          <button onClick={handleLogout}
            className="text-xs bg-red-700/40 hover:bg-red-700 text-red-300 px-3 py-1.5 rounded-full border border-red-700 transition-colors ml-1">
            Logout
          </button>
        </div>
      </div>

      {/* Existing simulation dashboard fills the rest */}
      <div className="flex-1 overflow-hidden">
        <Dashboard onLocationUpdate={syncLocation} />
      </div>
    </div>
  );
}
