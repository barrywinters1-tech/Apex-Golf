import { useMemo, useState } from 'react';
import { TREE, RATING, nodeId, embedUrl, videoThumb } from '../lib/academy.js';
import { academy as repo, ratings as ratingRepo, watched as watchedRepo } from '../db/repo.js';
import { Field, lines, formData } from './ui.jsx';
import Sheet from './Sheet.jsx';

export default function Academy({ lessons = [], ratings = [], watched = [], isCoach = true, isPro = false }) {
  const [branchKey, setBranchKey] = useState(TREE[0].key);
  const [node, setNode] = useState(null);           // selected node id
  const [sheet, setSheet] = useState(false);
  const [play, setPlay] = useState(null);           // lesson being played
  const branch = TREE.find(b => b.key === branchKey);
  const rating = useMemo(() => Object.fromEntries(ratings.map(r => [r.node, r.value])), [ratings]);
  const done = useMemo(() => new Set(watched.map(w => w.lessonId)), [watched]);
  const byNode = useMemo(() => { const m = {}; for (const l of lessons) (m[l.node] = m[l.node] || []).push(l); return m; }, [lessons]);

  const branchScore = b => { const ids = b.nodes.map(n => nodeId(b.key, n)); const sum = ids.reduce((a, id) => a + (rating[id] ?? 0), 0); return Math.round((sum / (ids.length * 3)) * 100); };
  const total = lessons.length, seen = lessons.filter(l => done.has(l.id)).length;
  const nodesWithLessons = branch.nodes.map(n => ({ n, id: nodeId(branch.key, n), ls: byNode[nodeId(branch.key, n)] || [] }));
  const active = node ? nodesWithLessons.find(x => x.id === node) : null;

  return (
    <div className="fade-in">
      <div className="page-head">
        <div><div className="date-line">Coach's model · World's Best Approach Player</div><h1>Academy</h1></div>
        {isCoach && <button className="btn primary" onClick={() => setSheet(true)}>Add lesson</button>}
      </div>

      <div className="shelf branch-shelf">
        {TREE.map(b => { const pct = branchScore(b); const n = b.nodes.reduce((a, x) => a + (byNode[nodeId(b.key, x)]?.length || 0), 0); return (
          <button key={b.key} className={`branchcard ${b.colour} ${b.key === branchKey ? 'on' : ''}`} aria-pressed={b.key === branchKey} onClick={() => { setBranchKey(b.key); setNode(null); }}>
            <div className="k">{b.label}</div>
            <div className="v">{pct}<small>%</small></div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <div className="s">{b.nodes.length} skills · {n} lesson{n === 1 ? '' : 's'}</div>
          </button>); })}
      </div>

      <div className="grid grid-hero" style={{ marginTop: 14 }}>
        <div className="group">
          <div className="group-title"><h3>{branch.label}</h3><span className="hint">{isCoach ? 'tap a skill · rate 0–3' : 'tap a skill'}</span></div>
          {nodesWithLessons.map(({ n, id, ls }) => (
            <div className={`row tappable ${node === id ? 'sel' : ''}`} key={id} onClick={() => setNode(id)}>
              <div className="grow"><div className="label">{n}</div><div className="sub">{ls.length ? `${ls.filter(l => done.has(l.id)).length} of ${ls.length} watched` : 'No lessons yet'}</div></div>
              <div className="rate" onClick={e => e.stopPropagation()}>
                {[0, 1, 2, 3].map(v => <button key={v} className={`rate-dot ${(rating[id] ?? 0) >= v && v > 0 ? 'on' : ''}`} aria-label={`${RATING[v]}`} title={RATING[v]} disabled={!isCoach} onClick={() => ratingRepo.set(id, v)}>{v === 0 ? '·' : ''}</button>)}
                <span className="rate-lab">{RATING[rating[id] ?? 0]}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          {play && (
            <div className="card player">
              <div className="video">{embedUrl(play.url) ? <iframe src={embedUrl(play.url)} title={play.title} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <a href={play.url} target="_blank" rel="noreferrer" className="btn">Open video ↗</a>}</div>
              <div className="page-head" style={{ margin: '12px 0 0' }}><div><h3>{play.title}</h3><div className="sub" style={{ margin: 0 }}>{TREE.flatMap(b => b.nodes.map(n => [nodeId(b.key, n), `${b.label} · ${n}`])).find(([id]) => id === play.node)?.[1]}</div></div><button className={`btn ${done.has(play.id) ? '' : 'primary'}`} onClick={() => watchedRepo.toggle(play.id)}>{done.has(play.id) ? 'Watched ✓' : 'Mark watched'}</button></div>
              {play.url && <a className="btn quiet" href={play.url} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: 'inline-block' }}>Open in YouTube ↗</a>}
              {play.notes && <p className="tl-notes" style={{ marginTop: 10 }}>{play.notes}</p>}
              {play.drills?.length > 0 && <div style={{ marginTop: 8 }}><div className="tl-k">Drills</div>{play.drills.map((d, i) => <span className="tag" key={i}>{d}</span>)}</div>}
              {isCoach && <div className="tl-foot"><button className="btn danger" onClick={() => { repo.remove(play.id); setPlay(null); }}>Remove</button></div>}
            </div>
          )}
          <div className="group">
            <div className="group-title"><h3>{active ? active.n : 'Lessons'}</h3><span className="hint">{seen} of {total} watched overall</span></div>
            {(active ? active.ls : nodesWithLessons.flatMap(x => x.ls)).map(l => { const locked = l.pro && !isPro && !isCoach; const th = videoThumb(l.url); return (
              <div className="row tappable" key={l.id} onClick={() => !locked && setPlay(l)}>
                <div className="lthumb" style={th ? { backgroundImage: `url(${th})` } : undefined}>{locked ? '🔒' : done.has(l.id) ? '✓' : '▶'}</div>
                <div className="grow"><div className="label">{l.title} {l.pro && <span className="pill pro">Pro</span>}</div><div className="sub">{l.notes ? l.notes.slice(0, 90) + (l.notes.length > 90 ? '…' : '') : (embedUrl(l.url) ? 'Video' : 'Link')}</div></div>
              </div>); })}
            {!(active ? active.ls : lessons).length && <div className="empty">{isCoach ? 'Add a lesson — a YouTube or Vimeo link, notes and drills.' : 'Nothing here yet.'}</div>}
          </div>
        </div>
      </div>

      <Sheet open={sheet} title="Add lesson" onClose={() => setSheet(false)}>
        <form className="fields" onSubmit={async e => { e.preventDefault(); const d = formData(e.target); await repo.add({ node: d.node, title: d.title.trim(), url: d.url.trim(), notes: d.notes.trim(), drills: lines(d.drills), pro: d.pro === 'on' }); setSheet(false); }}>
          <Field id="a-node" label="Skill" className="wide"><select id="a-node" name="node" defaultValue={node || nodeId(branch.key, branch.nodes[0])}>{TREE.map(b => <optgroup key={b.key} label={b.label}>{b.nodes.map(n => <option key={n} value={nodeId(b.key, n)}>{n}</option>)}</optgroup>)}</select></Field>
          <Field id="a-title" label="Title" className="wide"><input id="a-title" name="title" required placeholder="e.g. Low point control with the towel drill" /></Field>
          <Field id="a-url" label="YouTube or Vimeo link" className="wide"><input id="a-url" name="url" type="url" placeholder="https://youtu.be/…  (unlisted is fine)" /></Field>
          <Field id="a-notes" label="What to look for" className="wide"><textarea id="a-notes" name="notes" /></Field>
          <Field id="a-drills" label="Drills · one per line" className="wide"><textarea id="a-drills" name="drills" /></Field>
          <label className="check wide"><input type="checkbox" name="pro" /> Pro members only</label>
          <button className="btn primary block wide" type="submit">Add lesson</button>
        </form>
      </Sheet>
    </div>
  );
}
