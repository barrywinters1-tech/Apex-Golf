import { useEffect, useRef } from 'react';
import { animate, stagger } from 'motion';

/**
 * Top-down dispersion field from real shots. x = lateral (yds, right +), y = carry (yds).
 * Draws: yardage grid, fairway band, 1σ ellipse, every shot, mean carry, benchmark lines.
 */
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };

export default function Dispersion({ shots = [], club = 'Driver', benchmarks = [], fairway = 15, compact = false }) {
  const ref = useRef(null);
  const W = 600, H = compact ? 300 : 420, PAD = 36;
  const carries = shots.map(s => s.carry), lats = shots.map(s => s.lat ?? 0);
  const hasShots = shots.length > 0;
  const cMean = hasShots ? mean(carries) : 0, cSd = shots.length > 1 ? sd(carries) : 0;
  const lMean = hasShots ? mean(lats) : 0, lSd = shots.length > 1 ? sd(lats) : 0;

  // Floor the field on 'real' shots so one mishit doesn't squash everything; mishits still plot (clamped to the bottom edge).
  const core = hasShots ? carries.filter(c => c >= cMean * 0.75) : [];
  const yMin = Math.floor(((core.length ? Math.min(...core) : 150) - 25) / 25) * 25;
  const yMax = Math.ceil((Math.max(hasShots ? Math.max(...carries) : 250, ...benchmarks.map(b => b.v)) + 20) / 25) * 25;
  const xSpan = Math.max(30, Math.ceil((hasShots ? Math.max(...lats.map(Math.abs)) : 20) / 10) * 10 + 10);
  const sx = x => W / 2 + (x / xSpan) * (W / 2 - PAD);
  const sy = y => H - PAD - ((Math.max(y, yMin) - yMin) / (yMax - yMin)) * (H - PAD - 24);

  useEffect(() => {
    if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dots = ref.current.querySelectorAll('.shot');
    animate(dots, { opacity: [0, 1], scale: [0.2, 1] }, { delay: stagger(0.035), type: 'spring', bounce: 0.35, duration: 0.6 });
    const ell = ref.current.querySelector('.ellipse'); if (ell) animate(ell, { opacity: [0, 1] }, { delay: 0.5, duration: 0.6 });
  }, [shots]);

  const yTicks = []; for (let y = yMin; y <= yMax; y += 25) yTicks.push(y);
  const xTicks = []; for (let x = -xSpan; x <= xSpan; x += 10) xTicks.push(x);

  return (
    <svg ref={ref} className="disp" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${club} dispersion, ${shots.length} shots`}>
      <defs>
        <radialGradient id="turf" cx="50%" cy="100%" r="90%"><stop offset="0" stopColor="var(--turf-hi)" /><stop offset="1" stopColor="var(--turf-lo)" /></radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="14" fill="url(#turf)" />
      {/* fairway band */}
      <rect x={sx(-fairway)} y={12} width={sx(fairway) - sx(-fairway)} height={H - PAD - 12} fill="var(--fairway)" />
      <line x1={W / 2} x2={W / 2} y1={12} y2={H - PAD} className="centre" />
      {yTicks.map(y => <g key={y}><line x1={PAD} x2={W - PAD} y1={sy(y)} y2={sy(y)} className="yard" /><text x={PAD - 6} y={sy(y) + 4} textAnchor="end" className="tick">{y}</text></g>)}
      {xTicks.filter(x => x !== 0).map(x => <text key={x} x={sx(x)} y={H - PAD + 16} textAnchor="middle" className="tick">{x > 0 ? `${x}R` : `${-x}L`}</text>)}
      {benchmarks.map(b => <g key={b.label}><line x1={PAD} x2={W - PAD} y1={sy(b.v)} y2={sy(b.v)} className={`bench ${b.cls || ''}`} /><text x={W - PAD} y={sy(b.v) - 5} textAnchor="end" className={`bench-lab ${b.cls || ''}`}>{b.label} {b.v}</text></g>)}
      {shots.length > 1 && <ellipse className="ellipse" cx={sx(lMean)} cy={sy(cMean)} rx={Math.max(6, (lSd / xSpan) * (W / 2 - PAD))} ry={Math.max(6, (cSd / (yMax - yMin)) * (H - PAD - 24))} />}
      {hasShots && <g><line x1={PAD} x2={W - PAD} y1={sy(cMean)} y2={sy(cMean)} className="mean" /><text x={PAD + 4} y={sy(cMean) - 5} className="mean-lab">avg carry {cMean.toFixed(0)}</text></g>}
      {shots.map((s, i) => <circle key={i} className={`shot ${s.carry < yMin ? 'mishit' : ''}`} cx={sx(s.lat ?? 0)} cy={sy(s.carry)} r={compact ? 4.5 : 5.5} filter="url(#glow)"><title>{`Shot ${i + 1}: ${s.carry.toFixed(0)} yds carry, ${Math.abs(s.lat ?? 0).toFixed(0)} ${(s.lat ?? 0) < 0 ? 'L' : 'R'}${s.bs ? `, ${s.bs} mph ball` : ''}`}</title></circle>)}
      {!hasShots && <text x={W / 2} y={H / 2} textAnchor="middle" className="tick">No shots for this club yet</text>}
    </svg>
  );
}

export const dispersionStats = shots => {
  if (!shots.length) return null;
  const c = shots.map(s => s.carry), l = shots.map(s => s.lat ?? 0);
  const inFairway = l.filter(x => Math.abs(x) <= 15).length;
  return { n: shots.length, carry: mean(c), carrySd: shots.length > 1 ? sd(c) : 0, lat: mean(l), latSd: shots.length > 1 ? sd(l) : 0, fairwayPct: (inFairway / shots.length) * 100, best: Math.max(...c), left: l.filter(x => x < -5).length, right: l.filter(x => x > 5).length };
};
