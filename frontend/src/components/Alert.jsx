import { useEffect } from 'react';

export default function Alert({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  const colors = {
    warning: 'bg-amber-500 border-amber-300',
    success: 'bg-emerald-600 border-emerald-400',
    error: 'bg-red-600 border-red-400',
    info: 'bg-blue-600 border-blue-400',
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl border-2
        text-white font-semibold shadow-2xl flex items-center gap-3 animate-bounce
        ${colors[type] || colors.info}`}
    >
      <span className="text-xl">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white text-lg">✕</button>
    </div>
  );
}
