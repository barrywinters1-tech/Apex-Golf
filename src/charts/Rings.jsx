import { useEffect, useRef } from 'react';
import { animate } from 'motion';

/**
 * Apple-Fitness-style concentric rings. rings: [{key, label, value, target, unit, color, dec}]
 * Progress = value/target, clamped to 1 (over-target still closes the ring).
 */
export default function Rings({ rings = [], size = 260 }) {
  const ref = useRef(null);
  const cx = size / 2, stroke = size * 0.095, gap = stroke * 0.3;
  const radii = rings.map((_, i) => size / 2 - stroke / 2 - i * (stroke + gap));

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rings.forEach((r, i) => {
      const arc = el.querySelector(`[data-ring="${r.key}"]`); if (!arc) return;
      const C = 2 * Math.PI * radii[i];
      const p = Math.max(0.02, Math.min(1, (r.value ?? 0) / (r.target || 1)));
      const to = C * (1 - p);
      if (reduced) { arc.style.strokeDashoffset = to; return; }
      arc.style.strokeDashoffset = C;
      animate(C, to, { type: 'spring', bounce: 0, duration: 1.4, delay: 0.15 + i * 0.12, onUpdate: v => { arc.style.strokeDashoffset = v; } });
    });
  }, [rings.map(r => `${r.key}:${r.value}:${r.target}`).join('|')]);

  return (
    <svg ref={ref} className="rings" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={rings.map(r => `${r.label} ${r.value ?? '—'} of ${r.target}`).join(', ')}>
      <defs>
        {rings.map(r => <filter key={r.key} id={`rg-${r.key}`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation={stroke * 0.12} floodColor={r.color} floodOpacity="0.35" /></filter>)}
      </defs>
      <g transform={`rotate(-90 ${cx} ${cx})`}>
        {rings.map((r, i) => {
          const R = radii[i], C = 2 * Math.PI * R;
          return (
            <g key={r.key}>
              <circle cx={cx} cy={cx} r={R} fill="none" stroke={r.color} strokeOpacity="0.18" strokeWidth={stroke} />
              <circle data-ring={r.key} cx={cx} cy={cx} r={R} fill="none" stroke={r.color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C} filter={`url(#rg-${r.key})`} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
