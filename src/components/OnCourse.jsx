import { useState } from 'react';
import Rings from '../charts/Rings.jsx';
import LineChart from '../charts/LineChart.jsx';
import BarChart from '../charts/BarChart.jsx';
import { rounds as repo } from '../db/repo.js';
import { BENCHMARKS as B } from '../db/index.js';
import { roundSummary, goalFor, fmt, sgn, shortDate } from '../lib/stats.js';
import { Field, num, formData } from './ui.jsx';
import Sheet from './Sheet.jsx';

export default function OnCourse({ rounds, goals }) {
  const s = roundSummary(rounds);
  const gP = goalFor(goals, 'putts'), gS = goalFor(goals, 'score');
  const [sheet, setSheet] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const lr = s.latest;
  const sg = lr && [lr.sgT, lr.sgA, lr.sgG, lr.sgP].some(v => v != null)
    ? [['Off the tee', lr.sgT], ['Approach', lr.sgA], ['Around green', lr.sgG], ['Putting', lr.sgP]].filter(x => x[1] != null).map(([label, v]) => ({ label, v })) : [];
  const rings = [
    { key: 'speed', label: 'Fairways', value: s.fir, target: 70, unit: '%', color: 'var(--speed)', dec: 0, why: 'Last 5 rounds · target 70%' },
    { key: 'strike', label: 'Greens', value: s.gir, target: B.gir.d1, unit: '%', color: 'var(--strike)', dec: 0, why: `Last 5 rounds · D1 ~${B.gir.d1}%` },
    { key: 'accuracy', label: 'Up & down', value: s.upDown, target: 60, unit: '%', color: 'var(--accuracy)', dec: 0, why: 'Last 5 rounds · target 60%' },
  ];
  const worst = sg.length ? sg.reduce((a, b) => (b.v < a.v ? b : a)) : null;

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><div className="date-line">Scoring</div><h1>On-course</h1></div>
        <button className="btn primary" onClick={() => setSheet(true)}>Add round</button>
      </div>

      <div className="grid grid-hero">
        <div className="card rings-card">
          <Rings rings={rings} size={236} />
          <div className="ring-list">
            {rings.map(r => (
              <div className={`ring-item ${r.key}`} key={r.key}>
                <div className="k">{r.label}</div>
                <div className="v">{fmt(r.value, r.dec)}<span className="of">/{r.target}</span> <small>{r.unit}</small></div>
                <div className="why">{r.why}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="scorecard">
          {lr ? <>
            <div className="sc-head"><div><div className="date-line">Last round · {lr.date}</div><h3>{lr.course}{lr.source === 'example' && <span className="pill example" style={{ marginLeft: 8 }}>example</span>}</h3></div><div className="sc-score">{lr.score}<small>{lr.score - lr.par >= 0 ? '+' : ''}{lr.score - lr.par}</small></div></div>
            <div className="sc-grid">
              <div><div className="k">Fairways</div><div className="v">{lr.fir ?? '—'}<small>/{lr.firOf ?? '—'}</small></div></div>
              <div><div className="k">Greens</div><div className="v">{lr.gir ?? '—'}<small>/18</small></div></div>
              <div><div className="k">Putts</div><div className="v">{lr.putts ?? '—'}</div></div>
              <div><div className="k">Up & down</div><div className="v">{lr.upDown ?? '—'}<small>/{lr.upDownOf ?? '—'}</small></div></div>
              <div><div className="k">Penalties</div><div className="v">{lr.pen ?? '—'}</div></div>
            </div>
            <BarChart items={sg} empty="No strokes-gained logged for this round." />
            {worst && <div className="sc-note">Biggest leak: <b>{worst.label}</b> ({sgn(worst.v)}). That's where the next practice block goes.</div>}
          </> : <div className="empty">No rounds logged yet — add one.</div>}
        </div>
      </div>

      <div className="grid grid-tiles" style={{ marginTop: 14 }}>
        <div className="tile"><div className="lbl">Scoring avg · last 5</div><div className="val">{fmt(s.scoring, 1)}</div><div className="bench">{gS ? `Target ${gS.target}` : `Scratch ~${B.score.scratch}`} · Tour ~{B.score.tour}</div></div>
        <div className="tile"><div className="lbl">Putts / round</div><div className="val">{fmt(s.putts, 1)}</div><div className="bench">D1 ~{B.putts.d1} · Tour ~{B.putts.tour}</div></div>
        <div className="tile"><div className="lbl">Penalties / round</div><div className="val">{fmt(s.pen, 1)}</div><div className="bench">Every one is a shot you never hit</div></div>
        <div className="tile"><div className="lbl">Rounds logged</div><div className="val">{rounds.length}</div><div className="bench">{rounds.length < 5 ? 'Five rounds make the averages honest' : 'Averages use the last five'}</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Score to par</h3><div className="sub">Per round{gS ? ` · target ${gS.target}` : ''}</div>
          <LineChart points={rounds.map(r => ({ x: shortDate(r.date), y: r.score - r.par }))} target={gS ? gS.target - 72 : null} zero label="Score to par" />
          <div className="legend"><span>Score to par</span>{gS && <span className="t">Target</span>}</div>
        </div>
        <div className="card">
          <h3>Greens and fairways</h3><div className="sub">Percent per round</div>
          <LineChart points={rounds.map(r => ({ x: shortDate(r.date), y: r.gir != null ? r.gir / 18 * 100 : 0 }))} series2={rounds.map(r => ({ x: shortDate(r.date), y: r.firOf ? r.fir / r.firOf * 100 : 0 }))} label="GIR and fairways" />
          <div className="legend"><span>GIR %</span><span className="b">Fairways %</span></div>
        </div>
        <div className="card">
          <h3>Putts per round</h3><div className="sub">{gP ? `Target ${gP.target}` : 'No putting goal set'}</div>
          <LineChart points={rounds.filter(r => r.putts != null).map(r => ({ x: shortDate(r.date), y: r.putts }))} target={gP?.target} label="Putts per round" />
          <div className="legend"><span>Putts</span>{gP && <span className="t">Target</span>}</div>
        </div>
        <div className="group">
          <div className="group-title"><h3>Rounds</h3><button className="btn quiet" onClick={() => setShowAll(v => !v)}>{showAll ? 'Hide' : `Show ${rounds.length}`}</button></div>
          {(showAll ? rounds.slice().reverse() : rounds.slice().reverse().slice(0, 3)).map(r => (
            <div className="row" key={r.id}>
              <div className="sc-mini">{r.score}<small>{r.score - r.par >= 0 ? '+' : ''}{r.score - r.par}</small></div>
              <div className="grow"><div className="label">{r.course} {r.source === 'example' && <span className="pill example">example</span>}</div><div className="sub num">{r.date} · FIR {r.fir ?? '—'}/{r.firOf ?? '—'} · GIR {r.gir ?? '—'} · putts {r.putts ?? '—'}</div></div>
              <button className="btn danger" onClick={() => repo.remove(r.id)}>Remove</button>
            </div>
          ))}
          {!rounds.length && <div className="empty">No rounds yet.</div>}
        </div>
      </div>

      <Sheet open={sheet} title="Add round" onClose={() => setSheet(false)}>
        <form className="fields" onSubmit={async e => { e.preventDefault(); const d = formData(e.target); await repo.add({ date: d.date, course: d.course.trim(), par: num(d.par) ?? 72, score: num(d.score), fir: num(d.fir), firOf: num(d.firOf) ?? 14, gir: num(d.gir), putts: num(d.putts), upDown: num(d.upDown), upDownOf: num(d.upDownOf), pen: num(d.pen), sgT: num(d.sgT), sgA: num(d.sgA), sgG: num(d.sgG), sgP: num(d.sgP), source: 'manual' }); setSheet(false); }}>
          <Field id="r-date" label="Date"><input id="r-date" name="date" type="date" required /></Field>
          <Field id="r-course" label="Course" className="wide"><input id="r-course" name="course" required /></Field>
          <Field id="r-par" label="Par"><input id="r-par" name="par" type="number" defaultValue="72" inputMode="numeric" /></Field>
          <Field id="r-score" label="Score"><input id="r-score" name="score" type="number" required inputMode="numeric" /></Field>
          <Field id="r-fir" label="Fairways hit"><input id="r-fir" name="fir" type="number" inputMode="numeric" /></Field>
          <Field id="r-firof" label="of"><input id="r-firof" name="firOf" type="number" defaultValue="14" inputMode="numeric" /></Field>
          <Field id="r-gir" label="GIR"><input id="r-gir" name="gir" type="number" inputMode="numeric" /></Field>
          <Field id="r-putts" label="Putts"><input id="r-putts" name="putts" type="number" inputMode="numeric" /></Field>
          <Field id="r-ud" label="Up & downs"><input id="r-ud" name="upDown" type="number" inputMode="numeric" /></Field>
          <Field id="r-udof" label="of"><input id="r-udof" name="upDownOf" type="number" inputMode="numeric" /></Field>
          <Field id="r-pen" label="Penalties"><input id="r-pen" name="pen" type="number" inputMode="numeric" /></Field>
          <Field id="r-sgt" label="SG off tee"><input id="r-sgt" name="sgT" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="r-sga" label="SG approach"><input id="r-sga" name="sgA" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="r-sgg" label="SG around green"><input id="r-sgg" name="sgG" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="r-sgp" label="SG putting"><input id="r-sgp" name="sgP" type="number" step="0.1" inputMode="decimal" /></Field>
          <button className="btn primary block wide" type="submit">Add round</button>
        </form>
      </Sheet>
    </div>
  );
}
