import { useEffect, useRef } from 'react';
import { animate } from 'motion';

/**
 * Attribute radar (StatsBomb / FIFA card). axes: [{key, label, value (0-100), ref (0-100)}]
 * value = the player, ref = the comparison outline (D1 by default).
 */
export default function Radar({ axes = [], size = 260, refLabel = 'D1' }) {
  const ref = useRef(null);
  const cx = size / 2, r = size / 2 - 48, n = axes.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; const d = (r * Math.max(0, Math.min(100, v))) / 100; return [cx + d * Math.cos(a), cx + d * Math.sin(a)]; };
  const poly = vals => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  useEffect(() => {
    const el = ref.current?.querySelector('.you'); if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animate(el, { opacity: [0, 1], scale: [0.6, 1] }, { type: 'spring', bounce: 0.25, duration: 0.9 });
  }, [axes.map(a => a.value).join()]);
  return (
    <svg ref={ref} className="radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={axes.map(a => `${a.label} ${Math.round(a.value)}`).join(', ')}>
      {[25, 50, 75, 100].map(g => <polygon key={g} className="ring" points={poly(axes.map(() => g))} />)}
      {axes.map((a, i) => { const [x, y] = pt(i, 100); return <line key={a.key} className="spoke" x1={cx} y1={cx} x2={x} y2={y} />; })}
      <polygon className="refp" points={poly(axes.map(a => a.ref ?? 0))} />
      <polygon className="you" points={poly(axes.map(a => a.value ?? 0))} style={{ transformOrigin: `${cx}px ${cx}px` }} />
      {axes.map((a, i) => { const [x, y] = pt(i, a.value ?? 0); return <circle key={a.key} className="youdot" cx={x} cy={y} r="4" />; })}
      {axes.map((a, i) => { const [x, y] = pt(i, 124); const anchor = Math.abs(x - cx) < 6 ? 'middle' : x < cx ? 'end' : 'start'; return <g key={a.key}><text className="lab" x={x} y={y - 2} textAnchor={anchor}>{a.label}</text><text className="val" x={x} y={y + 12} textAnchor={anchor}>{a.value == null ? '—' : Math.round(a.value)}</text></g>; })}
    </svg>
  );
}

/** Map raw numbers to 0–100 where 100 = the Tour reference and ~70 = D1. */
export const scale = (v, scratch, d1, tour, lowerBetter = false) => {
  if (v == null) return null;
  const pts = lowerBetter ? [[tour, 100], [d1, 70], [scratch, 50]] : [[scratch, 50], [d1, 70], [tour, 100]];
  const sorted = lowerBetter ? pts.slice().sort((a, b) => b[0] - a[0]) : pts;
  // piecewise linear through (scratch,50),(d1,70),(tour,100), extrapolate below scratch to 0 at 60% of the way
  const [s, d, t] = lowerBetter ? [scratch, d1, tour] : [scratch, d1, tour];
  const lerp = (x, x0, y0, x1, y1) => y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
  if (!lowerBetter) { if (v >= t) return 100; if (v >= d) return lerp(v, d, 70, t, 100); if (v >= s) return lerp(v, s, 50, d, 70); return Math.max(0, lerp(v, s * 0.7, 0, s, 50)); }
  if (v <= t) return 100; if (v <= d) return lerp(v, d, 70, t, 100); if (v <= s) return lerp(v, s, 50, d, 70); return Math.max(0, lerp(v, s * 1.3, 0, s, 50));
};
