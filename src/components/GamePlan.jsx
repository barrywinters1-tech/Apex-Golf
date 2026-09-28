import { useMemo, useState } from 'react';
import { yardageBook, gamePlan } from '../lib/practice.js';
import { fmt, shortDate } from '../lib/stats.js';

const lr = v => (Math.abs(v) < 1 ? 'straight at it' : `${fmt(Math.abs(v))} yds ${v < 0 ? 'left' : 'right'}`);

/** Yardage book + dispersion game plan from real TrackMan shots. Printable. */
export default function GamePlan({ sessions }) {
  const book = useMemo(() => yardageBook(sessions), [sessions]);
  const [width, setWidth] = useState(30);
  if (!book.length) return null;
  const range = book.some(b => /low-compression|range ball/i.test(b.notes));
  return (
    <div className="grid grid-2" style={{ marginTop: 14 }}>
      <div className="card">
        <div className="page-head" style={{ margin: '0 0 6px' }}>
          <div><h3>Yardage book</h3><div className="sub" style={{ margin: 0 }}>Go-to carry = median; window = 8 in 10 shots</div></div>
          <button className="btn quiet no-print" onClick={() => window.print()}>Print</button>
        </div>
        <div className="yb-wrap"><table className="yb">
          <thead><tr><th>Club</th><th>Go-to</th><th>Window</th><th>Side ±</th><th>From</th></tr></thead>
          <tbody>{book.map(b => (
            <tr key={b.club}><td>{b.club}</td><td className="go">{fmt(b.carry)}</td><td>{fmt(b.lo)}–{fmt(b.hi)}</td><td>{b.latSd != null ? fmt(b.latSd, 1) : '—'}</td><td className="muted small">{shortDate(b.date)} · {b.n}{b.dropped ? ` (−${b.dropped} mishit)` : ''}</td></tr>
          ))}</tbody>
        </table></div>
        {range && <div className="sub" style={{ marginTop: 8 }}>Some of these are range-ball sessions: carries read short. Re-import on premium balls before trusting them on the course.</div>}
      </div>

      <div className="group">
        <div className="group-title"><h3>Game plan</h3><div className="chips no-print">{[20, 30, 40].map(w => <button key={w} className="chip" aria-pressed={w === width} onClick={() => setWidth(w)}>{w} yd</button>)}</div></div>
        {book.map(b => { const g = gamePlan(b, { width }); if (!g) return null; return (
          <div className="row" key={b.club}>
            <div className="grow">
              <div className="label">{b.club} <span className="muted small num">· pattern {fmt(g.width95)} yds wide</span></div>
              <div className="sub num">Aim {lr(g.aim)} of the target to centre it · {fmt(g.inPlay)}% inside {width} yds as you aim now, {fmt(g.inPlayAimed)}% once centred · keep the centre {fmt(g.hazardGap)} yds from a one-sided hazard</div>
            </div>
          </div>
        ); })}
        <div className="row"><div className="sub">Pick the corridor (fairway or green width). Aim uses your average miss; "in play" assumes your side spread is normal. Wind and slope not included.</div></div>
      </div>
    </div>
  );
}
