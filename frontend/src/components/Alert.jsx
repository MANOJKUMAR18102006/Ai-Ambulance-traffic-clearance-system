import { useEffect } from 'react';

const STYLES = {
  warning: { bg: 'bg-amber-950/95 border-amber-700/60',  text: 'text-amber-300',  icon: '⚠️' },
  success: { bg: 'bg-emerald-950/95 border-emerald-700/60', text: 'text-emerald-300', icon: '✅' },
  error:   { bg: 'bg-red-950/95 border-red-700/60',      text: 'text-red-300',    icon: '🚨' },
  info:    { bg: 'bg-blue-950/95 border-blue-700/60',    text: 'text-blue-300',   icon: 'ℹ️' },
};

export default function Alert({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  const s = STYLES[type] || STYLES.info;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3
      px-5 py-3 rounded-2xl border backdrop-blur-sm shadow-2xl
      ${s.bg} ${s.text} max-w-sm w-full mx-4`}>
      <span className="text-lg shrink-0">{s.icon}</span>
      <span className="text-sm font-medium flex-1 leading-snug">{message}</span>
      <button onClick={onClose} className="text-current opacity-40 hover:opacity-80 text-lg leading-none shrink-0">×</button>
    </div>
  );
}
