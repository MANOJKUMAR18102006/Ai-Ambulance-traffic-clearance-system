const densityColor = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-red-400' };
const densityBg = { low: 'bg-emerald-900/30 border-emerald-700', medium: 'bg-amber-900/30 border-amber-700', high: 'bg-red-900/30 border-red-700' };

export default function StatsPanel({ routeData, ambulancePos, signals, stepIndex, vehicles }) {
  if (!routeData) return null;

  const totalSteps = routeData.coords?.length || 1;
  const progress = Math.round((stepIndex / Math.max(totalSteps - 1, 1)) * 100);
  const distanceDone = routeData.distance * (progress / 100);
  const etaMin = Math.max(0, Math.round(routeData.duration * (1 - progress / 100)));

  const greenCount = signals.filter((s) => s.status === 'green').length;
  const redCount = signals.length - greenCount;
  const highDensityCount = signals.filter((s) => s.trafficDensity === 'high').length;
  const clearedVehicles = vehicles?.filter((v) => v.cleared).length || 0;

  return (
    <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
      <h2 className="text-sm font-semibold text-slate-200 mb-3">📊 Live Dashboard</h2>
      <div className="grid grid-cols-2 gap-2">

        <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-600">
          <div className="text-xs text-slate-400">📍 Position</div>
          <div className="text-xs text-white mt-1 font-mono">
            {ambulancePos ? `${ambulancePos[0].toFixed(4)}, ${ambulancePos[1].toFixed(4)}` : '—'}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-600">
          <div className="text-xs text-slate-400">⏱ ETA</div>
          <div className="text-lg font-bold text-blue-400">{etaMin} min</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-600">
          <div className="text-xs text-slate-400">🛣 Distance</div>
          <div className="text-sm font-bold text-purple-400">{distanceDone.toFixed(1)} / {routeData.distance} km</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-600">
          <div className="text-xs text-slate-400">📶 Progress</div>
          <div className="text-lg font-bold text-emerald-400">{progress}%</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-600">
          <div className="text-xs text-slate-400">🚦 Signals</div>
          <div className="flex gap-1.5 mt-1">
            <span className="text-xs text-emerald-400">🟢 {greenCount}</span>
            <span className="text-xs text-red-400">🔴 {redCount}</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-600">
          <div className="text-xs text-slate-400">🚗 Cleared</div>
          <div className="text-lg font-bold text-amber-400">{clearedVehicles}</div>
        </div>

      </div>

      {/* Traffic density bar */}
      <div className={`mt-2 rounded-lg p-2.5 border ${densityBg[routeData.traffic] || densityBg.low}`}>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-300">Traffic Density</span>
          <span className={`text-xs font-bold uppercase ${densityColor[routeData.traffic]}`}>{routeData.traffic}</span>
        </div>
        {highDensityCount > 0 && (
          <div className="text-xs text-red-400 mt-1">⚠️ {highDensityCount} high-density signal(s) on route</div>
        )}
      </div>

      {/* Route indicator removed — single route only */}
    </div>
  );
}
