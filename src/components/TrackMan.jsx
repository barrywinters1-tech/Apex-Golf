import { useMemo, useState } from 'react';
import LineChart from '../charts/LineChart.jsx';
import { sessions as repo } from '../db/repo.js';
import { BENCHMARKS as B, clubRank } from '../db/index.js';
import { latestByClub, goalFor, fmt, sgn, shortDate } from '../lib/stats.js';
import { Field, num, formData } from './ui.jsx';
import Sheet from './Sheet.jsx';

const METRICS = [['chs', 'Club speed', 1], ['bs', 'Ball speed', 1], ['smash', 'Smash factor', 2], ['carry', 'Carry', 0], ['total', 'Total', 0], ['spin', 'Spin', 0], ['launch', 'Launch angle', 1], ['side', 'Side dispersion', 0], ['aoa', 'Attack angle', 1], ['path', 'Club path', 1], ['ftp', 'Face to path', 1]];
const CLUBS = ['Driver', '3 Wood', '5 Wood', 'Hybrid', '4 Iron', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron', 'PW', 'Gap Wedge', 'SW', 'LW'];

export default function TrackMan({ sessions, goals }) {
  const latest = useMemo(() => latestByClub(sessions).sort((a, b) => clubRank(a.club) - clubRank(b.club)), [sessions]);
  const clubs = latest.map(s => s.club);
  const [club, setClub] = useState(clubs[0] || 'Driver');
  const [metric, setMetric] = useState('chs');
  const [sheet, setSheet] = useState(false);
  const activeClub = clubs.includes(club) ? club : clubs[0];
  const [, mLabel, dec] = METRICS.find(m => m[0] === metric);
  const pts = sessions.filter(s => s.club === activeClub && s[metric] != null).map(s => ({ x: shortDate(s.date), y: s[metric] }));
  const isDriver = /driver/i.test(activeClub || '');
  const gC = goalFor(goals, 'chs');

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><h1>TrackMan</h1><div className="sub">Club averages per session. Signed values: right / open = +, left / closed = −.</div></div>
        <button className="btn primary" onClick={() => setSheet(true)}>Add session</button>
      </div>

      <div className="group">
        <div className="group-title"><h3>Latest by club</h3><span className="hint">{latest.length} clubs</span></div>
        <div className="tablewrap"><table>
          <thead><tr><th>Club</th><th>Date</th><th className="r">Shots</th><th className="r">Club</th><th className="r">Ball</th><th className="r">Smash</th><th className="r">Launch</th><th className="r">Spin</th><th className="r">Carry</th><th className="r">Total</th><th className="r">Side</th><th className="r">AoA</th><th className="r">Path</th><th className="r">Face–path</th></tr></thead>
          <tbody>{latest.map(s => (
            <tr key={s.club} onClick={() => setClub(s.club)} style={{ cursor: 'pointer', background: s.club === activeClub ? 'var(--accent-soft)' : undefined }}>
              <td><b>{s.club}</b></td><td className="muted">{s.date}</td><td className="r">{s.shots ?? '—'}</td>
              <td className="r">{fmt(s.chs, 1)}</td><td className="r">{fmt(s.bs, 1)}</td><td className="r">{fmt(s.smash, 2)}</td><td className="r">{fmt(s.launch, 1)}</td><td className="r">{fmt(s.spin)}</td><td className="r">{fmt(s.carry)}</td><td className="r">{fmt(s.total)}</td><td className="r">{fmt(s.side)}</td>
              <td className="r">{sgn(s.aoa)}</td><td className="r">{sgn(s.path)}</td><td className="r">{sgn(s.ftp)}</td>
            </tr>))}
          {!latest.length && <tr><td colSpan="14" className="empty">No sessions yet — add one or import a TrackMan CSV under Data.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="page-head" style={{ marginBottom: 6 }}>
          <div><h3>{activeClub} · {mLabel}</h3><div className="sub">{pts.length} session{pts.length === 1 ? '' : 's'}</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={activeClub} onChange={e => setClub(e.target.value)} className="inline-input" style={{ width: 'auto', textAlign: 'left' }}>{clubs.map(c => <option key={c}>{c}</option>)}</select>
            <select value={metric} onChange={e => setMetric(e.target.value)} className="inline-input" style={{ width: 'auto', textAlign: 'left' }}>{METRICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
        </div>
        <LineChart points={pts} dec={dec} bench={isDriver && B[metric] ? B[metric].d1 : null} target={isDriver && metric === 'chs' ? gC?.target : null} label={`${activeClub} ${mLabel}`} />
        <div className="legend"><span>{mLabel}</span>{isDriver && metric === 'chs' && gC && <span className="t">Target</span>}{isDriver && B[metric] && <span className="b">D1 men (approx.)</span>}</div>
      </div>

      <div className="group" style={{ marginTop: 18 }}>
        <div className="group-title"><h3>All sessions</h3></div>
        <div className="tablewrap"><table>
          <thead><tr><th>Date</th><th>Club</th><th className="r">Shots</th><th className="r">Club</th><th className="r">Ball</th><th className="r">Smash</th><th className="r">Carry</th><th className="r">Total</th><th className="r">Side</th><th className="r">Path</th><th className="r">Face–path</th><th>Source</th><th></th></tr></thead>
          <tbody>{sessions.slice().reverse().map(s => (
            <tr key={s.id}>
              <td>{s.date}</td><td>{s.club}</td><td className="r">{s.shots ?? '—'}</td><td className="r">{fmt(s.chs, 1)}</td><td className="r">{fmt(s.bs, 1)}</td><td className="r">{fmt(s.smash, 2)}</td><td className="r">{fmt(s.carry)}</td><td className="r">{fmt(s.total)}</td><td className="r">{fmt(s.side)}</td><td className="r">{sgn(s.path)}</td><td className="r">{sgn(s.ftp)}</td>
              <td className="muted small">{s.source}{s.notes ? ` · ${s.notes}` : ''}</td>
              <td><button className="btn danger" onClick={() => repo.remove(s.id)}>Remove</button></td>
            </tr>))}</tbody>
        </table></div>
      </div>

      <Sheet open={sheet} title="Add session" onClose={() => setSheet(false)}>
        <form className="fields" onSubmit={async e => { e.preventDefault(); const d = formData(e.target); await repo.add({ date: d.date, club: d.club.trim(), shots: num(d.shots), chs: num(d.chs), bs: num(d.bs), smash: num(d.smash), launch: num(d.launch), spin: num(d.spin), carry: num(d.carry), total: num(d.total), side: num(d.side), aoa: num(d.aoa), path: num(d.path), ftp: num(d.ftp), source: 'manual', notes: d.notes.trim() }); setSheet(false); }}>
          <Field id="s-date" label="Date"><input id="s-date" name="date" type="date" required /></Field>
          <Field id="s-club" label="Club"><input id="s-club" name="club" list="clubs" required placeholder="Driver" /><datalist id="clubs">{CLUBS.map(c => <option key={c} value={c} />)}</datalist></Field>
          <Field id="s-shots" label="Shots"><input id="s-shots" name="shots" type="number" inputMode="numeric" /></Field>
          <Field id="s-chs" label="Club speed (mph)"><input id="s-chs" name="chs" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-bs" label="Ball speed (mph)"><input id="s-bs" name="bs" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-smash" label="Smash"><input id="s-smash" name="smash" type="number" step="0.01" inputMode="decimal" /></Field>
          <Field id="s-launch" label="Launch (°)"><input id="s-launch" name="launch" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-spin" label="Spin (rpm)"><input id="s-spin" name="spin" type="number" step="10" inputMode="numeric" /></Field>
          <Field id="s-carry" label="Carry (yds)"><input id="s-carry" name="carry" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-total" label="Total (yds)"><input id="s-total" name="total" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-side" label="Side (yds, abs)"><input id="s-side" name="side" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-aoa" label="Attack angle (°)"><input id="s-aoa" name="aoa" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-path" label="Club path (°, R+)"><input id="s-path" name="path" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-ftp" label="Face to path (°)"><input id="s-ftp" name="ftp" type="number" step="0.1" inputMode="decimal" /></Field>
          <Field id="s-notes" label="Conditions" className="wide"><input id="s-notes" name="notes" placeholder="Range, premium balls, indoor…" /></Field>
          <button className="btn primary block wide" type="submit">Add session</button>
        </form>
      </Sheet>
    </div>
  );
}
