const trafficColors = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-red-400' };
const trafficBg = {
  low: 'bg-emerald-900/40 border-emerald-700',
  medium: 'bg-amber-900/40 border-amber-700',
  high: 'bg-red-900/40 border-red-700',
};

export default function RouteInfo({ routeData, signals, stepIndex, isRunning, onStart, onStop, loading, currentInstruction }) {
  const greenCount = signals.filter((s) => s.status === 'green').length;
  const progress = routeData
    ? Math.round((stepIndex / Math.max(routeData.coords.length - 1, 1)) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {routeData && (
        <>
          {/* Route summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/60 rounded-xl p-3 text-center border border-slate-600">
              <div className="text-2xl font-bold text-blue-400">{routeData.distance} km</div>
              <div className="text-xs text-slate-400 mt-1">Distance</div>
            </div>
            <div className="bg-slate-700/60 rounded-xl p-3 text-center border border-slate-600">
              <div className="text-2xl font-bold text-purple-400">{routeData.duration} min</div>
              <div className="text-xs text-slate-400 mt-1">ETA</div>
            </div>
          </div>

          {/* Traffic level */}
          <div className={`rounded-xl p-3 border ${trafficBg[routeData.traffic] || trafficBg.low}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Traffic Level</span>
              <span className={`font-bold uppercase text-sm ${trafficColors[routeData.traffic]}`}>{routeData.traffic}</span>
            </div>
            {routeData.trafficZones?.length > 0 && (
              <div className="text-xs text-red-400 mt-1">⚠️ {routeData.trafficZones.length} high-traffic zone(s) detected</div>
            )}
          </div>

          {/* Signals */}
          <div className="bg-slate-700/60 rounded-xl p-3 border border-slate-600">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">🚦 Signals</span>
              <span className="text-slate-300">{signals.length} total</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="bg-emerald-900/60 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-700">🟢 {greenCount} Green</span>
              <span className="bg-red-900/60 text-red-400 px-2 py-1 rounded-lg border border-red-700">🔴 {signals.length - greenCount} Red</span>
            </div>
          </div>

          {/* Navigation instruction */}
          {currentInstruction && (
            <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-3">
              <div className="text-xs text-amber-400 mb-1">🗣 Navigation</div>
              <div className="text-sm text-white font-medium">{currentInstruction}</div>
            </div>
          )}

          {/* Progress bar */}
          {isRunning && (
            <div className="bg-slate-700/60 rounded-xl p-3 border border-slate-600">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Progress</span>
                <span className="text-blue-400">{progress}%</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {!isRunning ? (
              <button onClick={onStart} disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors">
                🚑 Start Simulation
              </button>
            ) : (
              <button onClick={onStop}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl transition-colors">
                ⏹ Stop
              </button>
            )}
          </div>
        </>
      )}

      {!routeData && !loading && (
        <div className="text-center text-slate-400 text-sm py-4">
          <div className="text-4xl mb-2">🗺️</div>
          Set start & destination, then fetch route.
        </div>
      )}

      {loading && (
        <div className="text-center text-blue-400 text-sm py-4">
          <div className="text-3xl mb-2 animate-spin">⏳</div>
          Fetching optimal route...
        </div>
      )}
    </div>
  );
}
