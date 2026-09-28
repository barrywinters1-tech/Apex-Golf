import { useMemo, useState } from 'react';
import Meters from './Meters.jsx';
import Radar, { scale } from '../charts/Radar.jsx';
import { dispersionStats } from '../charts/Dispersion.jsx';
import { BENCHMARKS as B } from '../db/index.js';
import { PRACTICE_MODES } from '../lib/knowledge.js';
import { roundSummary, driverSessions, goalFor, fmt, shortDate } from '../lib/stats.js';
import { priorities, weeklyPlan, weekLogged, nextBlock, yardageBook } from '../lib/practice.js';
import { LogSheet } from './Practice.jsx';

const MODE = Object.fromEntries(PRACTICE_MODES.map(([k, l]) => [k, l]));
const dateLine = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'; };
const daysAgo = d => { if (!d) return null; const n = Math.round((new Date().setHours(12) - new Date(`${d}T12:00:00`)) / 86400000); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`; };
const planMinutes = () => { try { return +localStorage.getItem('apex.planMinutes') || 240; } catch { return 240; } };

/** Home: one next action first, then Jack's latest word, the three numbers, your numbers, last round. */
export default function Today({ player, sessions, rounds, goals, lessons = [], ratings = [], bp, practice = [], onGo }) {
  const prios = useMemo(() => priorities({ rounds, ratings }), [rounds, ratings]);
  const plan = useMemo(() => weeklyPlan(prios, { minutes: planMinutes(), bp }), [prios, bp]);
  const week = weekLogged(practice);
  const nb = nextBlock(plan, week);
  const due = plan.reduce((s, b) => s + b.minutes, 0);
  const done = plan.reduce((s, b) => s + Math.min(b.minutes, week.by[`${b.area}|${b.mode}`] || 0), 0);
  const [log, setLog] = useState(null);

  const s = roundSummary(rounds), lr = s.latest;
  const drv = driverSessions(sessions), dl = drv.at(-1), dp = drv.at(-2);
  const drvShots = drv.filter(x => x.shotList?.length);
  const hs = drvShots.length ? dispersionStats(drvShots.at(-1).shotList) : null;
  const hsPrev = drvShots.length > 1 ? dispersionStats(drvShots.at(-2).shotList) : null;
  const gC = goalFor(goals, 'chs'), gSm = goalFor(goals, 'smash');
  const book = useMemo(() => yardageBook(sessions), [sessions]);
  const lastLesson = lessons.at(-1);
  const jackSays = lastLesson?.priorities?.[0] || lastLesson?.focus;
  const first = (player?.name || '').split(' ')[0];

  const sg = lr ? [['Off the tee', lr.sgT], ['Approach', lr.sgA], ['Around the green', lr.sgG], ['Putting', lr.sgP]].filter(x => x[1] != null) : [];
  const leak = sg.length ? sg.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
  const trends = [
    dl && dp && { k: 'Driver club speed', d: dl.chs - dp.chs, v: fmt(dl.chs, 1), u: 'mph', better: 'up' },
    hs && hsPrev && { k: 'Driver carry', d: hs.carry - hsPrev.carry, v: fmt(hs.carry), u: 'yds', better: 'up' },
    hs && hsPrev && { k: 'Side spread', d: hs.latSd - hsPrev.latSd, v: `±${fmt(hs.latSd, 1)}`, u: 'yds', better: 'down' },
    s.scoring != null && s.scoringPrev != null && { k: 'Scoring average', d: s.scoring - s.scoringPrev, v: fmt(s.scoring, 1), u: '', better: 'down' },
  ].filter(Boolean);
  const dir = t => (Math.abs(t.d) < 0.05 ? 'flat' : (t.better === 'up' ? t.d > 0 : t.d < 0) ? 'up' : 'down');
  const i7 = sessions.filter(x => /7 iron/i.test(x.club)).at(-1);
  const axes = [
    { key: 'speed', label: 'Speed', value: scale(dl?.chs, B.chs.scratch, B.chs.d1, B.chs.tour), ref: 70 },
    { key: 'distance', label: 'Distance', value: scale(hs?.carry, B.carry.scratch, B.carry.d1, B.carry.tour), ref: 70 },
    { key: 'irons', label: 'Irons', value: scale(i7?.carry, B.iron7.scratch, B.iron7.d1, B.iron7.tour), ref: 70 },
    { key: 'accuracy', label: 'Accuracy', value: hs ? Math.min(100, hs.fairwayPct * 1.25) : null, ref: 70 },
    { key: 'greens', label: 'Greens', value: scale(s.gir, B.gir.scratch, B.gir.d1, B.gir.tour), ref: 70 },
    { key: 'putting', label: 'Putting', value: scale(s.putts, B.putts.scratch, B.putts.d1, B.putts.tour, true), ref: 70 },
    { key: 'scoring', label: 'Scoring', value: scale(s.scoring, B.score.scratch, B.score.d1, B.score.tour, true), ref: 70 },
  ];

  return (
    <div className="fade-in today">
      <div className="page-head">
        <div><div className="date-line">{dateLine()}</div><h1>{greeting()}{first ? `, ${first}` : ''}</h1></div>
      </div>

      <section className="next">
        <div className="eyebrow">Next up</div>
        {nb ? <>
          <h2 className="next-title">{nb.label} <span className="next-mode"><i className={`mode-dot ${nb.mode}`} />{MODE[nb.mode]}</span></h2>
          <p className="next-idea">{nb.idea}{nb.coach && <span className="pill" style={{ marginLeft: 8 }}>Jack's drill</span>}</p>
          <div className="next-actions">
            <button className="btn accent" onClick={() => setLog({ area: nb.area, mode: nb.mode, minutes: nb.left, drill: nb.idea })}>Log {nb.left} min</button>
            <button className="btn" onClick={() => onGo('practice')}>This week's plan</button>
          </div>
        </> : plan.length ? <>
          <h2 className="next-title">Week done.</h2>
          <p className="next-idea">Every block is logged. Take the approach test to see if it moved.</p>
          <div className="next-actions"><button className="btn accent" onClick={() => onGo('practice')}>Take the test</button></div>
        </> : <>
          <h2 className="next-title">Log a round.</h2>
          <p className="next-idea">Apex ranks what to work on from your rounds and Jack's ratings, then builds the week.</p>
          <div className="next-actions"><button className="btn accent" onClick={() => onGo('course')}>Add a round</button></div>
        </>}
        {due > 0 && <div className="next-week"><div className="progress"><i style={{ width: `${Math.min(100, (done / due) * 100).toFixed(0)}%` }} /></div><span className="num">{done} of {due} min this week</span></div>}
      </section>

      {jackSays && (
        <button className="quote" onClick={() => onGo('coach')}>
          <span className="quote-mark" aria-hidden="true">“</span>
          <span className="quote-text">{jackSays}</span>
          <span className="quote-cite">{player?.coach || 'Coach'} · {lastLesson.focus && lastLesson.priorities?.[0] ? `${lastLesson.focus}, ` : ''}{daysAgo(lastLesson.date)}{lastLesson.source === 'example' ? ' · example' : ''}</span>
        </button>
      )}

      <section className="sheetpage">
        <div className="sheet-title"><h3>The three numbers</h3><span className="hint">latest driver session</span></div>
        <Meters items={[
          { key: 'speed', label: 'Speed', value: dl?.chs, target: gC?.target || B.chs.d1, unit: 'mph', dec: 1, colour: 'speed', why: 'Club speed' },
          { key: 'strike', label: 'Strike', value: dl?.smash, target: gSm?.target || 1.48, dec: 2, colour: 'strike', why: 'Smash factor' },
          { key: 'accuracy', label: 'Accuracy', value: hs?.fairwayPct, target: 70, unit: '%', dec: 0, colour: 'accuracy', why: 'Inside 30 yds' },
        ]} />
      </section>

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        {book.length > 0 && <section className="sheetpage">
          <div className="sheet-title"><h3>Your numbers</h3><button className="btn quiet" onClick={() => onGo('trackman')}>Yardage book</button></div>
          <table className="yb mini"><tbody>{book.map(b => (
            <tr key={b.club}><td>{b.club}</td><td className="go">{fmt(b.carry)}</td><td className="muted">{fmt(b.lo)}–{fmt(b.hi)}</td><td className="muted">±{fmt(b.latSd)}</td></tr>
          ))}</tbody></table>
        </section>}

        {lr && <button className="sheetpage lastround" onClick={() => onGo('course')}>
          <div className="sheet-title"><h3>Last round</h3><span className="hint">{shortDate(lr.date)}{lr.source === 'example' ? ' · example' : ''}</span></div>
          <div className="lr-score"><span className="num">{lr.score}</span><small>{lr.score - lr.par >= 0 ? '+' : ''}{lr.score - lr.par}</small><span className="lr-course">{lr.course}</span></div>
          {leak && <div className="lr-leak">Biggest leak: <b>{leak[0]}</b>, {fmt(Math.abs(leak[1]), 1)} shots lost</div>}
        </button>}
      </div>

      {trends.length > 0 && <section className="sheetpage" style={{ marginTop: 14 }}>
        <div className="sheet-title"><h3>Moving</h3><span className="hint">vs the time before</span></div>
        {trends.map(t => (
          <div className="trend" key={t.k}>
            <div className={`arrow ${dir(t)}`} aria-label={dir(t) === 'up' ? 'better' : dir(t) === 'down' ? 'worse' : 'level'}>{dir(t) === 'up' ? '↑' : dir(t) === 'down' ? '↓' : '→'}</div>
            <div><div className="k">{t.k}</div><div className="s num">{t.d > 0 ? '+' : ''}{t.d.toFixed(1)}</div></div>
            <div className="v">{t.v}<small>{t.u}</small></div>
          </div>
        ))}
      </section>}

      <section className="sheetpage radar-card" style={{ marginTop: 14 }}>
        <div className="sheet-title" style={{ width: '100%' }}><h3>Profile</h3><span className="hint">50 scratch · 70 D1 · 100 tour</span></div>
        <Radar axes={axes} size={300} />
      </section>

      <LogSheet prefill={log} onClose={() => setLog(null)} />
    </div>
  );
}
