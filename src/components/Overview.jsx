import LineChart from '../charts/LineChart.jsx';
import BarChart from '../charts/BarChart.jsx';
import { BENCHMARKS as B } from '../db/index.js';
import { roundSummary, driverSessions, goalProgress, goalFor, fmt, shortDate } from '../lib/stats.js';
import { Tile } from './ui.jsx';

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

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><h1>{player?.name || 'Player'}</h1><div className="sub">{[player?.handicap && `HCP ${player.handicap}`, player?.coach && `Coach ${player.coach}`, player?.academy].filter(Boolean).join(' · ') || 'Development roadmap'}</div></div>
      </div>

      <div className="grid grid-tiles">
        <Tile label="Scoring avg · last 5" value={fmt(s.scoring, 1)} delta={delta(s.scoring, s.scoringPrev, true)} bench={gS ? `Target ${gS.target}` : `Scratch ~${B.score.scratch}`} />
        <Tile label="Driver club speed" value={fmt(dl?.chs, 1)} unit="mph" delta={delta(dl?.chs, dp?.chs, false)} bench={`D1 ~${B.chs.d1} · Tour ~${B.chs.tour}${gC ? ` · Target ${gC.target}` : ''}`} />
        <Tile label="GIR · last 5" value={fmt(s.gir, 0)} unit="%" bench={`D1 ~${B.gir.d1}% · Tour ~${B.gir.tour}%`} />
        <Tile label="Putts / round · last 5" value={fmt(s.putts, 1)} bench={`D1 ~${B.putts.d1} · Tour ~${B.putts.tour}`} />
      </div>


      <div className="group" style={{ marginTop: 14 }}>
        <div className="group-title"><h3>Lesson prep</h3><span className="hint">what the coach needs before you walk in</span></div>
        <div className="row"><div className="grow"><div className="label">Priorities since last lesson</div><div className="sub">{lastLesson ? `${lastLesson.focus} · ${daysSince(lastLesson.date)} days ago` : 'No lesson logged yet'}</div></div></div>
        {lastLesson?.priorities?.length > 0 && <div className="row" style={{ paddingTop: 0 }}><div>{lastLesson.priorities.map((p, i) => <span className="tag" key={i}>{p}</span>)}</div></div>}
        <div className="row"><div className="grow"><div className="label">Latest driver numbers</div><div className="sub num">{dl ? `${dl.date} · ${fmt(dl.chs, 1)} mph club · ${fmt(dl.bs, 1)} ball · smash ${fmt(dl.smash, 2)} · carry ${fmt(dl.carry)} · path ${dl.path > 0 ? '+' : ''}${fmt(dl.path, 1)}° · face-path ${dl.ftp > 0 ? '+' : ''}${fmt(dl.ftp, 1)}°${dl.notes ? ` · ${dl.notes}` : ''}` : 'No TrackMan session yet'}</div></div></div>
        <div className="row"><div className="grow"><div className="label">Last round</div><div className="sub num">{lr ? `${lr.date} · ${lr.course} · ${lr.score} (${lr.score - lr.par >= 0 ? '+' : ''}${lr.score - lr.par}) · GIR ${lr.gir ?? '—'} · putts ${lr.putts ?? '—'} · FIR ${lr.fir ?? '—'}/${lr.firOf ?? '—'}` : 'No round logged yet'}</div></div></div>
        {lastSession && daysSince(lastSession.date) > 21 && <div className="row"><div className="grow"><div className="label" style={{ color: 'var(--amber)' }}>TrackMan data is {daysSince(lastSession.date)} days old</div><div className="sub">Book a bay session before the next lesson so the numbers are current.</div></div></div>}
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
