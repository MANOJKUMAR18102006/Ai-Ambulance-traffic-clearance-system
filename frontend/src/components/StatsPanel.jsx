const LOG_STYLE = {
  success: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/40',
  warning: 'text-amber-400 bg-amber-900/20 border-amber-800/40',
  error:   'text-red-400 bg-red-900/20 border-red-800/40',
  info:    'text-blue-400 bg-blue-900/20 border-blue-800/40',
};

export default function StatsPanel({ routeData, ambulancePos, signals, stepIndex, vehicles, preClearStatus, alertLog }) {
  if (!routeData) return null;

  const totalSteps      = routeData.coords?.length || 1;
  const progress        = Math.round((stepIndex / Math.max(totalSteps - 1, 1)) * 100);
  const distanceDone    = (routeData.distance * progress / 100).toFixed(1);
  const etaMin          = Math.max(0, Math.round(routeData.duration * (1 - progress / 100)));
  const greenCount      = signals.filter((s) => s.status === 'green').length;
  const yellowCount     = signals.filter((s) => s.status === 'yellow').length;
  const redCount        = signals.filter((s) => s.status === 'red').length;
  const clearedVehicles = vehicles?.filter((v) => v.cleared).length || 0;
  const highDensity     = signals.filter((s) => s.trafficDensity === 'high').length;
  const virtualCount    = signals.filter((s) => s.isVirtual).length;

  return (
    <div className="flex flex-col gap-3">

      {/* Pre-clearance status */}
      {preClearStatus && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pre-Clearance Status</span>
          </div>
          <p className="text-sm text-white font-medium leading-snug">{preClearStatus}</p>
        </div>
      )}

      {/* Signal corridor breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Signal Corridor</div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-emerald-400">{greenCount}</div>
            <div className="text-xs text-emerald-600">🟢 Green</div>
          </div>
          <div className="bg-amber-900/30 border border-amber-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-amber-400">{yellowCount}</div>
            <div className="text-xs text-amber-600">🟡 Pre-clear</div>
          </div>
          <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-400">{redCount}</div>
            <div className="text-xs text-red-600">🔴 Red</div>
          </div>
        </div>
        {virtualCount > 0 && (
          <div className="mt-2 text-xs text-purple-400 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-purple-500 rotate-45 inline-block"></span>
            {virtualCount} virtual control point{virtualCount > 1 ? 's' : ''} active
          </div>
        )}
      </div>

      {/* Live stats grid */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Live Operations</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'ETA',       value: `${etaMin} min`,        color: 'text-blue-400',    icon: '⏱️' },
            { label: 'Covered',   value: `${distanceDone} km`,   color: 'text-purple-400',  icon: '🛣️' },
            { label: 'Vehicles',  value: `${clearedVehicles}`,   color: 'text-amber-400',   icon: '🚗' },
            { label: 'High Zones',value: `${highDensity}`,       color: 'text-red-400',     icon: '⚠️' },
          ].map((t) => (
            <div key={t.label} className="bg-white/5 rounded-lg p-2 border border-white/8">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs">{t.icon}</span>
                <span className="text-xs text-slate-600">{t.label}</span>
              </div>
              <div className={`text-base font-bold ${t.color}`}>{t.value}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Route Progress</span>
            <span className="text-blue-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Alert log */}
      {alertLog?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Alert Log</div>
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
            {alertLog.map((log, i) => (
              <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg border text-xs ${LOG_STYLE[log.type] || LOG_STYLE.info}`}>
                <span className="text-slate-600 shrink-0 font-mono">{log.time}</span>
                <span className="leading-snug">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
