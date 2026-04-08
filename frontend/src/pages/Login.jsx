import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'driver' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, role: form.role };
      const { data } = await axios.post(url, payload);
      login(data.user, data.token);
      navigate(data.user.role === 'admin' ? '/admin' : '/driver');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#0d1b2a] to-[#0a0f1e] border-r border-red-900/30 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-xl">🚑</div>
          <span className="text-white font-bold text-lg tracking-wide">AmbulanceAI</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-400 text-xs font-semibold tracking-widest uppercase">Live System Active</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            AI-Powered<br />
            <span className="text-red-500">Green Corridor</span><br />
            System
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Intelligent traffic clearance for emergency vehicles. Real-time signal control, route optimization, and live ambulance tracking.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { icon: '🚦', label: 'Smart Signals', desc: 'Auto green corridor' },
              { icon: '🗺️', label: 'Live Routing', desc: 'ORS optimized' },
              { icon: '📡', label: 'Real-time', desc: 'Live tracking' },
            ].map((f) => (
              <div key={f.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-white text-xs font-semibold">{f.label}</div>
                <div className="text-slate-500 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-slate-600 text-xs">
          Demo: admin@demo.com · driver@demo.com · password: demo1234
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-xl">🚑</div>
            <span className="text-white font-bold text-lg">AmbulanceAI</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            {mode === 'login' ? 'Sign in to your dashboard' : 'Register to get started'}
          </p>

          {/* Toggle */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6 border border-white/10">
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize
                  ${mode === m ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                {m === 'login' ? '🔐 Sign In' : '✨ Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Full Name</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="John Doe" required
                  className="w-full bg-white/5 border border-white/10 focus:border-red-500 outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 transition-colors" />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email Address</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="you@example.com" required
                className="w-full bg-white/5 border border-white/10 focus:border-red-500 outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 transition-colors" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="••••••••" required
                  className="w-full bg-white/5 border border-white/10 focus:border-red-500 outline-none rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-600 transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Select Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'driver', icon: '🚑', label: 'Driver', desc: 'Ambulance operator' },
                    { value: 'admin', icon: '🛡️', label: 'Admin', desc: 'Traffic authority' },
                  ].map((r) => (
                    <button type="button" key={r.value} onClick={() => set('role', r.value)}
                      className={`p-3 rounded-xl border text-left transition-all
                        ${form.role === r.value
                          ? 'border-red-500 bg-red-600/20 text-white'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'}`}>
                      <div className="text-xl mb-1">{r.icon}</div>
                      <div className="text-xs font-semibold">{r.label}</div>
                      <div className="text-xs opacity-60">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all mt-1 shadow-lg shadow-red-900/30">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Please wait...
                </span>
              ) : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-red-400 hover:text-red-300 font-medium">
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
