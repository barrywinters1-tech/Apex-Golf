import { fmt } from '../lib/stats.js';

/**
 * Yardage-book meters: a serif number against its target, with a hairline rule
 * filled to progress and a tick at the target. Replaces the Fitness rings.
 * items: [{ key, label, value, target, unit, dec, why, colour, lowerBetter }]
 */
export default function Meters({ items = [] }) {
  return (
    <div className="meters">
      {items.map(m => {
        const p = m.value == null || !m.target ? 0 : m.lowerBetter ? Math.min(1, m.target / m.value) : Math.min(1, m.value / m.target);
        return (
          <div className="meter" key={m.key} style={{ '--c': `var(--${m.colour || 'ink'})` }}>
            <div className="meter-k">{m.label}</div>
            <div className="meter-v num">{fmt(m.value, m.dec)}<span className="of">/{m.target}{m.unit ? ` ${m.unit}` : ''}</span></div>
            <div className="meter-rule" role="meter" aria-label={m.label} aria-valuemin="0" aria-valuemax={m.target} aria-valuenow={m.value ?? 0}><i style={{ width: `${(p * 100).toFixed(1)}%` }} /></div>
            {m.why && <div className="meter-why">{m.why}</div>}
          </div>
        );
      })}
    </div>
  );
}
