/**
 * Strokes-gained waterfall (DataGolf style): start at par (scratch expectation),
 * step through each SG component, land on the score. Each step is a floating bar.
 */
export default function Waterfall({ par = 72, score, steps = [] }) {
  if (score == null || !steps.length) return <div className="empty">Log strokes gained on a round to see the waterfall.</div>;
  const W = 600, H = 220, L = 34, R = 16, T = 18, B = 28;
  const cols = [{ label: 'Par', v: par, abs: true }, ...steps.map(s => ({ label: s.label, v: -s.v })), { label: 'Score', v: score, abs: true }];
  // running level
  let level = par; const bars = cols.map((c, i) => { if (c.abs) { level = c.v; return { ...c, y0: 0, y1: c.v, abs: true }; } const y0 = level, y1 = level + c.v; level = y1; return { ...c, y0, y1 }; });
  const lo = Math.min(par, score, ...bars.map(b => Math.min(b.y0, b.y1))) - 1, hi = Math.max(par, score, ...bars.map(b => Math.max(b.y0, b.y1))) + 1;
  const sy = v => H - B - ((v - lo) / (hi - lo)) * (H - T - B);
  const slot = (W - L - R) / cols.length, bw = slot * 0.6;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Strokes gained waterfall">
      <line className="grid" x1={L} x2={W - R} y1={sy(par)} y2={sy(par)} />
      <text x={L - 4} y={sy(par) + 4} textAnchor="end">{par}</text>
      {bars.map((b, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        const top = b.abs ? sy(b.y1) : Math.min(sy(b.y0), sy(b.y1)), bottom = b.abs ? sy(lo) : Math.max(sy(b.y0), sy(b.y1));
        const cls = b.abs ? 'abs' : (b.v > 0 ? 'lost' : 'gained');
        const txt = b.abs ? b.v : `${b.v > 0 ? '+' : ''}${b.v.toFixed(1)}`;
        return (
          <g key={b.label}>
            {i > 0 && !b.abs && <line className="connector" x1={x - (slot - bw) / 2 - bw / 2 + 0} x2={x} y1={sy(b.y0)} y2={sy(b.y0)} />}
            <rect className={`wf ${cls}`} x={x} y={top} width={bw} height={Math.max(2, bottom - top)} rx="5" />
            <text className="lab" x={x + bw / 2} y={top - 6} textAnchor="middle">{txt}</text>
            <text x={x + bw / 2} y={H - B + 16} textAnchor="middle">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
