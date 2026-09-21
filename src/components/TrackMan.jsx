import { useMemo, useState } from 'react';
import LineChart from '../charts/LineChart.jsx';
import Dispersion, { dispersionStats } from '../charts/Dispersion.jsx';
import { sessions as repo } from '../db/repo.js';
import { BENCHMARKS as B, clubRank } from '../db/index.js';
import { latestByClub, goalFor, fmt, sgn, shortDate } from '../lib/stats.js';
import { impactReport } from '../lib/knowledge.js';
import FlightView from '../charts/FlightView.jsx';
import LaunchWindow from '../charts/LaunchWindow.jsx';
import ImpactClock from '../charts/ImpactClock.jsx';
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
  const [showAll, setShowAll] = useState(false);
  const activeClub = clubs.includes(club) ? club : clubs[0];
  const [, mLabel, dec] = METRICS.find(m => m[0] === metric);
  const pts = sessions.filter(s => s.club === activeClub && s[metric] != null).map(s => ({ x: shortDate(s.date), y: s[metric] }));
  const isDriver = /driver/i.test(activeClub || '');
  const gC = goalFor(goals, 'chs');
  const clubSessions = sessions.filter(x => x.club === activeClub && x.shotList?.length);
  const [dIdx, setDIdx] = useState(-1);
  const dSess = clubSessions.at(dIdx) || clubSessions.at(-1);
  const ds = dSess ? dispersionStats(dSess.shotList) : null;
  const row = dSess || latest.find(x => x.club === activeClub);
  const report = impactReport(row, { premiumBall: !/low-compression|range ball/i.test((row || {}).notes || '') });

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><div className="date-line">Launch monitor</div><h1>TrackMan</h1></div>
        <button className="btn primary" onClick={() => setSheet(true)}>Add session</button>
      </div>

      <div className="shelf club-shelf">
        {latest.map(s => (
          <button key={s.club} className={`clubcard ${s.club === activeClub ? 'on' : ''}`} onClick={() => { setClub(s.club); setDIdx(-1); }} aria-pressed={s.club === activeClub}>
            <div className="k">{s.club}</div>
            <div className="v">{fmt(s.carry)}<small>yds</small></div>
            <div className="s">{fmt(s.bs, 0)} mph · {fmt(s.smash, 2)} smash</div>
          </button>
        ))}
        {!latest.length && <div className="empty">No sessions yet — add one or import a TrackMan CSV under Data.</div>}
      </div>

      <div className="grid grid-hero" style={{ marginTop: 14 }}>
        <div className="hero">
          <div className="hero-head">
            <div className="title"><h3>{activeClub} dispersion</h3>{dSess && <span className="muted small">{dSess.shots} shots · {dSess.notes || dSess.date}</span>}</div>
            {clubSessions.length > 1 && <div className="chips">{clubSessions.map((x, i) => <button key={x.id ?? i} className="chip" aria-pressed={x === dSess} onClick={() => setDIdx(i - clubSessions.length)}>{shortDate(x.date)}</button>)}</div>}
          </div>
          <Dispersion shots={dSess?.shotList || []} club={activeClub} compact fairway={isDriver ? 15 : 10} benchmarks={isDriver ? [{ label: 'D1 carry', v: B.carry.d1 }, { label: 'Tour', v: B.carry.tour, cls: 'gold' }] : /7 iron/i.test(activeClub) ? [{ label: 'D1 7i carry', v: B.iron7.d1 }] : []} />
          {ds && <div className="hero-stats">
            <div className="hstat"><div className="k">Avg carry</div><div className="v">{ds.carry.toFixed(0)}<small>yds</small></div></div>
            <div className="hstat"><div className="k">Carry ±</div><div className="v">{ds.carrySd.toFixed(1)}<small>yds</small></div></div>
            <div className="hstat"><div className="k">Side ±</div><div className="v">{ds.latSd.toFixed(1)}<small>yds</small></div></div>
            <div className="hstat"><div className="k">Miss bias</div><div className="v txt">{ds.left > ds.right ? 'Left' : ds.right > ds.left ? 'Right' : 'Even'}<small>{Math.max(ds.left, ds.right)} of {ds.n}</small></div></div>
          </div>}
        </div>

        <div className="group">
          <div className="group-title"><h3>Impact report</h3><span className="hint">what the numbers say at the ball</span></div>
          {report.length ? report.map(r => (
            <div className="row" key={r.law}>
              <div className={`dot l${r.level}`} aria-hidden="true" />
              <div className="grow"><div className="label">{r.law} <span className="muted small">· {r.metric}</span></div><div className="sub">{r.verdict.charAt(0).toUpperCase() + r.verdict.slice(1)}. {r.note}</div></div>
            </div>
          )) : <div className="empty">Pick a club with TrackMan data.</div>}
        </div>
      </div>

      <div className="grid grid-hero" style={{ marginTop: 14 }}>
        <div className="hero">
          <div className="hero-head"><div className="title"><h3>Ball flight</h3>{dSess && <span className="muted small">{activeClub} · {dSess.shots} shots</span>}</div></div>
          <FlightView shots={dSess?.shotList || []} benchmarks={isDriver ? [{ label: 'D1 270', v: B.carry.d1 }, { label: 'Tour 282', v: B.carry.tour, cls: 'gold' }] : []} />
          <div className="legend"><span>Each shot</span><span className="best">Longest</span></div>
        </div>
        <div className="card">
          <h3>Launch window</h3><div className="sub">Ball speed × launch angle. Dots inside the shaded window turn speed into carry; dots below it leak it.</div>
          <LaunchWindow shots={dSess?.shotList || []} club={activeClub} />
        </div>
      </div>

      {row && <div className="grid grid-hero" style={{ marginTop: 14 }}>
        <div className="card"><h3>At impact</h3><div className="sub">How the club arrived, drawn the way the coach draws it</div><ImpactClock path={row.path ?? 0} ftp={row.ftp ?? 0} aoa={row.aoa ?? 0} /></div>
        <div className="grid grid-tiles" style={{ alignContent: 'start' }}>
        <div className="tile speed"><div className="lbl">Club speed</div><div className="val">{fmt(row.chs, 1)}<small>mph</small></div>{isDriver && <div className="bench">D1 ~{B.chs.d1} · Tour ~{B.chs.tour}</div>}</div>
        <div className="tile strike"><div className="lbl">Smash factor</div><div className="val">{fmt(row.smash, 2)}</div><div className="bench">{isDriver ? 'Ideal ~1.48' : 'Ball speed ÷ club speed'}</div></div>
        <div className="tile"><div className="lbl">Launch · spin</div><div className="val">{fmt(row.launch, 1)}°<small>{fmt(row.spin)} rpm</small></div>{isDriver && <div className="bench">Driver window ~2,000–3,000 rpm</div>}</div>
        <div className="tile accuracy"><div className="lbl">Ball speed</div><div className="val">{fmt(row.bs, 1)}<small>mph</small></div>{isDriver && <div className="bench">D1 ~{B.bs.d1} · Tour ~{B.bs.tour}</div>}</div>
        </div>
      </div>}

      <div className="grid grid-2" style={{ marginTop: 14 }}>
      <div className="card">
        <div className="page-head" style={{ margin: '0 0 6px' }}>
          <div><h3>{activeClub} · {mLabel}</h3><div className="sub" style={{ margin: 0 }}>{pts.length} session{pts.length === 1 ? '' : 's'}</div></div>
          <select value={metric} onChange={e => setMetric(e.target.value)} className="inline-input" style={{ width: 'auto' }}>{METRICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <LineChart points={pts} dec={dec} bench={isDriver && B[metric] ? B[metric].d1 : null} target={isDriver && metric === 'chs' ? gC?.target : null} label={`${activeClub} ${mLabel}`} />
        <div className="legend"><span>{mLabel}</span>{isDriver && metric === 'chs' && gC && <span className="t">Target</span>}{isDriver && B[metric] && <span className="bl">D1 men (approx.)</span>}</div>
      </div>

      <div className="group">
        <div className="group-title"><h3>All sessions</h3><button className="btn quiet" onClick={() => setShowAll(v => !v)}>{showAll ? 'Hide' : `Show ${sessions.length}`}</button></div>
        {showAll && <div className="tablewrap"><table>
          <thead><tr><th>Date</th><th>Club</th><th className="r">Shots</th><th className="r">Club</th><th className="r">Ball</th><th className="r">Smash</th><th className="r">Carry</th><th className="r">Total</th><th className="r">Side</th><th className="r">Path</th><th className="r">Face–path</th><th>Source</th><th></th></tr></thead>
          <tbody>{sessions.slice().reverse().map(s => (
            <tr key={s.id}>
              <td>{s.date}</td><td>{s.club}</td><td className="r">{s.shots ?? '—'}</td><td className="r">{fmt(s.chs, 1)}</td><td className="r">{fmt(s.bs, 1)}</td><td className="r">{fmt(s.smash, 2)}</td><td className="r">{fmt(s.carry)}</td><td className="r">{fmt(s.total)}</td><td className="r">{fmt(s.side)}</td><td className="r">{sgn(s.path)}</td><td className="r">{sgn(s.ftp)}</td>
              <td className="muted small">{s.source}{s.notes ? ` · ${s.notes}` : ''}</td>
              <td><button className="btn danger" onClick={() => repo.remove(s.id)}>Remove</button></td>
            </tr>))}</tbody>
        </table></div>}
      </div>
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
