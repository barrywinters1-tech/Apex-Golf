import { useState } from 'react';
import { players, blueprint as bpRepo, goals as goalRepo } from '../db/repo.js';
import { BENCHMARKS as B } from '../db/index.js';
import { fmt, goalProgress, roundSummary, driverSessions } from '../lib/stats.js';
import { Field, num, formData, DeleteButton } from './ui.jsx';
import { removeWithUndo } from '../lib/undo.js';
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

const COLOURS = ['speed', 'strike', 'accuracy', 'gold'];

export default function Blueprint({ player, bp, goals, sessions = [], rounds = [] }) {
  const [sheet, setSheet] = useState(false);
  const [paste, setPaste] = useState(false);
  const [grid, setGrid] = useState('');
  const [pstatus, setPstatus] = useState('');
  const [area, setArea] = useState('swing');
  const [editPlayer, setEditPlayer] = useState(false);
  const save = k => v => players.update({ [k]: v });
  const base = () => { const e = emptyBlueprint(); return { ...e, ...(bp || {}), areas: { ...e.areas, ...(bp?.areas || {}) }, mental: { ...e.mental, ...(bp?.mental || {}) } }; };
  const saveCell = (a, r, c) => v => { const b = base(); b.areas[a] = { ...b.areas[a], [r]: { ...b.areas[a][r], [c]: v } }; return bpRepo.update(b); };
  const saveMental = (k, f) => v => { const b = base(); b.mental[k] = { ...b.mental[k], [f]: v }; return bpRepo.update(b); };

  // You vs benchmarks
  const s = roundSummary(rounds); const dl = driverSessions(sessions).at(-1);
  const you = { chs: dl?.chs, bs: dl?.bs, carry: dl?.carry, iron7: sessions.filter(x => /7 iron/i.test(x.club)).at(-1)?.carry, gir: s.gir, putts: s.putts, score: s.scoring };
  const lowerBetter = new Set(['putts', 'score']);

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><div className="date-line">The plan</div><h1>Blueprint</h1></div>
        <button className="btn" onClick={() => setPaste(true)}>Paste from Excel</button>
      </div>

      <div className="grid grid-hero">
        <div className="card ident">
          <div className="ident-top">
            <div className="ident-avatar">{(player?.name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div className="grow"><h2>{player?.name || 'Player'}</h2><div className="muted">{[player?.handicap && `HCP ${player.handicap}`, player?.homeClub, player?.academy].filter(Boolean).join(' · ') || 'Add handicap and club'}</div></div>
            <button className="btn quiet" onClick={() => setEditPlayer(v => !v)}>{editPlayer ? 'Done' : 'Edit'}</button>
          </div>
          {player?.ambition && !editPlayer && <div className="ambition">“{player.ambition}”</div>}
          {editPlayer && <div className="fields" style={{ marginTop: 12 }}>
            <Field id="p-name" label="Name" className="wide"><Text id="p-name" value={player?.name} onSave={save('name')} /></Field>
            <Field id="p-hcp" label="Handicap index"><Text id="p-hcp" value={player?.handicap} onSave={save('handicap')} placeholder="12.4" inputMode="decimal" /></Field>
            <Field id="p-club" label="Home club"><Text id="p-club" value={player?.homeClub} onSave={save('homeClub')} /></Field>
            <Field id="p-coach" label="Coach"><Text id="p-coach" value={player?.coach} onSave={save('coach')} /></Field>
            <Field id="p-academy" label="Academy"><Text id="p-academy" value={player?.academy} onSave={save('academy')} /></Field>
            <Field id="p-amb" label="Ambition · 12 months" className="wide"><Debounced id="p-amb" value={player?.ambition} onSave={save('ambition')} style={{ minHeight: 60 }} /></Field>
          </div>}
          <div className="goal-grid">
            {goals.slice(0, 4).map((g, i) => { const p = goalProgress(g); return (
              <div className={`goal-mini ${COLOURS[i % 4]}`} key={g.id}>
                <div className="gm-ring" style={{ '--p': `${(p * 100).toFixed(0)}%` }}><span>{(p * 100).toFixed(0)}%</span></div>
                <div className="gm-k">{g.metric}</div>
                <div className="gm-v num">{fmt(g.current, g.metric.includes('smash') ? 2 : 1)} → {fmt(g.target, g.metric.includes('smash') ? 2 : 1)}{g.unit ? ` ${g.unit}` : ''}</div>
              </div>); })}
          </div>
        </div>

        <div className="group">
          <div className="group-title"><h3>You vs the benchmarks</h3><span className="hint">scratch · D1 · Tour</span></div>
          {Object.entries(B).map(([k, b]) => { const v = you[k]; const vals = [b.scratch, b.d1, b.tour, v].filter(x => x != null); const lo = Math.min(...vals) * 0.85, hi = Math.max(...vals) * 1.05; const pos = x => `${((x - lo) / (hi - lo) * 100).toFixed(1)}%`; return (
            <div className="bench-row" key={k}>
              <div className="bench-lab"><span>{b.label}</span><b className="num">{v != null ? fmt(v, k === 'score' || k === 'putts' ? 1 : 0) : '—'}</b></div>
              <div className="bench-track">
                <i className="bench-mark scratch" style={{ left: pos(b.scratch) }} title={`Scratch ${b.scratch}`} />
                <i className="bench-mark d1" style={{ left: pos(b.d1) }} title={`D1 ${b.d1}`} />
                <i className="bench-mark tour" style={{ left: pos(b.tour) }} title={`Tour ${b.tour}`} />
                {v != null && <i className={`bench-you ${lowerBetter.has(k) ? (v <= b.scratch ? 'good' : '') : (v >= b.scratch ? 'good' : '')}`} style={{ left: pos(v) }} />}
              </div>
            </div>); })}
          <div className="bench-key"><span><i className="scratch" />Scratch</span><span><i className="d1" />D1</span><span><i className="tour" />Tour</span><span><i className="you" />You</span></div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 14 }}>
        <div className="page-head" style={{ marginBottom: 10 }}><div><h2>Coach's blueprint</h2><div className="sub">What to check, per phase. Cells save when you leave them.</div></div>
          <div className="chips" role="tablist">{[...BP_AREAS, ['mental', 'Mental']].map(([a, al]) => <button key={a} role="tab" className="chip" aria-pressed={area === a} aria-selected={area === a} onClick={() => setArea(a)}>{al}</button>)}</div>
        </div>
        {area !== 'mental' ? (
          <div className="bp" key={area}>
            <div className="bp-head"><div /> {BP_COLS.map(([c, cl], i) => <div key={c} className={`eyebrow bp-col c-${COLOURS[i]}`}>{cl}</div>)}</div>
            {BP_ROWS.map(([r, rl, hint]) => (
              <div className="bp-row" key={r}>
                <div className="bp-rowhead"><div className="label">{rl}</div><div className="sub">{hint}</div></div>
                {BP_COLS.map(([c, cl], i) => (
                  <div className={`bp-cell ${COLOURS[i]}`} key={c}>
                    <span className={`bp-cell-label c-${COLOURS[i]}`}>{cl}</span>
                    <Debounced id={`bp-${area}-${r}-${c}`} aria-label={`${rl} — ${cl}`} value={cell(bp, area, r, c)} onSave={saveCell(area, r, c)} placeholder="—" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid" key="mental" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {Object.entries(MENTAL).map(([k, [kl, fields]], i) => (
              <div className={`card mental ${COLOURS[i]}`} key={k}>
                <h3>{kl}</h3>
                <div className="fields" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
                  {fields.map(([f, fl]) => <Field key={f} id={`m-${k}-${f}`} label={fl}><Debounced id={`m-${k}-${f}`} value={mcell(bp, k, f)} onSave={saveMental(k, f)} style={{ minHeight: 64 }} /></Field>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section" style={{ marginTop: 14 }}>
        <div className="group">
          <div className="group-title"><h3>Goals</h3><button className="btn" onClick={() => setSheet(true)}>Add goal</button></div>
          {goals.length ? goals.map(g => (
            <div className="row goal-row" key={g.id}>
              <div className="grow">
                <div className="label">{g.metric} <span className="muted small">· {g.area}</span> {g.source === 'example' && <span className="pill example">example</span>}</div>
                <div className="sub num">Baseline {fmt(g.baseline, 2).replace(/\.?0+$/, '')} → target {fmt(g.target, 2).replace(/\.?0+$/, '')} {g.unit}{g.by ? ` by ${g.by}` : ''}</div>
                <div className="progress" style={{ marginTop: 6 }}><i style={{ width: `${(goalProgress(g) * 100).toFixed(0)}%` }} /></div>
              </div>
              <label className="small muted" htmlFor={`cur-${g.id}`}>now</label>
              <input id={`cur-${g.id}`} className="inline-input" type="number" step="any" defaultValue={g.current ?? ''} onBlur={e => goalRepo.update(g.id, { current: num(e.target.value) })} />
              <DeleteButton label={`Delete goal: ${g.metric}`} onClick={() => removeWithUndo(goalRepo, g.id, 'Goal deleted')} />
            </div>
          )) : <div className="empty">No goals yet.</div>}
        </div>
      </div>

      <Sheet open={paste} title={`Paste ${BP_AREAS.find(([a]) => a === area)?.[1] || 'Swing'} blueprint`} onClose={() => setPaste(false)}>
        <div className="sub">In Excel, select the whole grid (header row included), copy, and paste it here. Semicolons inside a cell become separate lines. This replaces the current {BP_AREAS.find(([a]) => a === area)?.[1] || 'Swing'} grid.</div>
        <textarea value={grid} onChange={e => setGrid(e.target.value)} style={{ minHeight: 180, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, border: 0, borderRadius: 12, padding: 10, background: 'var(--bg)', color: 'var(--ink)' }} aria-label="Pasted grid" placeholder={'Section\tBackswing / Setup\tDownswing / Delivery\tFollow-through / Notes\nSet-up Checks\t…\t…\t…'} />
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
