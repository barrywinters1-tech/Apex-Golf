import { useState } from 'react';
import { players, blueprint as bpRepo, goals as goalRepo } from '../db/repo.js';
import { BENCHMARKS as B } from '../db/index.js';
import { fmt } from '../lib/stats.js';
import { Field, num, formData } from './ui.jsx';
import Sheet from './Sheet.jsx';

const AREAS = [['swing', 'Full swing'], ['shortgame', 'Short game'], ['putting', 'Putting'], ['physical', 'Physical'], ['mental', 'Mental & routine'], ['course', 'Course management']];

function Debounced({ value, onSave, ...props }) {
  const [v, setV] = useState(value ?? '');
  return <textarea {...props} value={v} onChange={e => setV(e.target.value)} onBlur={() => v !== (value ?? '') && onSave(v)} />;
}
function Text({ value, onSave, ...props }) {
  const [v, setV] = useState(value ?? '');
  return <input {...props} value={v} onChange={e => setV(e.target.value)} onBlur={() => v !== (value ?? '') && onSave(v)} />;
}

export default function Blueprint({ player, bp, goals }) {
  const [sheet, setSheet] = useState(false);
  const save = k => v => players.update({ [k]: v });
  const saveBp = k => v => bpRepo.update({ ...(bp || {}), [k]: v });

  return (
    <div className="fade-in">
      <div className="page-head"><div><h1>Blueprint</h1><div className="sub">The coach's plan, and what the numbers should reach.</div></div></div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Player</h3><div className="sub">Changes save when you leave a field.</div>
          <div className="fields">
            <Field id="p-name" label="Name" className="wide"><Text id="p-name" value={player?.name} onSave={save('name')} /></Field>
            <Field id="p-hcp" label="Handicap index"><Text id="p-hcp" value={player?.handicap} onSave={save('handicap')} placeholder="12.4" inputMode="decimal" /></Field>
            <Field id="p-club" label="Home club"><Text id="p-club" value={player?.homeClub} onSave={save('homeClub')} /></Field>
            <Field id="p-coach" label="Coach"><Text id="p-coach" value={player?.coach} onSave={save('coach')} /></Field>
            <Field id="p-academy" label="Academy"><Text id="p-academy" value={player?.academy} onSave={save('academy')} /></Field>
            <Field id="p-amb" label="Ambition · 12 months" className="wide"><Debounced id="p-amb" value={player?.ambition} onSave={save('ambition')} style={{ minHeight: 60 }} /></Field>
          </div>
        </div>
        <div className="group">
          <div className="group-title"><h3>Benchmarks</h3><span className="hint">approximate, edit in src/db/index.js</span></div>
          <div className="tablewrap"><table>
            <thead><tr><th>Metric</th><th className="r">Scratch</th><th className="r">D1 men</th><th className="r">Tour</th></tr></thead>
            <tbody>{Object.values(B).map(b => <tr key={b.label}><td>{b.label}</td><td className="r">{b.scratch}</td><td className="r">{b.d1}</td><td className="r">{b.tour}</td></tr>)}</tbody>
          </table></div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 18 }}>
        <div className="section-label eyebrow">Coach's blueprint</div>
        <div className="grid grid-2">
          {AREAS.map(([k, l]) => (
            <div className="card" key={k}>
              <Field id={`bp-${k}`} label={l}><Debounced id={`bp-${k}`} value={bp?.[k]} onSave={saveBp(k)} placeholder={`What the coach wants to see in ${l.toLowerCase()}…`} /></Field>
            </div>
          ))}
        </div>
      </div>

      <div className="section" style={{ marginTop: 18 }}>
        <div className="group">
          <div className="group-title"><h3>Goals</h3><button className="btn" onClick={() => setSheet(true)}>Add goal</button></div>
          {goals.length ? goals.map(g => (
            <div className="row" key={g.id}>
              <div className="grow">
                <div className="label">{g.metric} <span className="muted small">· {g.area}</span> {g.source === 'example' && <span className="pill example">example</span>}</div>
                <div className="sub num">Baseline {fmt(g.baseline, 2).replace(/\.?0+$/, '')} → target {fmt(g.target, 2).replace(/\.?0+$/, '')} {g.unit}{g.by ? ` by ${g.by}` : ''}</div>
              </div>
              <label className="small muted" htmlFor={`cur-${g.id}`}>now</label>
              <input id={`cur-${g.id}`} className="inline-input" type="number" step="any" defaultValue={g.current ?? ''} onBlur={e => goalRepo.update(g.id, { current: num(e.target.value) })} />
              <button className="btn danger" onClick={() => goalRepo.remove(g.id)} aria-label="Remove goal">Remove</button>
            </div>
          )) : <div className="empty">No goals yet.</div>}
        </div>
      </div>

      <Sheet open={sheet} title="New goal" onClose={() => setSheet(false)}>
        <form onSubmit={async e => { e.preventDefault(); const d = formData(e.target); await goalRepo.add({ area: d.area, metric: d.metric.trim(), unit: d.unit.trim(), baseline: num(d.baseline), current: num(d.current) ?? num(d.baseline), target: num(d.target), by: d.by }); setSheet(false); }} className="fields">
          <Field id="g-area" label="Area"><select id="g-area" name="area">{['Driving', 'Approach', 'Short game', 'Putting', 'Scoring', 'Physical', 'Mental'].map(a => <option key={a}>{a}</option>)}</select></Field>
          <Field id="g-metric" label="Metric" className="wide"><input id="g-metric" name="metric" required placeholder="e.g. Driver carry" /></Field>
          <Field id="g-unit" label="Unit"><input id="g-unit" name="unit" placeholder="yds" /></Field>
          <Field id="g-base" label="Baseline"><input id="g-base" name="baseline" type="number" step="any" required inputMode="decimal" /></Field>
          <Field id="g-cur" label="Current"><input id="g-cur" name="current" type="number" step="any" inputMode="decimal" /></Field>
          <Field id="g-target" label="Target"><input id="g-target" name="target" type="number" step="any" required inputMode="decimal" /></Field>
          <Field id="g-by" label="By"><input id="g-by" name="by" type="date" /></Field>
          <button className="btn primary block wide" type="submit">Add goal</button>
        </form>
      </Sheet>
    </div>
  );
}
