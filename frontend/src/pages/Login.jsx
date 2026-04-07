import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'driver' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🚑</div>
          <h1 className="text-2xl font-bold text-white">AI Ambulance Traffic Clearance</h1>
          <p className="text-slate-400 text-sm mt-1">Smart Green Corridor System</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
          {/* Mode toggle */}
          <div className="flex bg-slate-700 rounded-xl p-1 mb-6">
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                  ${mode === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="John Doe" required
                  className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 outline-none rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500" />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="you@example.com" required
                className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 outline-none rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500" />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Password</label>
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 outline-none rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500" />
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Role</label>
                <div className="flex gap-3">
                  {['driver', 'admin'].map((r) => (
                    <button type="button" key={r} onClick={() => set('role', r)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize
                        ${form.role === r
                          ? r === 'admin' ? 'bg-purple-700 border-purple-500 text-white' : 'bg-blue-700 border-blue-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'}`}>
                      {r === 'driver' ? '🚑 Driver' : '🛡 Admin'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-2.5 text-sm text-red-400">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mt-1">
              {loading ? '⏳ Please wait...' : mode === 'login' ? '🔐 Login' : '✅ Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Demo: admin@demo.com / driver@demo.com — password: demo1234
        </p>
      </div>
    </div>
  );
}
