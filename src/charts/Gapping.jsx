import { clubRank } from '../db/index.js';

/** Club gapping ladder: carry per club from the latest session of each, with the gap between neighbours. */
export default function Gapping({ latest = [] }) {
  const rows = latest.filter(s => s.carry != null).sort((a, b) => clubRank(a.club) - clubRank(b.club));
  if (!rows.length) return <div className="empty">No carry numbers yet.</div>;
  const max = Math.max(...rows.map(r => r.carry)) * 1.08;
  return (
    <div className="gap">
      {rows.map((r, i) => {
        const gap = i > 0 ? rows[i - 1].carry - r.carry : null;
        return (
          <div className="gap-row" key={r.club}>
            <div className="gap-club">{r.club}</div>
            <div className="gap-track"><div className="gap-bar" style={{ width: `${(r.carry / max) * 100}%` }}><span className="gap-val">{r.carry.toFixed(0)}</span></div></div>
            <div className="gap-gap">{gap != null ? <span className={gap > 30 || gap < 8 ? 'warn' : ''}>{gap.toFixed(0)}</span> : ''}</div>
          </div>
        );
      })}
      <div className="gap-foot"><span>carry, yds</span><span>gap</span></div>
    </div>
  );
}
