import { useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'motion';
import Rings from '../charts/Rings.jsx';
import LineChart from '../charts/LineChart.jsx';
import BarChart from '../charts/BarChart.jsx';
import Dispersion, { dispersionStats } from '../charts/Dispersion.jsx';
import Gapping from '../charts/Gapping.jsx';
import Radar, { scale } from '../charts/Radar.jsx';
import FlightView from '../charts/FlightView.jsx';
import { BENCHMARKS as B } from '../db/index.js';
import { roundSummary, driverSessions, goalProgress, goalFor, latestByClub, fmt, shortDate } from '../lib/stats.js';
import { Tile } from './ui.jsx';

function Count({ value, dec = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el || value == null || isNaN(value)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = Number(value).toFixed(dec); return; }
    const ctrl = animate(0, value, { duration: 1.1, ease: [0.2, 0.7, 0.2, 1], onUpdate: v => { el.textContent = v.toFixed(dec); } });
    return () => ctrl.stop();
  }, [value, dec]);
  return <span ref={ref}>{value == null || isNaN(value) ? '—' : Number(value).toFixed(dec)}</span>;
}

const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Overview({ player, sessions, rounds, goals, lessons = [] }) {
  const s = roundSummary(rounds);
  const drv = driverSessions(sessions), dl = drv.at(-1), dp = drv.at(-2);
  const gS = goalFor(goals, 'score'), gC = goalFor(goals, 'chs'), gSm = goalFor(goals, 'smash');
  const lr = s.latest;
  const lastLesson = lessons.at(-1);
  const daysSince = d => d ? Math.round((Date.now() - new Date(d)) / 86400000) : null;
  const sg = lr && [lr.sgT, lr.sgA, lr.sgG, lr.sgP].some(v => v != null)
    ? [['Off the tee', lr.sgT], ['Approach', lr.sgA], ['Around green', lr.sgG], ['Putting', lr.sgP]].filter(x => x[1] != null).map(([label, v]) => ({ label, v })) : [];

  const drvWithShots = drv.filter(x => x.shotList?.length);
  const [heroIdx, setHeroIdx] = useState(-1);
  const hero = drvWithShots.at(heroIdx) || drvWithShots.at(-1);
  const hs = hero ? dispersionStats(hero.shotList) : null;
  const hsPrev = drvWithShots.length > 1 ? dispersionStats(drvWithShots.at(-2).shotList) : null;
  const latest = useMemo(() => latestByClub(sessions), [sessions]);
  const i7 = sessions.filter(x => /7 iron/i.test(x.club)).at(-1);
  const axes = [
    { key: 'speed', label: 'Speed', value: scale(dl?.chs, B.chs.scratch, B.chs.d1, B.chs.tour), ref: 70 },
    { key: 'distance', label: 'Distance', value: scale(hs?.carry, B.carry.scratch, B.carry.d1, B.carry.tour), ref: 70 },
    { key: 'irons', label: 'Irons', value: scale(i7?.carry, B.iron7.scratch, B.iron7.d1, B.iron7.tour), ref: 70 },
    { key: 'accuracy', label: 'Accuracy', value: hs ? Math.min(100, hs.fairwayPct * 1.25) : null, ref: 70 },
    { key: 'greens', label: 'Greens', value: scale(s.gir, B.gir.scratch, B.gir.d1, B.gir.tour), ref: 70 },
    { key: 'putting', label: 'Putting', value: scale(s.putts, B.putts.scratch, B.putts.d1, B.putts.tour, true), ref: 70 },
    { key: 'scoring', label: 'Scoring', value: scale(s.scoring, B.score.scratch, B.score.d1, B.score.tour, true), ref: 70 },
  ];

  // Rings: Speed (club speed vs target), Strike (smash vs target), Accuracy (fairway % vs 70)
  const rings = [
    { key: 'speed', label: 'Speed', value: dl?.chs, target: gC?.target || B.chs.d1, unit: 'mph', color: 'var(--speed)', dec: 1, why: 'Driver club speed vs target' },
    { key: 'strike', label: 'Strike', value: dl?.smash, target: gSm?.target || 1.48, unit: '', color: 'var(--strike)', dec: 2, why: 'Smash factor vs 1.48' },
    { key: 'accuracy', label: 'Accuracy', value: hs?.fairwayPct, target: 70, unit: '%', color: 'var(--accuracy)', dec: 0, why: 'Shots inside a 30-yd fairway' },
  ];

  const trends = [
    dl && dp && { k: 'Driver club speed', s: `${shortDate(dp.date)} → ${shortDate(dl.date)}`, d: dl.chs - dp.chs, v: `${fmt(dl.chs, 1)}`, u: 'mph', better: 'up' },
    hs && hsPrev && { k: 'Carry', s: 'Average, driver', d: hs.carry - hsPrev.carry, v: fmt(hs.carry), u: 'yds', better: 'up' },
    hs && hsPrev && { k: 'Side dispersion', s: 'Tighter is better', d: hs.latSd - hsPrev.latSd, v: `±${fmt(hs.latSd, 1)}`, u: 'yds', better: 'down' },
    s.scoring != null && s.scoringPrev != null && { k: 'Scoring average', s: 'Last 5 vs previous 5', d: s.scoring - s.scoringPrev, v: fmt(s.scoring, 1), u: '', better: 'down' },
  ].filter(Boolean);
  const arrow = t => { if (Math.abs(t.d) < 0.05) return 'flat'; const good = t.better === 'up' ? t.d > 0 : t.d < 0; return good ? 'up' : 'down'; };

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><div className="date-line">{today()}</div><h1>Summary</h1></div>
        <div className="player-chip hide-sm">{player?.name}{player?.coach ? ` · Coach ${player.coach}` : ''}</div>
      </div>

      <div className="grid grid-hero">
        <div className="card rings-card">
          <Rings rings={rings} size={236} />
          <div className="ring-list">
            {rings.map(r => (
              <div className={`ring-item ${r.key}`} key={r.key}>
                <div className="k">{r.label}</div>
                <div className="v"><Count value={r.value} dec={r.dec} /><span className="of">/{r.target}</span> <small>{r.unit}</small></div>
                <div className="why">{r.why}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="group">
          <div className="group-title"><h3>Trends</h3><span className="hint">vs previous</span></div>
          {trends.length ? trends.map(t => (
            <div className="trend" key={t.k}>
              <div className={`arrow ${arrow(t)}`}>{arrow(t) === 'up' ? '↑' : arrow(t) === 'down' ? '↓' : '→'}</div>
              <div><div className="k">{t.k}</div><div className="s">{t.s} · {t.d > 0 ? '+' : ''}{t.d.toFixed(1)}</div></div>
              <div className="v">{t.v}<small>{t.u}</small></div>
            </div>
          )) : <div className="empty">Two sessions or rounds needed for trends.</div>}
        </div>
      </div>

      <div className="shelf" style={{ marginTop: 14 }}>
        {hs && <div className="hl speed"><div className="k">Best drive</div><div><div className="v"><Count value={hs.best} /><small>yds</small></div><div className="s">carry · {hero.date}</div></div></div>}
        {dl && <div className="hl strike"><div className="k">Ball speed</div><div><div className="v"><Count value={dl.bs} dec={1} /></div><div className="s">mph · driver, latest</div></div></div>}
        {hs && <div className="hl accuracy"><div className="k">Fairway hit</div><div><div className="v"><Count value={hs.fairwayPct} /><small>%</small></div><div className="s">{hs.n} shots · miss bias {hs.left > hs.right ? 'left' : hs.right > hs.left ? 'right' : 'even'}</div></div></div>}
        {lr && <div className="hl gold"><div className="k">Last round</div><div><div className="v">{lr.score}<small>{lr.score - lr.par >= 0 ? '+' : ''}{lr.score - lr.par}</small></div><div className="s">{lr.course} · {lr.date}</div></div></div>}
      </div>

      <div className="grid grid-hero" style={{ marginTop: 14 }}>
        <div className="card radar-card">
          <div><div className="date-line">Player profile</div><h3>Attributes vs D1</h3><div className="sub">100 = Tour · 70 = D1 outline · 50 = scratch</div></div>
          <Radar axes={axes} size={320} />
        </div>
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="hero">
            <div className="hero-head"><div className="title"><h3>Ball flight</h3>{hero && <span className="muted small">driver · every shot</span>}</div></div>
            <FlightView shots={hero?.shotList || []} benchmarks={[{ label: 'D1 270', v: B.carry.d1 }, { label: 'Tour 282', v: B.carry.tour, cls: 'gold' }]} />
            <div className="legend"><span>Each shot</span><span className="best">Longest</span></div>
          </div>
          <div className="card"><h3>Club gapping</h3><div className="sub">Latest carry per club</div><Gapping latest={latest} /></div>
        </div>
      </div>

      <div className="grid grid-hero" style={{ marginTop: 14 }}>
        <div className="hero">
          <div className="hero-head">
            <div className="title"><h3>Driver dispersion</h3>{hero && <span className="muted small">{hero.shots} shots · {hero.notes || hero.date}</span>}</div>
            {drvWithShots.length > 1 && <div className="chips">{drvWithShots.map((x, i) => <button key={x.id ?? i} className="chip" aria-pressed={x === hero} onClick={() => setHeroIdx(i - drvWithShots.length)}>{shortDate(x.date)}</button>)}</div>}
          </div>
          <Dispersion shots={hero?.shotList || []} club="Driver" compact benchmarks={[{ label: 'D1 carry', v: B.carry.d1 }, { label: 'Tour carry', v: B.carry.tour, cls: 'gold' }]} />
          {hs && <div className="hero-stats">
            <div className="hstat"><div className="k">Avg carry</div><div className="v"><Count value={hs.carry} /><small>yds</small></div></div>
            <div className="hstat"><div className="k">Carry ±</div><div className="v"><Count value={hs.carrySd} dec={1} /><small>yds</small></div></div>
            <div className="hstat"><div className="k">Side ±</div><div className="v"><Count value={hs.latSd} dec={1} /><small>yds</small></div></div>
            <div className="hstat"><div className="k">Miss bias</div><div className="v txt">{hs.left > hs.right ? 'Left' : hs.right > hs.left ? 'Right' : 'Even'}<small>{Math.max(hs.left, hs.right)} of {hs.n}</small></div></div>
          </div>}
        </div>
        <div className="group">
          <div className="group-title"><h3>Lesson prep</h3><span className="hint">before you walk in</span></div>
          <div className="row"><div className="grow"><div className="label">Since last lesson</div><div className="sub">{lastLesson ? `${lastLesson.focus} · ${daysSince(lastLesson.date)} days ago` : 'No lesson logged yet'}</div></div></div>
          {lastLesson?.priorities?.length > 0 && <div className="row" style={{ paddingTop: 0 }}><div>{lastLesson.priorities.map((p, i) => <span className="tag" key={i}>{p}</span>)}</div></div>}
          <div className="row"><div className="grow"><div className="label">Latest driver</div><div className="sub num">{dl ? `${fmt(dl.chs, 1)} mph · smash ${fmt(dl.smash, 2)} · path ${dl.path > 0 ? '+' : ''}${fmt(dl.path, 1)}° · face-path ${dl.ftp > 0 ? '+' : ''}${fmt(dl.ftp, 1)}°` : 'No TrackMan session yet'}</div></div></div>
          <div className="row"><div className="grow"><div className="label">Last round</div><div className="sub num">{lr ? `${lr.date} · ${lr.course} · ${lr.score} (${lr.score - lr.par >= 0 ? '+' : ''}${lr.score - lr.par}) · GIR ${lr.gir ?? '—'} · putts ${lr.putts ?? '—'}` : 'No round logged yet'}</div></div></div>
        </div>
      </div>

      <div className="grid grid-tiles" style={{ marginTop: 14 }}>
        <Tile label="Scoring avg · last 5" value={<Count value={s.scoring} dec={1} />} bench={gS ? `Target ${gS.target}` : `Scratch ~${B.score.scratch}`} />
        <Tile label="GIR · last 5" value={<Count value={s.gir} />} unit="%" bench={`D1 ~${B.gir.d1}% · Tour ~${B.gir.tour}%`} />
        <Tile label="Putts / round" value={<Count value={s.putts} dec={1} />} bench={`D1 ~${B.putts.d1} · Tour ~${B.putts.tour}`} />
        <Tile label="Up & down · last 5" value={<Count value={s.upDown} />} unit="%" />
      </div>

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Scoring trend</h3><div className="sub">Score to par per round</div>
          <LineChart points={rounds.map(r => ({ x: shortDate(r.date), y: r.score - r.par }))} target={gS ? gS.target - 72 : null} zero label="Score to par" />
          <div className="legend"><span>Score to par</span>{gS && <span className="t">Target</span>}</div>
        </div>
        <div className="card">
          <h3>Driver club speed</h3><div className="sub">Per TrackMan session</div>
          <LineChart points={drv.map(x => ({ x: shortDate(x.date), y: x.chs }))} target={gC?.target} bench={B.chs.d1} dec={1} label="Driver club speed" />
          <div className="legend"><span>Club speed</span>{gC && <span className="t">Target</span>}<span className="bl">D1 men (approx.)</span></div>
        </div>
        <div className="card">
          <h3>Strokes gained · latest round</h3><div className="sub">{lr ? `${lr.course}, ${lr.date}` : 'No rounds logged'}</div>
          <BarChart items={sg} empty="Log strokes-gained on a round to see this." />
        </div>
        <div className="group">
          <div className="group-title"><h3>Goals</h3><span className="hint">baseline → target</span></div>
          {goals.length ? goals.map(g => (
            <div className="row" key={g.id}>
              <div className="grow">
                <div className="label">{g.metric} {g.source === 'example' && <span className="pill example">example</span>}</div>
                <div className="sub num">{fmt(g.current, g.metric.includes('smash') ? 2 : 1)} → {fmt(g.target, g.metric.includes('smash') ? 2 : 1)} {g.unit}{g.by ? ` · by ${g.by}` : ''}</div>
                <div className="progress" style={{ marginTop: 6 }}><i style={{ width: `${(goalProgress(g) * 100).toFixed(0)}%` }} /></div>
              </div>
            </div>
          )) : <div className="empty">No goals yet — add them under Blueprint.</div>}
        </div>
      </div>
    </div>
  );
}
