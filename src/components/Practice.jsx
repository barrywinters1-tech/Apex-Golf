import { useMemo, useState } from 'react';
import { practice as repo } from '../db/repo.js';
import { PRACTICE_MODES } from '../lib/knowledge.js';
import { RATING } from '../lib/academy.js';
import { AREAS, priorities, weeklyPlan, weekLogged, approachReadiness, TESTS, scoreTest } from '../lib/practice.js';
import { fmt, shortDate } from '../lib/stats.js';
import { Field, num, DeleteButton } from './ui.jsx';
import { removeWithUndo } from '../lib/undo.js';
import Sheet from './Sheet.jsx';

const MODE_LABEL = Object.fromEntries(PRACTICE_MODES.map(([k, l]) => [k, l]));
const AREA_LABEL = Object.fromEntries(AREAS.map(a => [a.key, a.label]));
const todayISO = () => new Date().toISOString().slice(0, 10);
const initialMinutes = () => { try { return +localStorage.getItem('apex.planMinutes') || 240; } catch { return 240; } };

export default function Practice({ rounds, sessions, ratings, bp, practice, academyLessons = [], watched = [] }) {
  const prios = useMemo(() => priorities({ rounds, ratings }), [rounds, ratings]);
  const [minutes, setMinutesState] = useState(initialMinutes);
  const setMinutes = m => { setMinutesState(m); try { localStorage.setItem('apex.planMinutes', String(m)); } catch {} };
  const plan = useMemo(() => weeklyPlan(prios, { minutes, bp }), [prios, minutes, bp]);
  const week = weekLogged(practice);
  const ready = useMemo(() => approachReadiness(sessions), [sessions]);
  const tests = practice.filter(p => p.kind === 'test');
  const blocks = practice.filter(p => p.kind !== 'test').slice().reverse();
  const lastTest = tests.at(-1), lastScored = lastTest ? scoreTest(lastTest.test, lastTest.shots) : null;
  const prevTest = tests.at(-2), prevScored = prevTest ? scoreTest(prevTest.test, prevTest.shots) : null;
  const watchedIds = new Set(watched.map(w => w.lessonId));

  const [logSheet, setLogSheet] = useState(null);   // prefill object or null
  const [testSheet, setTestSheet] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const top = prios[0];
  const topLessons = top ? academyLessons.filter(l => top.rating.weakest.some(n => n.id === l.node) && !watchedIds.has(l.id)).slice(0, 3) : [];

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><div className="date-line">Between lessons</div><h1>Practice</h1></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setTestSheet(true)}>Take test</button>
          <button className="btn accent" onClick={() => setLogSheet({})}>Log practice</button>
        </div>
      </div>

      <div className="grid grid-hero">
        <div className="group">
          <div className="group-title"><h3>What to work on</h3><span className="hint">ranked from your rounds + Jack's ratings</span></div>
          {prios.length ? prios.map((p, i) => (
            <div className="row prio" key={p.key}>
              <div className={`prio-rank ${i === 0 ? 'first' : ''}`}>{i + 1}</div>
              <div className="grow">
                <div className="label">{p.label}{p.basis === 'gap' && <span className="pill" style={{ marginLeft: 8 }}>vs target</span>}</div>
                <div className="sub">{p.why}</div>
                <div className="progress" style={{ marginTop: 6 }}><i style={{ width: `${Math.min(100, (p.score / Math.max(prios[0].score, 0.01)) * 100).toFixed(0)}%` }} /></div>
                {i === 0 && p.rating.weakest.length > 0 && <div style={{ marginTop: 6 }}>{p.rating.weakest.map(n => <span className="tag" key={n.id}>{n.label} · {n.value == null ? 'unrated' : RATING[n.value]}</span>)}</div>}
              </div>
            </div>
          )) : <div className="empty">Log a round (with strokes gained if you have it) to rank what to work on.</div>}
          {topLessons.length > 0 && <div className="row"><div className="grow"><div className="label">Unwatched in the Academy for this</div><div>{topLessons.map(l => <span className="tag" key={l.id}>{l.title}</span>)}</div></div></div>}
          <details className="how"><summary>How this is ranked</summary><p>Priority = need × (0.5 + room to improve) × trend. Need is strokes lost per round, or the gap to target when a round has no strokes gained. Room is 1 − Jack's rating ÷ 3, so what he rates as owned drops down the list. Worsening areas get a 1.2× nudge.</p></details>
        </div>

        <div className="group">
          <div className="group-title"><h3>This week</h3><div className="chips">{[120, 240, 360].map(m => <button key={m} className="chip" aria-pressed={m === minutes} onClick={() => setMinutes(m)}>{m / 60} h</button>)}</div></div>
          {plan.length ? [...new Set(plan.map(b => b.area))].map(area => {
            const bs = plan.filter(b => b.area === area);
            const due = bs.reduce((s, b) => s + b.minutes, 0), done = bs.reduce((s, b) => s + Math.min(b.minutes, week.by[`${b.area}|${b.mode}`] || 0), 0);
            const next = bs.map(b => ({ ...b, left: b.minutes - (week.by[`${b.area}|${b.mode}`] || 0) })).sort((a, b) => b.left - a.left)[0];
            return (
              <div className="row prio" key={area}>
                <div className="grow">
                  <div className="label">{bs[0].label} <span className="muted small num">· {done}/{due} min</span></div>
                  {bs.map(b => { const d = week.by[`${b.area}|${b.mode}`] || 0; return (
                    <div className="plan-line" key={b.mode}>
                      <i className={`mode-dot ${b.mode}`} /><span className="num">{Math.min(d, b.minutes)}/{b.minutes}</span>
                      <span className="grow">{MODE_LABEL[b.mode]}: {b.idea}{b.coach && <span className="pill" style={{ marginLeft: 6 }}>Jack's drill</span>}</span>
                    </div>
                  ); })}
                  <div className="progress" style={{ marginTop: 6 }}><i style={{ width: `${Math.min(100, (done / due) * 100).toFixed(0)}%` }} /></div>
                </div>
                <button className="btn quiet" onClick={() => setLogSheet({ area, mode: next.mode, minutes: Math.max(5, next.left), drill: next.idea })}>Log</button>
              </div>
            );
          }) : <div className="empty">No plan yet — it builds itself once there's a round to rank.</div>}
          <details className="how"><summary>Week from {shortDate(week.start)} · {week.total} min logged</summary><p>Minutes go to the top three areas in proportion to priority. The Technique / Skill / Performance mix follows Jack's rating: low → more Technique, owned → mostly Performance. His blueprint drills come first.</p></details>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <div className="group">
          <div className="group-title"><h3>Approach readiness</h3><span className="hint">TrackMan pattern vs Jack's targets</span></div>
          {ready.length ? ready.map(r => (
            <div className="row" key={r.club}>
              <div className="grow">
                <div className="label">{r.club} <span className="muted small num">· {fmt(r.carry)} yds · {r.n} shots · {shortDate(r.date)}</span></div>
                <div className="sub num">{r.target ? `Pattern ${fmt(r.prox)} ft from its centre · Jack's ${r.band} target ${r.target} ft · ${fmt(r.inside)}% inside` : `Pattern ${fmt(r.prox)} ft from its centre · no target under 125 yds in Jack's model`}</div>
              </div>
              {r.target && <span className={`pill ${r.prox <= r.target ? 'ok' : 'warn'}`}>{r.prox <= r.target ? 'on target' : `+${fmt(r.prox - r.target)} ft`}</span>}
            </div>
          )) : <div className="empty">Import a TrackMan CSV with irons or wedges to see this.</div>}
          <details className="how"><summary>What this measures</summary><p>How tightly each club's shots finish around their own centre, against Jack's proximity target for that distance. It's the best case — perfect aim and yardage on a flat range — so the course will read worse. Range balls widen the pattern.</p></details>
        </div>

        <div className="group">
          <div className="group-title"><h3>Approach test</h3><span className="hint">Performance mode · scored 0–100</span></div>
          {lastScored ? <>
            <div className="row">
              <div className="test-score num">{fmt(lastScored.score)}</div>
              <div className="grow"><div className="label">Latest · {lastTest.date}</div><div className="sub">{lastScored.done}/{lastScored.of} balls{prevScored?.score != null ? ` · ${lastScored.score - prevScored.score >= 0 ? '+' : ''}${fmt(lastScored.score - prevScored.score)} vs previous` : ''}</div></div>
            </div>
            {lastScored.bands.map(b => (
              <div className="row" key={b.target}>
                <div className="grow"><div className="label">{b.target} yds</div><div className="sub num">Average {fmt(b.prox)} ft{b.goal ? ` · Jack's target ${b.goal} ft` : ''}</div></div>
                {b.goal && b.prox != null && <span className={`pill ${b.prox <= b.goal ? 'ok' : 'warn'}`}>{b.prox <= b.goal ? 'on target' : `+${fmt(b.prox - b.goal)} ft`}</span>}
              </div>
            ))}
            {tests.length > 1 && <div className="row"><div className="sub num">History: {tests.map(t => fmt(scoreTest(t.test, t.shots)?.score)).join(' → ')}</div></div>}
          </> : <div className="empty">{TESTS.approach9.blurb} Take it monthly; the score is your benchmark.</div>}
          <details className="how"><summary>How it's scored</summary><p>Each ball scores 100 − 2 × (miss ÷ target distance, as a %). Short misses count 1.25× because short is the costly miss on approach. It's our formula, not TrackMan's Combine — compare it with your own history.</p></details>
        </div>
      </div>

      <div className="group" style={{ marginTop: 14 }}>
        <div className="group-title"><h3>Practice log</h3>{blocks.length > 5 && <button className="btn quiet" onClick={() => setShowAll(v => !v)}>{showAll ? 'Hide' : `Show ${blocks.length}`}</button>}</div>
        {(showAll ? blocks : blocks.slice(0, 5)).map(p => (
          <div className="row" key={p.id}>
            <i className={`mode-dot ${p.mode}`} />
            <div className="grow"><div className="label">{AREA_LABEL[p.area] || p.area} · {MODE_LABEL[p.mode] || p.mode} · {p.minutes} min</div><div className="sub">{p.date}{p.drill ? ` · ${p.drill}` : ''}{p.notes ? ` · ${p.notes}` : ''}</div></div>
            <DeleteButton label="Delete practice" onClick={() => removeWithUndo(repo, p.id, 'Practice deleted')} />
          </div>
        ))}
        {tests.slice().reverse().slice(0, showAll ? 99 : 2).map(t => (
          <div className="row" key={t.id}>
            <i className="mode-dot performance" />
            <div className="grow"><div className="label">{TESTS[t.test]?.label || 'Test'} · {fmt(scoreTest(t.test, t.shots)?.score)}</div><div className="sub">{t.date}{t.notes ? ` · ${t.notes}` : ''}</div></div>
            <DeleteButton label="Delete test" onClick={() => removeWithUndo(repo, t.id, 'Test deleted')} />
          </div>
        ))}
        {!practice.length && <div className="empty">Nothing logged yet. Jack sees what you actually practised, not just what you watched.</div>}
      </div>

      <LogSheet prefill={logSheet} onClose={() => setLogSheet(null)} />
      <TestSheet open={testSheet} onClose={() => setTestSheet(false)} />
    </div>
  );
}

