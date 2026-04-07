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

export function signalIcon(status, density = 'low') {
  const isGreen = status === 'green';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:0;
      ">
        <!-- pole -->
        <div style="
          width:3px;
          height:10px;
          background:#555;
          margin-bottom:0;
        "></div>
        <!-- housing -->
        <div style="
          background:#1a1a1a;
          border:1.5px solid #444;
          border-radius:4px;
          padding:3px 2px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:2px;
          box-shadow:0 2px 6px rgba(0,0,0,0.6);
          width:14px;
        ">
          <!-- red light -->
          <div style="
            width:8px;height:8px;border-radius:50%;
            background:${isGreen ? '#4a0000' : '#ff2200'};
            box-shadow:${isGreen ? 'none' : '0 0 6px #ff2200, 0 0 10px #ff0000'};
          "></div>
          <!-- yellow light -->
          <div style="
            width:8px;height:8px;border-radius:50%;
            background:#3a2a00;
          "></div>
          <!-- green light -->
          <div style="
            width:8px;height:8px;border-radius:50%;
            background:${isGreen ? '#00e600' : '#003a00'};
            box-shadow:${isGreen ? '0 0 6px #00e600, 0 0 10px #00cc00' : 'none'};
          "></div>
        </div>
      </div>
    `,
    iconSize: [14, 42],
    iconAnchor: [7, 42],
  });
}
