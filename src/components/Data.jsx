import { useState } from 'react';
import { aggregateTrackman, parseCSV, normDate, dateFromFilename } from '../lib/trackman.js';
import { sessions, rounds, exportAll, importAll, clearExamples } from '../db/repo.js';
import { encodeShare } from '../lib/share.js';
import { Field, num } from './ui.jsx';

const findCol = (H, ...pats) => { for (const p of pats) { const i = H.findIndex(h => p.test(h)); if (i >= 0) return i; } return -1; };
function importRounds(text, fallbackDate) {
  const rows = parseCSV(text); if (rows.length < 2) throw new Error('Need a header row plus data');
  const H = rows[0].map(h => h.trim().toLowerCase());
  const c = { date: findCol(H, /date/), course: findCol(H, /course|venue/), par: findCol(H, /^par/), score: findCol(H, /score|gross|total/), fir: findCol(H, /fairway|^fir$/), firOf: findCol(H, /fairways? ?of|fir ?of/), gir: findCol(H, /gir|greens/), putts: findCol(H, /putt/), ud: findCol(H, /up ?(and|&) ?down|scramb/), udo: findCol(H, /up ?(and|&) ?down ?of|scramb.*of/), pen: findCol(H, /penal/), sgT: findCol(H, /sg.*(tee|driv)|off ?the ?tee/), sgA: findCol(H, /sg.*app|approach/), sgG: findCol(H, /sg.*(around|arg|short)/), sgP: findCol(H, /sg.*putt/) };
  if (c.score < 0) throw new Error('No score column found');
  const g = (r, i) => (i >= 0 ? r[i] : '');
  return rows.slice(1).map(r => ({ date: normDate(g(r, c.date)) || fallbackDate, course: (g(r, c.course) || 'Round').trim(), par: num(g(r, c.par)) ?? 72, score: num(g(r, c.score)), fir: num(g(r, c.fir)), firOf: num(g(r, c.firOf)) ?? 14, gir: num(g(r, c.gir)), putts: num(g(r, c.putts)), upDown: num(g(r, c.ud)), upDownOf: num(g(r, c.udo)), pen: num(g(r, c.pen)), sgT: num(g(r, c.sgT)), sgA: num(g(r, c.sgA)), sgG: num(g(r, c.sgG)), sgP: num(g(r, c.sgP)), source: 'import' })).filter(r => r.score != null);
}