export function LogSheet({ prefill, onClose }) {
  const p = prefill || {};
  return (
    <Sheet open={!!prefill} title="Log practice" onClose={onClose}>
      {prefill && <form className="fields" key={JSON.stringify(p)} onSubmit={async e => {
        e.preventDefault(); const d = Object.fromEntries(new FormData(e.target).entries());
        await repo.add({ kind: 'block', date: d.date, area: d.area, mode: d.mode, minutes: num(d.minutes) ?? 0, drill: d.drill.trim(), notes: d.notes.trim(), source: 'manual' });
        onClose();
      }}>
        <Field id="p-date" label="Date"><input id="p-date" name="date" type="date" required defaultValue={todayISO()} /></Field>
        <Field id="p-min" label="Minutes"><input id="p-min" name="minutes" type="number" inputMode="numeric" required defaultValue={p.minutes ?? 30} /></Field>
        <Field id="p-area" label="Area"><select id="p-area" name="area" defaultValue={p.area || 'approach'}>{AREAS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}</select></Field>
        <Field id="p-mode" label="Mode"><select id="p-mode" name="mode" defaultValue={p.mode || 'skill'}>{PRACTICE_MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field id="p-drill" label="Drill" className="wide"><input id="p-drill" name="drill" defaultValue={p.drill || ''} /></Field>
        <Field id="p-notes" label="How it went" className="wide"><textarea id="p-notes" name="notes" rows="3" /></Field>
        <button className="btn primary block wide" type="submit">Save</button>
      </form>}
    </Sheet>
  );
}

function TestSheet({ open, onClose }) {
  const t = TESTS.approach9;
  const [shots, setShots] = useState(() => t.targets.map(() => ({ carry: '', side: '' })));
  const [date, setDate] = useState(todayISO);
  const [notes, setNotes] = useState('');
  const parsed = shots.map(s => ({ carry: num(s.carry), side: num(s.side) ?? 0 }));
  const live = scoreTest(t.key, parsed);
  const set = (i, k) => e => setShots(a => a.map((s, j) => (j === i ? { ...s, [k]: e.target.value } : s)));
  return (
    <Sheet open={open} title={t.label} onClose={onClose}>
      <form className="fields" onSubmit={async e => {
        e.preventDefault();
        await repo.add({ kind: 'test', test: t.key, date, shots: parsed, notes: notes.trim(), area: 'approach', mode: 'performance', source: 'manual' });
        setShots(t.targets.map(() => ({ carry: '', side: '' }))); setNotes(''); onClose();
      }}>
        <p className="sub wide" style={{ margin: 0 }}>{t.blurb} Side: right +, left − (e.g. −6 for 6 L).</p>
        <Field id="t-date" label="Date"><input id="t-date" type="date" value={date} onChange={e => setDate(e.target.value)} required /></Field>
        <div className="field"><label>Score so far</label><div className="test-score num" style={{ fontSize: 28 }}>{live.done ? fmt(live.score) : '—'}</div></div>
        {t.targets.map((tg, i) => (
          <div className="test-row wide" key={i}>
            <span className="num muted">{i + 1}. {tg} yds</span>
            <input aria-label={`Ball ${i + 1} carry`} placeholder="carry" type="number" inputMode="decimal" step="0.1" value={shots[i].carry} onChange={set(i, 'carry')} />
            <input aria-label={`Ball ${i + 1} side`} placeholder="side ±" type="number" inputMode="decimal" step="0.1" value={shots[i].side} onChange={set(i, 'side')} />
            <span className="num" style={{ minWidth: 36, textAlign: 'right' }}>{live.rows[i].score != null ? fmt(live.rows[i].score) : ''}</span>
          </div>
        ))}
        <Field id="t-notes" label="Notes (ball, lie, wind)" className="wide"><input id="t-notes" value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        <button className="btn primary block wide" type="submit" disabled={!live.done}>Save test</button>
      </form>
    </Sheet>
  );
}
