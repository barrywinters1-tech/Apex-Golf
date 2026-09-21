/**
 * Statcast "barrel zone" for golf: ball speed (x) × launch angle (y), each shot a dot
 * sized/coloured by carry, with the optimal driver window shaded. Answers "why doesn't
 * my speed turn into carry?" in one picture.
 */
const WINDOWS = {
  driver: { x: [140, 185], y: [9, 15], label: 'Optimal driver window', spin: [2000, 3000] },
  iron:   { x: [95, 140], y: [14, 22], label: 'Iron window' },
  wedge:  { x: [70, 110], y: [22, 34], label: 'Wedge window' },
};
export default function LaunchWindow({ shots = [], club = 'Driver' }) {
  const kind = /driver|wood/i.test(club) ? 'driver' : /wedge|gw|sw|lw|pw/i.test(club) ? 'wedge' : 'iron';
  const win = WINDOWS[kind];
  const W = 600, H = 260, L = 40, R = 16, T = 16, B = 30;
  const valid = shots.filter(s => s.bs != null && s.launch != null);
  const xs = valid.map(s => s.bs), ys = valid.map(s => s.launch);
  const xMin = Math.floor(Math.min(win.x[0], ...xs) / 10) * 10 - 5, xMax = Math.ceil(Math.max(win.x[1] - 20, ...xs) / 10) * 10 + 5;
  const yMin = Math.max(0, Math.floor(Math.min(win.y[0], ...ys)) - 2), yMax = Math.ceil(Math.max(win.y[1], ...ys)) + 2;
  const sx = x => L + ((x - xMin) / (xMax - xMin)) * (W - L - R);
  const sy = y => H - B - ((y - yMin) / (yMax - yMin)) * (H - T - B);
  const carries = valid.map(s => s.carry); const cLo = Math.min(...carries), cHi = Math.max(...carries);
  const t = c => (cHi > cLo ? (c - cLo) / (cHi - cLo) : 1);
  const inWin = valid.filter(s => s.bs >= win.x[0] && s.launch >= win.y[0] && s.launch <= win.y[1]).length;
  const xt = []; for (let x = Math.ceil(xMin / 10) * 10; x <= xMax; x += 10) xt.push(x);
  const yt = []; for (let y = Math.ceil(yMin / 2) * 2; y <= yMax; y += 2) yt.push(y);
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ball speed against launch angle">
        {yt.map(y => <line key={y} className="grid" x1={L} x2={W - R} y1={sy(y)} y2={sy(y)} />)}
        {yt.filter((_, i) => i % 2 === 0).map(y => <text key={y} x={L - 6} y={sy(y) + 4} textAnchor="end">{y}°</text>)}
        {xt.map(x => <text key={x} x={sx(x)} y={H - B + 16} textAnchor="middle">{x}</text>)}
        <rect className="window" x={sx(win.x[0])} y={sy(win.y[1])} width={Math.max(0, sx(Math.min(win.x[1], xMax)) - sx(win.x[0]))} height={sy(win.y[0]) - sy(win.y[1])} rx="8" />
        <text className="window-lab" x={sx(win.x[0]) + 8} y={sy(win.y[1]) + 14}>{win.label}</text>
        {valid.map((s, i) => <circle key={i} className="dot" cx={sx(s.bs)} cy={sy(s.launch)} r={4 + t(s.carry) * 5} style={{ fill: `color-mix(in oklab, var(--accuracy) ${Math.round(t(s.carry) * 100)}%, var(--speed))` }}><title>{`${s.bs} mph · ${s.launch}° · carry ${s.carry.toFixed(0)}${s.spin ? ` · ${s.spin} rpm` : ''}`}</title></circle>)}
        <text x={W - R} y={H - 4} textAnchor="end" className="axis-lab">ball speed, mph →</text>
        {!valid.length && <text x={W / 2} y={H / 2} textAnchor="middle">No launch data yet</text>}
      </svg>
      {valid.length > 0 && <div className="legend"><span className="lw-lo">shorter carry</span><span className="lw-hi">longer carry</span><span className="lw-n">{inWin} of {valid.length} in the window</span></div>}
    </div>
  );
}
