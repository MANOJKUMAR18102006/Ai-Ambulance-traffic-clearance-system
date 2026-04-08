import L from 'leaflet';

export const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:28px;filter:drop-shadow(0 0 8px #ef4444);animation:pulse 1s infinite;">🚑</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:26px;filter:drop-shadow(0 0 6px #22c55e);">🏥</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export const startIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:24px;">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export const vehicleIcon = (cleared) => L.divIcon({
  className: '',
  html: `<div style="font-size:18px;opacity:${cleared ? 0.5 : 1};transform:${cleared ? 'translateX(8px)' : 'none'};transition:all 0.5s;">🚗</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function accidentIcon(severity = 'MEDIUM') {
  const color = severity === 'HIGH' ? '#dc2626' : severity === 'LOW' ? '#f59e0b' : '#ef4444';
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:32px;height:32px;background:${color};border:2px solid white;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        box-shadow:0 0 12px ${color},0 0 24px ${color}88;
        display:flex;align-items:center;justify-content:center;
      "><span style="transform:rotate(45deg);font-size:15px;">⚠️</span></div>
    </div>`,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
  });
}

export function signalIcon(status, density = 'low') {
  const isGreen  = status === 'green';
  const isYellow = status === 'yellow';
  const isVirtual = density === 'virtual';

  if (isVirtual) {
    const color = isGreen ? '#22c55e' : isYellow ? '#f59e0b' : '#a78bfa';
    return L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;background:${color};border:2px solid white;
        transform:rotate(45deg);box-shadow:0 0 8px ${color};opacity:0.9;
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
        <div style="width:3px;height:10px;background:#555;"></div>
        <div style="
          background:#1a1a1a;border:1.5px solid #444;border-radius:4px;
          padding:3px 2px;display:flex;flex-direction:column;align-items:center;
          gap:2px;box-shadow:0 2px 6px rgba(0,0,0,0.6);width:14px;
        ">
          <div style="width:8px;height:8px;border-radius:50%;
            background:${isGreen || isYellow ? '#4a0000' : '#ff2200'};
            box-shadow:${isGreen || isYellow ? 'none' : '0 0 6px #ff2200,0 0 10px #ff0000'};
          "></div>
          <div style="width:8px;height:8px;border-radius:50%;
            background:${isYellow ? '#f59e0b' : '#3a2a00'};
            box-shadow:${isYellow ? '0 0 6px #f59e0b,0 0 10px #f59e0b' : 'none'};
          "></div>
          <div style="width:8px;height:8px;border-radius:50%;
            background:${isGreen ? '#00e600' : '#003a00'};
            box-shadow:${isGreen ? '0 0 6px #00e600,0 0 10px #00cc00' : 'none'};
          "></div>
        </div>
      </div>`,
    iconSize: [14, 42],
    iconAnchor: [7, 42],
  });
}
