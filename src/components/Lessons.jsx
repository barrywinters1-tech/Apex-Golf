import { useState } from 'react';
import { lessons as repo } from '../db/repo.js';
import { aiConfigured, summariseLesson } from '../lib/ai.js';
import { matrixText } from '../lib/blueprint.js';
import { PRACTICE_MODES, SHOT_ROUTINE } from '../lib/knowledge.js';
import { Field, lines } from './ui.jsx';
import Sheet from './Sheet.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayMonth = d => { const [y, m, dd] = (d || '').split('-'); return { day: dd, month: MONTHS[+m - 1] || '', year: y }; };
const modeOf = t => { const m = /\[(technique|skill|performance)\]/i.exec(t || ''); return m ? m[1].toLowerCase() : null; };
const stripMode = t => (t || '').replace(/\s*\[(technique|skill|performance)\]\s*/i, '').trim();

export default function Lessons({ lessons, bp, goals }) {
  const [sheet, setSheet] = useState(false);
  const [f, setF] = useState({ date: '', focus: '', raw: '', notes: '', drills: '', priorities: '', coachnowUrl: '' });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const last = lessons.at(-1);
  const daysSince = d => d ? Math.round((Date.now() - new Date(d)) / 86400000) : null;
  const allDrills = lessons.flatMap(l => l.drills || []);
  const modeCounts = PRACTICE_MODES.map(([k, l]) => [k, l, allDrills.filter(d => modeOf(d) === k).length]);

  const generate = async () => {
    if (!f.raw.trim()) { setStatus('Paste some notes first.'); return; }
    setBusy(true); setStatus('Thinking…');
    try {
      const out = await summariseLesson({ raw: f.raw, blueprint: matrixText(bp), goals });
      setF(x => ({ ...x, notes: out.summary || x.notes, drills: (out.drills || []).join('\n'), priorities: (out.priorities || []).join('\n'), focus: x.focus || out.focus || '' }));
      setStatus('Done — edit anything before saving.');
    } catch (e) { setStatus('Could not generate a summary. Fill the fields in by hand.'); console.warn(e); }
    setBusy(false);
  };
  const save = async e => {
    e.preventDefault();
    await repo.add({ date: f.date, focus: f.focus.trim(), notes: f.notes.trim() || f.raw.trim(), raw: f.raw.trim(), drills: lines(f.drills), priorities: lines(f.priorities), coachnowUrl: f.coachnowUrl.trim(), source: 'manual' });
    setF({ date: '', focus: '', raw: '', notes: '', drills: '', priorities: '', coachnowUrl: '' }); setStatus(''); setSheet(false);
  };

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><div className="date-line">Coaching log</div><h1>Lessons</h1></div>
        <button className="btn primary" onClick={() => setSheet(true)}>New lesson</button>
      </div>

      <div className="grid grid-hero">
        <div className="card focus-card">
          <div className="date-line">Current focus</div>
          {last ? <>
            <h2 style={{ marginTop: 4 }}>{last.focus}</h2>
            <div className="muted small" style={{ marginTop: 4 }}>{daysSince(last.date)} days since the last lesson{last.source === 'example' ? ' · example' : ''}</div>
            {last.notes && <p className="tl-notes" style={{ marginTop: 10 }}>{last.notes}</p>}
            {last.drills?.length > 0 && <div style={{ marginTop: 12 }}><div className="eyebrow">Drills</div><div>{last.drills.map((x, i) => { const m = modeOf(x); return <span className={`tag ${m ? `mode-${m}` : ''}`} key={i}>{m && <i className={`mode-dot ${m}`} />}{stripMode(x)}</span>; })}</div></div>}
            {last.priorities?.length > 0 && <div style={{ marginTop: 12 }}><div className="eyebrow">Priorities until next lesson</div><div className="prio-list">{last.priorities.map((p, i) => <div className="prio" key={i}><span className="prio-n">{i + 1}</span>{p}</div>)}</div></div>}
          </> : <div className="empty">No lesson logged yet.</div>}
        </div>
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="group">
            <div className="group-title"><h3>Practice mix</h3><span className="hint">from logged drills</span></div>
            {modeCounts.map(([k, l, n]) => (
              <div className="row" key={k}><div className={`mode-dot ${k}`} /><div className="grow"><div className="label">{l}</div><div className="sub">{PRACTICE_MODES.find(m => m[0] === k)[2]}</div></div><div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{n}</div></div>
            ))}
          </div>
          <div className="group">
            <div className="group-title"><h3>Every shot</h3><span className="hint">own-caddie routine</span></div>
            <div className="row"><div className="routine">{SHOT_ROUTINE.map((s, i) => <span key={i}><b>{i + 1}</b> {s}</span>)}</div></div>
          </div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 14 }}>
        <div className="section-label eyebrow">History</div>
        <div className="timeline">
          {lessons.length ? lessons.slice().reverse().map(l => { const d = dayMonth(l.date); return (
            <div className="tl-item" key={l.id}>
              <div className="tl-date"><div className="d">{d.day}</div><div className="m">{d.month}</div></div>
              <div className="card tl-card">
                <div className="tl-head"><h3>{l.focus}</h3>{l.source === 'example' && <span className="pill example">example</span>}</div>
                <p className="tl-notes">{l.notes}</p>
                {l.drills?.length > 0 && <div className="tl-k">Drills</div>}
                {l.drills?.length > 0 && <div>{l.drills.map((x, i) => { const m = modeOf(x); return <span className={`tag ${m ? `mode-${m}` : ''}`} key={i}>{m && <i className={`mode-dot ${m}`} />}{stripMode(x)}</span>; })}</div>}
                {l.priorities?.length > 0 && <div className="tl-k">Priorities</div>}
                {l.priorities?.length > 0 && <div>{l.priorities.map((x, i) => <span className="tag" key={i}>{x}</span>)}</div>}
                <div className="tl-foot">
                  {l.coachnowUrl && <a className="btn quiet" href={l.coachnowUrl} target="_blank" rel="noreferrer">Open in CoachNow ↗</a>}
                  <button className="btn danger" onClick={() => repo.remove(l.id)}>Remove</button>
                </div>
              </div>
            </div>); }) : <div className="empty">No lessons logged yet.</div>}
        </div>
      </div>

      <Sheet open={sheet} title="New lesson" onClose={() => setSheet(false)}>
        <form className="fields" onSubmit={save}>
          <Field id="l-date" label="Date"><input id="l-date" type="date" required value={f.date} onChange={set('date')} /></Field>
          <Field id="l-focus" label="Focus" className="wide"><input id="l-focus" required placeholder="e.g. Driver start line" value={f.focus} onChange={set('focus')} /></Field>
          <Field id="l-raw" label="Raw notes or transcript" className="wide"><textarea id="l-raw" style={{ minHeight: 120 }} placeholder="What the coach said, what was worked on, what was measured…" value={f.raw} onChange={set('raw')} /></Field>
          {aiConfigured() && <div className="wide" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><button type="button" className="btn" disabled={busy} onClick={generate}>Generate summary & drills</button><span className="status">{status}</span></div>}
          <Field id="l-notes" label="Summary" className="wide"><textarea id="l-notes" value={f.notes} onChange={set('notes')} /></Field>
          <Field id="l-drills" label="Drills · one per line, tag [Technique] [Skill] or [Performance]"><textarea id="l-drills" value={f.drills} onChange={set('drills')} /></Field>
          <Field id="l-prio" label="Priorities · one per line"><textarea id="l-prio" value={f.priorities} onChange={set('priorities')} /></Field>
          <Field id="l-cn" label="CoachNow post link (optional)" className="wide"><input id="l-cn" type="url" placeholder="https://…" value={f.coachnowUrl} onChange={set('coachnowUrl')} /></Field>
          <button className="btn primary block wide" type="submit">Save lesson</button>
        </form>
      </Sheet>
    </div>
  );
}
