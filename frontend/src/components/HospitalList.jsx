import { useState } from 'react';

export default function HospitalList({ hospitals, onSelect, selectedId }) {
  const [search, setSearch] = useState('');

  if (!hospitals.length) return null;

  const filtered = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
      <h3 className="text-sm font-semibold text-slate-200 mb-2">
        🏥 Nearby Hospitals <span className="text-slate-400 font-normal">({hospitals.length} within 50 km)</span>
      </h3>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search hospitals..."
          className="w-full bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none
            rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500"
        />
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-3">No hospitals match your search.</p>
        )}
        {filtered.map((h, idx) => {
          const isBest = idx === 0 && !search;
          const isSelected = selectedId === h.id;
          return (
            <button
              key={h.id}
              onClick={() => onSelect(h)}
              className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-colors
                ${isSelected
                  ? 'bg-emerald-700/60 border-emerald-500'
                  : isBest
                  ? 'bg-blue-900/40 border-blue-600 hover:bg-blue-800/50'
                  : 'bg-slate-700/40 border-slate-600 hover:bg-slate-600/60'
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`font-medium truncate ${isSelected ? 'text-emerald-300' : isBest ? 'text-blue-300' : 'text-slate-200'}`}>
                  {h.name}
                </span>
                <span className="shrink-0 text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded-md">
                  {h.distanceKm} km
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {isBest && !search && (
                  <span className="text-xs bg-blue-700/60 text-blue-300 px-1.5 py-0.5 rounded border border-blue-600">
                    ⭐ Nearest
                  </span>
                )}
                {h.emergency && (
                  <span className="text-xs bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded border border-red-700">
                    🚨 Emergency
                  </span>
                )}
                {h.beds && (
                  <span className="text-xs text-slate-400">🛏 {h.beds} beds</span>
                )}
                {h.phone && (
                  <span className="text-xs text-slate-400 truncate">📞 {h.phone}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
