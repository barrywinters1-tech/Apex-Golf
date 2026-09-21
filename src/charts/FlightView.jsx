import { useEffect, useRef } from 'react';
import { animate, stagger } from 'motion';

/**
 * Side-on ball flight (Toptracer style). Each shot: launch angle, apex height, carry.
 * The arc is a cubic Bézier that leaves at the launch angle, peaks at the apex and lands at carry.
 * Distances in yds, height in ft (TrackMan), drawn on one scale by converting ft → yds (÷3).
 */
export default function FlightView({ shots = [], benchmarks = [] }) {
  const ref = useRef(null);
  const W = 600, H = 220, L = 30, R = 20, T = 16, B = 26;
  const valid = shots.filter(s => s.carry != null && s.height != null);
  const maxX = Math.ceil((Math.max(150, ...valid.map(s => s.carry), ...benchmarks.map(b => b.v)) + 15) / 25) * 25;
  const maxY = Math.max(30, ...valid.map(s => s.height / 3)) * 1.15;
  const sx = x => L + (x / maxX) * (W - L - R);
  const sy = y => H - B - (y / maxY) * (H - T - B);
  const best = valid.length ? valid.reduce((a, b) => (b.carry > a.carry ? b : a)) : null;

  useEffect(() => {
    if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const paths = ref.current.querySelectorAll('.flight');
    paths.forEach(p => { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
    animate(paths, { strokeDashoffset: 0 }, { delay: stagger(0.05), duration: 0.9, ease: [0.2, 0.7, 0.2, 1] });
  }, [shots]);

  const arc = s => {
    const apexX = s.carry * 0.56, apexY = s.height / 3;
    const up = Math.tan(((s.launch ?? 12) * Math.PI) / 180), down = Math.tan(((s.descent ?? 40) * Math.PI) / 180);
    const d1 = apexX * 0.45, d2 = apexX * 0.35, d3 = (s.carry - apexX) * 0.3, d4 = (s.carry - apexX) * 0.45;
    const P = (x, y) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`;
    return `M${P(0, 0)} C${P(d1, Math.min(up * d1, apexY))} ${P(apexX - d2, apexY)} ${P(apexX, apexY)} C${P(apexX + d3, apexY)} ${P(s.carry - d4, Math.min(down * d4, apexY))} ${P(s.carry, 0)}`;
  };

  const xTicks = []; for (let x = 0; x <= maxX; x += 50) xTicks.push(x);
  const yTicks = []; for (let y = 0; y <= maxY; y += 20) yTicks.push(y);
  return (
    <svg ref={ref} className="chart flight" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ball flight side view">
      <defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sky-hi)" /><stop offset="1" stopColor="var(--sky-lo)" /></linearGradient></defs>
      <rect x="0" y="0" width={W} height={H} rx="14" fill="url(#skyg)" />
      {yTicks.map(y => <g key={y}><line className="grid" x1={L} x2={W - R} y1={sy(y)} y2={sy(y)} /><text x={L - 5} y={sy(y) + 4} textAnchor="end">{Math.round(y * 3)}</text></g>)}
      {xTicks.map(x => <text key={x} x={sx(x)} y={H - B + 15} textAnchor="middle">{x}</text>)}
      <line className="ground" x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} />
      {benchmarks.map((b, i) => <g key={b.label}><line className={`bench ${b.cls || ''}`} x1={sx(b.v)} x2={sx(b.v)} y1={T} y2={sy(0)} /><text className={`bench-lab ${b.cls || ''}`} x={sx(b.v) + (i % 2 ? 4 : -4)} y={T + 10 + (i % 2 ? 12 : 0)} textAnchor={i % 2 ? "start" : "end"}>{b.label}</text></g>)}
      {valid.map((s, i) => <path key={i} className={`flight ${s === best ? 'best' : ''}`} d={arc(s)}><title>{`Carry ${s.carry.toFixed(0)} yds · apex ${s.height.toFixed(0)} ft · launch ${s.launch ?? '—'}°`}</title></path>)}
      {best && <g><circle className="apex" cx={sx(best.carry * 0.55)} cy={sy(best.height / 3)} r="3.5" /><text className="lab" x={sx(best.carry * 0.55) + 6} y={sy(best.height / 3) - 6}>apex {best.height.toFixed(0)} ft</text><text className="lab" x={sx(best.carry)} y={sy(0) - 8} textAnchor="end">{best.carry.toFixed(0)} yds</text></g>}
      {!valid.length && <text x={W / 2} y={H / 2} textAnchor="middle">No flight data for this club yet</text>}
    </svg>
  );
}
