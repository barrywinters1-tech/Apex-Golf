/** Horizontal diverging bars for strokes gained. items: [{label, v}] */
export default function BarChart({ items = [], empty = 'No data yet.' }) {
  if (!items.length) return <div className="empty">{empty}</div>;
  const W = 520, H = 40 + items.length * 30, L = 110, R = 50;
  const m = Math.max(1, ...items.map(i => Math.abs(i.v)));
  const x0 = L + (W - L - R) / 2, sc = (W - L - R) / 2 / m;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Strokes gained by category">
      <line className="axis" x1={x0} x2={x0} y1="8" y2={H - 8} />
      {items.map((it, i) => {
        const y = 16 + i * 30, w = Math.abs(it.v) * sc, x = it.v < 0 ? x0 - w : x0;
        const txt = (it.v > 0 ? '+' : '') + it.v.toFixed(1);
        return (
          <g key={it.label}>
            <text x={L - 8} y={y + 15} textAnchor="end">{it.label}</text>
            <rect className={`bar ${it.v < 0 ? 'neg' : ''}`} x={x} y={y} width={Math.max(w, 1)} height="20" rx="3"><title>{it.label}: {txt}</title></rect>
            <text className="lab" x={it.v < 0 ? x0 + 6 : x0 - 6} y={y + 15} textAnchor={it.v < 0 ? 'start' : 'end'}>{txt}</text>
          </g>
        );
      })}
    </svg>
  );
}
