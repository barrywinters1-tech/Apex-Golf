import { useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'motion';
import LineChart from '../charts/LineChart.jsx';
import BarChart from '../charts/BarChart.jsx';
import Dispersion, { dispersionStats } from '../charts/Dispersion.jsx';
import Gapping from '../charts/Gapping.jsx';
import { BENCHMARKS as B } from '../db/index.js';
import { roundSummary, driverSessions, goalProgress, goalFor, latestByClub, fmt, shortDate } from '../lib/stats.js';
import { Tile } from './ui.jsx';

/** Counts a number in on mount (respects reduced motion). */
function Count({ value, dec = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el || value == null || isNaN(value)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = Number(value).toFixed(dec); return; }
    const ctrl = animate(0, value, { duration: 0.9, ease: [0.2, 0.7, 0.2, 1], onUpdate: v => { el.textContent = v.toFixed(dec); } });
    return () => ctrl.stop();
  }, [value, dec]);
  return <span ref={ref}>{value == null || isNaN(value) ? '—' : Number(value).toFixed(dec)}</span>;
}

export default function Overview({ player, sessions, rounds, goals, lessons = [] }) {
  const s = roundSummary(rounds);
  const drv = driverSessions(sessions), dl = drv.at(-1), dp = drv.at(-2);
  const gS = goalFor(goals, 'score'), gC = goalFor(goals, 'chs');
  const delta = (a, b, lowerIsBetter, d = 1) => (a != null && b != null) ? { txt: `${a - b >= 0 ? '+' : ''}${(a - b).toFixed(d)} vs previous`, cls: (a - b) === 0 ? '' : ((a - b) * (lowerIsBetter ? -1 : 1) > 0 ? 'up' : 'down') } : null;
  const lr = s.latest;
  const lastLesson = lessons.at(-1);
  const daysSince = d => d ? Math.round((Date.now() - new Date(d)) / 86400000) : null;
  const lastSession = sessions.at(-1);
  const sg = lr && [lr.sgT, lr.sgA, lr.sgG, lr.sgP].some(v => v != null)
    ? [['Off the tee', lr.sgT], ['Approach', lr.sgA], ['Around green', lr.sgG], ['Putting', lr.sgP]].filter(x => x[1] != null).map(([label, v]) => ({ label, v })) : [];

  // hero: driver dispersion, switchable by session
  const drvWithShots = drv.filter(x => x.shotList?.length);
  const [heroIdx, setHeroIdx] = useState(-1);
  const hero = drvWithShots.at(heroIdx) || drvWithShots.at(-1);
  const hs = hero ? dispersionStats(hero.shotList) : null;
  const latest = useMemo(() => latestByClub(sessions), [sessions]);

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><div className="eyebrow">Player roadmap</div><h1>{player?.name || 'Player'}</h1><div className="sub">{[player?.handicap && `HCP ${player.handicap}`, player?.coach && `Coach ${player.coach}`, player?.academy].filter(Boolean).join(' · ') || 'Development roadmap'}</div></div>
      </div>

      <div className="grid grid-hero">
        <div className="hero">
          <div className="hero-head">
            <div className="title"><h3>Driver dispersion</h3>{hero && <span className="muted small">{hero.date} · {hero.shots} shots{hero.notes ? ` · ${hero.notes}` : ''}</span>}</div>
            {drvWithShots.length > 1 && <div className="chips">{drvWithShots.map((x, i) => <button key={x.id ?? i} className="chip" aria-pressed={x === hero} onClick={() => setHeroIdx(i - drvWithShots.length)}>{shortDate(x.date)}</button>)}</div>}
          </div>
          <Dispersion shots={hero?.shotList || []} club="Driver" benchmarks={[{ label: 'D1 carry', v: B.carry.d1 }, { label: 'Tour carry', v: B.carry.tour, cls: 'gold' }]} />
          {hs && <div className="hero-stats">
            <div className="hstat"><div className="k">Avg carry</div><div className="v"><Count value={hs.carry} /><small>yds</small></div></div>
            <div className="hstat"><div className="k">Best</div><div className="v"><Count value={hs.best} /><small>yds</small></div></div>
            <div className="hstat"><div className="k">Carry ±</div><div className="v"><Count value={hs.carrySd} dec={1} /><small>yds</small></div></div>
            <div className="hstat"><div className="k">Side ±</div><div className="v"><Count value={hs.latSd} dec={1} /><small>yds</small></div></div>
            <div className="hstat"><div className="k">Fairway hit</div><div className="v"><Count value={hs.fairwayPct} /><small>%</small></div></div>
            <div className="hstat"><div className="k">Miss bias</div><div className="v txt">{hs.left > hs.right ? 'Left' : hs.right > hs.left ? 'Right' : 'Even'}<small>{Math.max(hs.left, hs.right)} of {hs.n}</small></div></div>
          </div>}
        </div>
        <div className="stack" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <Tile label="Driver club speed" value={<Count value={dl?.chs} dec={1} />} unit="mph" delta={delta(dl?.chs, dp?.chs, false)} bench={`D1 ~${B.chs.d1} · Tour ~${B.chs.tour}${gC ? ` · Target ${gC.target}` : ''}`} />
          <Tile label="Scoring avg · last 5" value={<Count value={s.scoring} dec={1} />} delta={delta(s.scoring, s.scoringPrev, true)} bench={gS ? `Target ${gS.target}` : `Scratch ~${B.score.scratch}`} />
          <div className="card"><h3>Club gapping</h3><div className="sub">Latest carry per club</div><Gapping latest={latest} /></div>
        </div>
      </div>

      <div className="grid grid-tiles" style={{ marginTop: 14 }}>
        <Tile label="GIR · last 5" value={<Count value={s.gir} />} unit="%" bench={`D1 ~${B.gir.d1}% · Tour ~${B.gir.tour}%`} />
        <Tile label="Putts / round · last 5" value={<Count value={s.putts} dec={1} />} bench={`D1 ~${B.putts.d1} · Tour ~${B.putts.tour}`} />
        <Tile label="Fairways · last 5" value={<Count value={s.fir} />} unit="%" />
        <Tile label="Up & down · last 5" value={<Count value={s.upDown} />} unit="%" />
      </div>

      <div className="group" style={{ marginTop: 14 }}>
        <div className="group-title"><h3>Lesson prep</h3><span className="hint">what the coach needs before you walk in</span></div>
        <div className="row"><div className="grow"><div className="label">Priorities since last lesson</div><div className="sub">{lastLesson ? `${lastLesson.focus} · ${daysSince(lastLesson.date)} days ago` : 'No lesson logged yet'}</div></div></div>
        {lastLesson?.priorities?.length > 0 && <div className="row" style={{ paddingTop: 0 }}><div>{lastLesson.priorities.map((p, i) => <span className="tag" key={i}>{p}</span>)}</div></div>}
        <div className="row"><div className="grow"><div className="label">Latest driver numbers</div><div className="sub num">{dl ? `${dl.date} · ${fmt(dl.chs, 1)} mph club · ${fmt(dl.bs, 1)} ball · smash ${fmt(dl.smash, 2)} · carry ${fmt(dl.carry)} · path ${dl.path > 0 ? '+' : ''}${fmt(dl.path, 1)}° · face-path ${dl.ftp > 0 ? '+' : ''}${fmt(dl.ftp, 1)}°${dl.notes ? ` · ${dl.notes}` : ''}` : 'No TrackMan session yet'}</div></div></div>
        <div className="row"><div className="grow"><div className="label">Last round</div><div className="sub num">{lr ? `${lr.date} · ${lr.course} · ${lr.score} (${lr.score - lr.par >= 0 ? '+' : ''}${lr.score - lr.par}) · GIR ${lr.gir ?? '—'} · putts ${lr.putts ?? '—'} · FIR ${lr.fir ?? '—'}/${lr.firOf ?? '—'}` : 'No round logged yet'}</div></div></div>
        {lastSession && daysSince(lastSession.date) > 21 && <div className="row"><div className="grow"><div className="label gold">TrackMan data is {daysSince(lastSession.date)} days old</div><div className="sub">Book a bay session before the next lesson so the numbers are current.</div></div></div>}
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
          <div className="legend"><span>Club speed</span>{gC && <span className="t">Target</span>}<span className="b">D1 men (approx.)</span></div>
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
