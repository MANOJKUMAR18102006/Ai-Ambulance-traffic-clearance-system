const TRAFFIC_STYLE = {
  low:    { bg: 'bg-emerald-900/20 border-emerald-800/50', text: 'text-emerald-400', bar: 'bg-emerald-500', label: 'CLEAR' },
  medium: { bg: 'bg-amber-900/20 border-amber-800/50',    text: 'text-amber-400',   bar: 'bg-amber-500',   label: 'MODERATE' },
  high:   { bg: 'bg-red-900/20 border-red-800/50',        text: 'text-red-400',     bar: 'bg-red-500',     label: 'HEAVY' },
};

export default function RouteInfo({ routeData, signals, stepIndex, isRunning, onStart, onStop, loading, currentInstruction }) {
  const greenCount = signals.filter((s) => s.status === 'green').length;
  const redCount = signals.length - greenCount;
  const progress = routeData
    ? Math.round((stepIndex / Math.max(routeData.coords.length - 1, 1)) * 100)
    : 0;
  const ts = TRAFFIC_STYLE[routeData?.traffic] || TRAFFIC_STYLE.low;

  return (
    <div className="flex flex-col gap-3">
      {routeData && (
        <>
          {/* Distance + ETA */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-400/70 mb-1 uppercase tracking-wider">Distance</div>
              <div className="text-2xl font-bold text-blue-400">{routeData.distance}</div>
              <div className="text-xs text-blue-400/50">km</div>
            </div>
            <div className="bg-purple-900/20 border border-purple-800/50 rounded-xl p-3 text-center">
              <div className="text-xs text-purple-400/70 mb-1 uppercase tracking-wider">ETA</div>
              <div className="text-2xl font-bold text-purple-400">{routeData.duration}</div>
              <div className="text-xs text-purple-400/50">min</div>
            </div>
          </div>

          {/* Traffic status */}
          <div className={`rounded-xl p-3 border ${ts.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Traffic Condition</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ts.text} bg-white/5`}>{ts.label}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${ts.bar}`}
                style={{ width: routeData.traffic === 'high' ? '90%' : routeData.traffic === 'medium' ? '55%' : '20%' }} />
            </div>
            {routeData.trafficZones?.length > 0 && (
              <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <span>⚠️</span> {routeData.trafficZones.length} congestion zone(s) detected
              </div>
            )}
          </div>

          {/* Signal corridor status */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Signal Corridor</span>
              <span className="text-xs text-slate-500">{signals.length} signals</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-emerald-400">{greenCount}</div>
                <div className="text-xs text-emerald-600">🟢 Green</div>
              </div>
              <div className="flex-1 bg-red-900/30 border border-red-800/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-red-400">{redCount}</div>
                <div className="text-xs text-red-600">🔴 Red</div>
              </div>
            </div>
          </div>

          {/* Navigation instruction */}
          {currentInstruction && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-3 flex items-start gap-2">
              <span className="text-lg shrink-0">🗣️</span>
              <div>
                <div className="text-xs text-amber-500 uppercase tracking-wider mb-0.5">Navigation</div>
                <div className="text-sm text-white font-medium leading-snug">{currentInstruction}</div>
              </div>
            </div>
          )}

          {/* Progress */}
          {isRunning && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Corridor Progress</span>
                <span className="text-sm font-bold text-blue-400">{progress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Control button */}
          {!isRunning ? (
            <button onClick={onStart} disabled={loading}
              className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500
                disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all
                shadow-lg shadow-red-900/40 flex items-center justify-center gap-2">
              <span className="text-lg">🚑</span> Activate Green Corridor
            </button>
          ) : (
            <button onClick={onStop}
              className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600
                text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
              <span>⏹</span> Stop Simulation
            </button>
          )}
        </>
      )}

      {!routeData && !loading && (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-slate-500 text-sm">Set start & destination,<br />then fetch route.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Calculating optimal route...</p>
        </div>
      )}
    </div>
  );
}
