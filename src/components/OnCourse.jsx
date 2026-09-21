import { useState } from 'react';
import LineChart from '../charts/LineChart.jsx';
import { rounds as repo } from '../db/repo.js';
import { roundSummary, goalFor, fmt, sgn, shortDate } from '../lib/stats.js';
import { Tile, Field, num, formData } from './ui.jsx';
import Sheet from './Sheet.jsx';

export default function OnCourse({ rounds, goals }) {
  const s = roundSummary(rounds);
  const gP = goalFor(goals, 'putts');
  const [sheet, setSheet] = useState(false);
  return (
    <div className="fade-in">
      <div className="page-head">
        <div><h1>On-course</h1><div className="sub">Scoring, fairways, greens, putts and strokes gained per round.</div></div>
        <button className="btn primary" onClick={() => setSheet(true)}>Add round</button>
      </div>
      <div className="grid grid-tiles">
        <Tile label="Fairways · last 5" value={fmt(s.fir)} unit="%" />
        <Tile label="GIR · last 5" value={fmt(s.gir)} unit="%" />
        <Tile label="Up & down · last 5" value={fmt(s.upDown)} unit="%" />
        <Tile label="Penalties / round" value={fmt(s.pen, 1)} />
      </div>
      <div className="grid grid-2" style={{ marginTop: 14 }}>
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
      </div>
      <div className="group" style={{ marginTop: 18 }}>
        <div className="group-title"><h3>Rounds</h3><span className="hint">{rounds.length} logged</span></div>
        <div className="tablewrap"><table>
          <thead><tr><th>Date</th><th>Course</th><th className="r">Par</th><th className="r">Score</th><th className="r">+/−</th><th className="r">FIR</th><th className="r">GIR</th><th className="r">Putts</th><th className="r">Up&down</th><th className="r">Pen</th><th className="r">SG tee</th><th className="r">SG app</th><th className="r">SG arg</th><th className="r">SG putt</th><th></th></tr></thead>
          <tbody>{rounds.slice().reverse().map(r => (
            <tr key={r.id}>
              <td>{r.date}</td><td>{r.course} {r.source === 'example' && <span className="pill example">example</span>}</td><td className="r">{r.par}</td><td className="r"><b>{r.score}</b></td><td className="r">{sgn(r.score - r.par, 0)}</td>
              <td className="r">{r.fir ?? '—'}/{r.firOf ?? '—'}</td><td className="r">{r.gir ?? '—'}</td><td className="r">{r.putts ?? '—'}</td><td className="r">{r.upDown ?? '—'}/{r.upDownOf ?? '—'}</td><td className="r">{r.pen ?? '—'}</td>
              <td className="r">{sgn(r.sgT)}</td><td className="r">{sgn(r.sgA)}</td><td className="r">{sgn(r.sgG)}</td><td className="r">{sgn(r.sgP)}</td>
              <td><button className="btn danger" onClick={() => repo.remove(r.id)}>Remove</button></td>
            </tr>))}
          {!rounds.length && <tr><td colSpan="15" className="empty">No rounds yet.</td></tr>}
          </tbody>
        </table></div>
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
