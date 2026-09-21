/**
 * Small SVG line chart. One y-scale only (never dual-axis).
 * points: [{x: label, y: number}]  series2: optional second line (blue)
 * target: dashed amber line   bench: dotted blue line
 */
export default function LineChart({ points = [], series2, target, bench, dec = 0, zero = false, label = 'chart' }) {
  const W = 520, H = 200, L = 40, R = 22, T = 14, B = 28;
  if (!points.length) return <div className="empty">No data yet.</div>;
  const ys = points.map(p => p.y).concat(series2 ? series2.map(p => p.y) : []);
  if (target != null) ys.push(target);
  if (bench != null) ys.push(bench);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  const n = points.length;
  const xs = i => (n === 1 ? L + (W - L - R) / 2 : L + (W - L - R) * i / (n - 1));
  const yy = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const ticks = [0, 1, 2, 3, 4].map(i => lo + (hi - lo) * i / 4);
  const every = Math.ceil(n / 6);
  const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${xs(i)},${yy(p.y)}`).join(' ');
  const last = points[n - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((v, i) => <g key={i}><line className="grid" x1={L} x2={W - R} y1={yy(v)} y2={yy(v)} /><text x={L - 6} y={yy(v) + 4} textAnchor="end">{v.toFixed(dec)}</text></g>)}
      <line className="axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      {points.map((p, i) => (i % every === 0 || i === n - 1) && <text key={i} x={xs(i)} y={H - B + 16} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}>{p.x}</text>)}
      {bench != null && <line className="bench" x1={L} x2={W - R} y1={yy(bench)} y2={yy(bench)} />}
      {target != null && <line className="target" x1={L} x2={W - R} y1={yy(target)} y2={yy(target)} />}
      {series2 && <>
        <path d={path(series2)} className="s2" />
        {series2.map((p, i) => <circle key={i} className="s2d" cx={xs(i)} cy={yy(p.y)} r="3.5"><title>{p.x}: {p.y.toFixed(dec)}</title></circle>)}
      </>}
      <path d={path(points)} className="s1" />
      {points.map((p, i) => <circle key={i} className="s1d" cx={xs(i)} cy={yy(p.y)} r={i === n - 1 ? 5 : 3.5}><title>{p.x}: {p.y.toFixed(dec)}</title></circle>)}
      <text className="lab" x={xs(n - 1) - 8} y={yy(last.y) - 9} textAnchor="end">{last.y.toFixed(dec)}</text>
    </svg>
  );
}
