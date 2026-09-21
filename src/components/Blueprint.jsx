import { useState } from 'react';
import { players, blueprint as bpRepo, goals as goalRepo } from '../db/repo.js';
import { BENCHMARKS as B } from '../db/index.js';
import { fmt } from '../lib/stats.js';
import { Field, num, formData } from './ui.jsx';
import Sheet from './Sheet.jsx';
import { BP_ROWS, BP_COLS, BP_AREAS, MENTAL, cell, mcell, emptyBlueprint, parseBlueprintGrid } from '../lib/blueprint.js';


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
  const [paste, setPaste] = useState(false);
  const [grid, setGrid] = useState('');
  const [pstatus, setPstatus] = useState('');
  const [area, setArea] = useState('swing');
  const save = k => v => players.update({ [k]: v });
  const base = () => { const e = emptyBlueprint(); return { ...e, ...(bp || {}), areas: { ...e.areas, ...(bp?.areas || {}) }, mental: { ...e.mental, ...(bp?.mental || {}) } }; };
  const saveCell = (a, r, c) => v => { const b = base(); b.areas[a] = { ...b.areas[a], [r]: { ...b.areas[a][r], [c]: v } }; return bpRepo.update(b); };
  const saveMental = (k, f) => v => { const b = base(); b.mental[k] = { ...b.mental[k], [f]: v }; return bpRepo.update(b); };

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
        <div className="page-head" style={{ marginBottom: 10 }}><div><h2>Coach's blueprint</h2><div className="sub">The coach's format: what to check, per phase. Cells save when you leave them.</div></div><button className="btn" onClick={() => setPaste(true)}>Paste from Excel</button></div>
        <div className="chips" style={{ marginBottom: 14 }} role="tablist">
          {[...BP_AREAS, ['mental', 'Mental']].map(([a, al]) => <button key={a} role="tab" className="chip" aria-pressed={area === a} aria-selected={area === a} onClick={() => setArea(a)}>{al}</button>)}
        </div>
        {area !== 'mental' ? (
          <div className="bp" key={area}>
            <div className="bp-head"><div /> {BP_COLS.map(([c, cl]) => <div key={c} className="eyebrow">{cl}</div>)}</div>
            {BP_ROWS.map(([r, rl, hint]) => (
              <div className="bp-row" key={r}>
                <div className="bp-rowhead"><div className="label">{rl}</div><div className="sub">{hint}</div></div>
                {BP_COLS.map(([c, cl]) => (
                  <div className="bp-cell" key={c}>
                    <span className="bp-cell-label">{cl}</span>
                    <Debounced id={`bp-${area}-${r}-${c}`} aria-label={`${rl} — ${cl}`} value={cell(bp, area, r, c)} onSave={saveCell(area, r, c)} placeholder="—" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-2" key="mental" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {Object.entries(MENTAL).map(([k, [kl, fields]]) => (
              <div className="card" key={k}>
                <h3>{kl}</h3>
                <div className="fields" style={{ gridTemplateColumns: '1fr', marginTop: 8 }}>
                  {fields.map(([f, fl]) => <Field key={f} id={`m-${k}-${f}`} label={fl}><Debounced id={`m-${k}-${f}`} value={mcell(bp, k, f)} onSave={saveMental(k, f)} style={{ minHeight: 64 }} /></Field>)}
                </div>
              </div>
            ))}
          </div>
        )}
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

      <Sheet open={paste} title={`Paste ${BP_AREAS.find(([a]) => a === area)?.[1] || 'Swing'} blueprint`} onClose={() => setPaste(false)}>
        <div className="sub">In Excel, select the whole grid (header row included), copy, and paste it here. Semicolons inside a cell become separate lines. This replaces the current blueprint.</div>
        <textarea value={grid} onChange={e => setGrid(e.target.value)} style={{ minHeight: 180, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, border: '1px solid var(--sep-strong)', borderRadius: 10, padding: 10, background: 'var(--bg-elev)' }} aria-label="Pasted grid" placeholder={'Section\tBackswing / Setup\tDownswing / Delivery\tFollow-through / Notes\nSet-up Checks\t…\t…\t…'} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn primary" onClick={async () => { try { const m = parseBlueprintGrid(grid); const b = base(); b.areas[area === 'mental' ? 'swing' : area] = m; await bpRepo.update(b); setPstatus('Loaded.'); setGrid(''); setPaste(false); } catch (e) { setPstatus(e.message); } }} disabled={!grid.trim()}>Load blueprint</button>
          <span className="status">{pstatus}</span>
        </div>
      </Sheet>

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
