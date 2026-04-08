import { useState } from 'react';

export default function HospitalList({ hospitals, onSelect, selectedId }) {
  const [search, setSearch] = useState('');
  if (!hospitals.length) return null;

  const filtered = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🏥 Nearby Hospitals</h3>
        <span className="text-xs text-slate-600">{hospitals.length} within 50km</span>
      </div>

      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs">🔍</span>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter hospitals..."
          className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 outline-none
            rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-slate-600 transition-colors" />
      </div>

      <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-3">No hospitals match.</p>
        )}
        {filtered.map((h, idx) => {
          const isBest = idx === 0 && !search;
          const isSelected = selectedId === h.id;
          return (
            <button key={h.id} onClick={() => onSelect(h)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-all
                ${isSelected
                  ? 'bg-emerald-900/30 border-emerald-700/60 ring-1 ring-emerald-500/30'
                  : isBest
                  ? 'bg-blue-900/20 border-blue-800/40 hover:bg-blue-900/30'
                  : 'bg-white/3 border-white/8 hover:bg-white/8'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs font-medium truncate leading-snug
                  ${isSelected ? 'text-emerald-300' : isBest ? 'text-blue-300' : 'text-slate-200'}`}>
                  {h.name}
                </span>
                <span className="text-xs text-slate-500 shrink-0 bg-white/5 px-1.5 py-0.5 rounded-full">
                  {h.distanceKm}km
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {isBest && !search && (
                  <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-800/50">⭐ Nearest</span>
                )}
                {h.emergency && (
                  <span className="text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded-full border border-red-800/50">🚨 Emergency</span>
                )}
                {h.beds && <span className="text-xs text-slate-600">🛏 {h.beds}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