export default function Data({ examples, counts = {}, cloud = false, isCoach = true }) {
  const [type, setType] = useState('trackman');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('Range, low-compression balls');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [json, setJson] = useState('');
  const [jstatus, setJstatus] = useState('');
  const [share, setShare] = useState('');
  const [sstatus, setSstatus] = useState('');

  const onFiles = async e => {
    const files = [...e.target.files]; if (!files.length) return;
    let n = 0, shots = 0;
    try {
      for (const f of files) {
        const t = await f.text();
        if (type === 'trackman') { const d = normDate(f.name.slice(0, 10)) || dateFromFilename(f.name) || date || new Date().toISOString().slice(0, 10); const s = aggregateTrackman(t, { date: d, notes, source: 'trackman' }); await sessions.bulkAdd(s); n += s.length; shots += s.reduce((a, x) => a + x.shots, 0); }
        else { const r = importRounds(t, date || new Date().toISOString().slice(0, 10)); await rounds.bulkAdd(r); n += r.length; }
      }
      setStatus(type === 'trackman' ? `Imported ${n} club sessions from ${shots} shots.` : `Imported ${n} rounds.`);
    } catch (err) { setStatus(err.message); }
    e.target.value = '';
  };
  const onPaste = async () => {
    try {
      if (type === 'trackman') { const s = aggregateTrackman(text, { date: date || new Date().toISOString().slice(0, 10), notes, source: 'trackman' }); await sessions.bulkAdd(s); setStatus(`Imported ${s.length} club sessions from ${s.reduce((a, x) => a + x.shots, 0)} shots.`); }
      else { const r = importRounds(text, date || new Date().toISOString().slice(0, 10)); await rounds.bulkAdd(r); setStatus(`Imported ${r.length} rounds.`); }
      setText('');
    } catch (e) { setStatus(e.message); }
  };

  return (
    <div className="fade-in">
      <div className="page-head"><div><div className="date-line">In and out</div><h1>Data</h1></div></div>
      {examples && <div className="banner"><p><b>Example rows are still in.</b> Rounds, lessons and some goals marked <i>example</i> are placeholders. TrackMan sessions are real.</p><button className="btn" onClick={clearExamples}>Clear examples</button></div>}

      <div className="share-card">
        <div className="share-top">
          <div><div className="k">Share with your coach</div><h2>One link, everything on this device</h2><div className="s">{counts.sessions ?? 0} TrackMan sessions · {counts.rounds ?? 0} rounds · {counts.lessons ?? 0} lessons · blueprint · goals. {cloud ? 'Your account syncs automatically; this link is for anyone without one.' : 'No account, no server — re-send after each update.'}</div></div>
        </div>
        <div className="share-actions">
          <button className="btn share-btn" onClick={async () => { const u = await encodeShare(await exportAll()); setShare(u); try { await navigator.clipboard.writeText(u); setSstatus(`Link copied · ${(u.length / 1024).toFixed(1)} KB`); } catch { setSstatus('Copy the link below.'); } }}>Create share link</button>
          {share && navigator.share && <button className="btn share-btn" onClick={() => navigator.share({ title: 'Apex Golf — my roadmap', url: share }).catch(() => {})}>Send…</button>}
          <span className="status" style={{ color: 'inherit', opacity: 0.85 }}>{sstatus}</span>
        </div>
        {share && <input readOnly value={share} onFocus={e => e.target.select()} className="share-url" aria-label="Share link" />}
      </div>

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Import</h3><div className="sub">TrackMan Range app export works as-is: shots are averaged per club, Avg/Dev rows skipped. Date comes from the file name (16-jul-2026_… or 2026-07-16.csv) or the field below.</div>
          <div className="fields">
            <Field id="i-type" label="Type"><select id="i-type" value={type} onChange={e => setType(e.target.value)}><option value="trackman">TrackMan shots</option><option value="rounds">Rounds</option></select></Field>
            <Field id="i-date" label="Date if not in file"><input id="i-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
            {type === 'trackman' && <Field id="i-notes" label="Conditions" className="wide"><input id="i-notes" value={notes} onChange={e => setNotes(e.target.value)} /></Field>}
            <Field id="i-file" label="CSV files" className="wide"><input id="i-file" type="file" accept=".csv,text/csv" multiple onChange={onFiles} /></Field>
            <Field id="i-text" label="…or paste CSV" className="wide"><textarea id="i-text" value={text} onChange={e => setText(e.target.value)} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, minHeight: 100 }} /></Field>
            <div className="wide" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><button className="btn primary" onClick={onPaste} disabled={!text.trim()}>Import pasted</button><span className="status">{status}</span></div>
          </div>
        </div>
        <div className="card">
          <h3>Backup</h3><div className="sub">Everything as JSON. Copy it out, or paste one in to replace all data on this device.</div>
          <div className="fields">
            <textarea className="wide" value={json} onChange={e => setJson(e.target.value)} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, minHeight: 160, border: 0, borderRadius: 12, padding: 10, background: 'var(--bg)', color: 'var(--ink)' }} aria-label="JSON backup" />
            <div className="wide" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn" onClick={async () => setJson(JSON.stringify(await exportAll(), null, 1))}>Show current</button>
              <button className="btn" onClick={async () => { const j = JSON.stringify(await exportAll()); setJson(j); try { await navigator.clipboard.writeText(j); setJstatus('Copied.'); } catch { setJstatus('Select and copy manually.'); } }}>Copy</button>
              <button className="btn danger" onClick={async () => { if (!confirm('Replace all data on this device with the pasted JSON?')) return; try { await importAll(JSON.parse(json), { library: isCoach }); setJstatus('Replaced.'); } catch (e) { setJstatus(e.message); } }}>Replace with pasted</button>
              <span className="status">{jstatus}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
