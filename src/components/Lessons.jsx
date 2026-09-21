import { useState } from 'react';
import { lessons as repo } from '../db/repo.js';
import { aiConfigured, summariseLesson } from '../lib/ai.js';
import { Field, lines } from './ui.jsx';
import Sheet from './Sheet.jsx';
import { matrixText } from '../lib/blueprint.js';

export default function Lessons({ lessons, bp, goals }) {
  const [sheet, setSheet] = useState(false);
  const [f, setF] = useState({ date: '', focus: '', raw: '', notes: '', drills: '', priorities: '', coachnowUrl: '' });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

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
        <div><h1>Lessons</h1><div className="sub">Every lesson leaves a summary, drills and priorities behind. Link the CoachNow post for the video.</div></div>
        <button className="btn primary" onClick={() => setSheet(true)}>New lesson</button>
      </div>
      <div className="group">
        {lessons.length ? lessons.slice().reverse().map(l => (
          <div className="lesson" key={l.id}>
            <div className="when">{l.date} {l.source === 'example' && <span className="pill example">example</span>}</div>
            <h4>{l.focus}</h4>
            <p>{l.notes}</p>
            {l.drills?.length > 0 && <><div className="k">DRILLS</div><div>{l.drills.map((d, i) => <span className="tag" key={i}>{d}</span>)}</div></>}
            {l.priorities?.length > 0 && <><div className="k">PRIORITIES UNTIL NEXT LESSON</div><div>{l.priorities.map((d, i) => <span className="tag" key={i}>{d}</span>)}</div></>}
            <div className="foot">
              {l.coachnowUrl && <a className="btn quiet" href={l.coachnowUrl} target="_blank" rel="noreferrer">Open in CoachNow ↗</a>}
              <button className="btn danger" onClick={() => repo.remove(l.id)}>Remove</button>
            </div>
          </div>
        )) : <div className="empty">No lessons logged yet.</div>}
      </div>

      <Sheet open={sheet} title="New lesson" onClose={() => setSheet(false)}>
        <form className="fields" onSubmit={save}>
          <Field id="l-date" label="Date"><input id="l-date" type="date" required value={f.date} onChange={set('date')} /></Field>
          <Field id="l-focus" label="Focus" className="wide"><input id="l-focus" required placeholder="e.g. Driver start line" value={f.focus} onChange={set('focus')} /></Field>
          <Field id="l-raw" label="Raw notes or transcript" className="wide"><textarea id="l-raw" style={{ minHeight: 120 }} placeholder="What the coach said, what was worked on, what was measured…" value={f.raw} onChange={set('raw')} /></Field>
          {aiConfigured() && <div className="wide" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><button type="button" className="btn" disabled={busy} onClick={generate}>Generate summary & drills</button><span className="status">{status}</span></div>}
          <Field id="l-notes" label="Summary" className="wide"><textarea id="l-notes" value={f.notes} onChange={set('notes')} /></Field>
          <Field id="l-drills" label="Drills · one per line"><textarea id="l-drills" value={f.drills} onChange={set('drills')} /></Field>
          <Field id="l-prio" label="Priorities · one per line"><textarea id="l-prio" value={f.priorities} onChange={set('priorities')} /></Field>
          <Field id="l-cn" label="CoachNow post link (optional)" className="wide"><input id="l-cn" type="url" placeholder="https://…" value={f.coachnowUrl} onChange={set('coachnowUrl')} /></Field>
          <button className="btn primary block wide" type="submit">Save lesson</button>
        </form>
      </Sheet>
    </div>
  );
}
