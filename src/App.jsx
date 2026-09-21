import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/index.js';
import { PLAYER_ID } from './db/repo.js';
import { seedIfEmpty, upgradeSeed } from './db/seed.js';
import { Segmented, TabBar } from './components/Nav.jsx';
import Overview from './components/Overview.jsx';
import Blueprint from './components/Blueprint.jsx';
import TrackMan from './components/TrackMan.jsx';
import OnCourse from './components/OnCourse.jsx';
import Lessons from './components/Lessons.jsx';
import Data from './components/Data.jsx';
import { decodeShare } from './lib/share.js';
import { importAll } from './db/repo.js';

const initialTab = () => { try { return localStorage.getItem('apex.tab') || 'overview'; } catch { return 'overview'; } };

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTabState] = useState(initialTab);
  const [incoming, setIncoming] = useState(null);
  const setTab = t => { setTabState(t); try { localStorage.setItem('apex.tab', t); } catch {} };
  useEffect(() => { seedIfEmpty().then(upgradeSeed).then(() => setReady(true)); decodeShare().then(d => d && setIncoming(d)).catch(() => {}); }, []);

  const player = useLiveQuery(() => db.players.get(PLAYER_ID), [], null);
  const bp = useLiveQuery(() => db.blueprint.get(PLAYER_ID), [], null);
  const goals = useLiveQuery(() => db.goals.where('playerId').equals(PLAYER_ID).toArray(), [], []);
  const sessions = useLiveQuery(() => db.sessions.where('playerId').equals(PLAYER_ID).sortBy('date'), [], []);
  const rounds = useLiveQuery(() => db.rounds.where('playerId').equals(PLAYER_ID).sortBy('date'), [], []);
  const lessons = useLiveQuery(() => db.lessons.where('playerId').equals(PLAYER_ID).sortBy('date'), [], []);
  const examples = useLiveQuery(async () => (await db.meta.get('examples'))?.value ?? false, [], false);

  const initials = (player?.name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="12" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M5 18c3-1 5-5 8-8s5-4 8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="6" cy="18" r="2" fill="currentColor"/></svg>Apex Golf</div>
          <Segmented tab={tab} onChange={setTab} />
          <div className="spacer" />
          <div className="player-chip"><span className="avatar">{initials}</span><span className="hide-sm">{player?.name}</span></div>
        </div>
      </header>
      <main className="page">
        {incoming && <div className="banner"><p><b>Shared roadmap for {incoming.player?.name || 'a player'}</b> · {incoming.sessions?.length ?? 0} sessions, {incoming.rounds?.length ?? 0} rounds, {incoming.lessons?.length ?? 0} lessons. Load it here? This replaces the data on this device.</p><button className="btn primary" onClick={async () => { await importAll(incoming); setIncoming(null); history.replaceState(null, '', location.pathname); setTab('overview'); }}>Load</button><button className="btn" onClick={() => { setIncoming(null); history.replaceState(null, '', location.pathname); }}>Not now</button></div>}
        {!ready ? null :
          tab === 'overview' ? <Overview player={player} sessions={sessions} rounds={rounds} goals={goals} lessons={lessons} /> :
          tab === 'blueprint' ? <Blueprint player={player} bp={bp} goals={goals} /> :
          tab === 'trackman' ? <TrackMan sessions={sessions} goals={goals} /> :
          tab === 'course' ? <OnCourse rounds={rounds} goals={goals} /> :
          tab === 'lessons' ? <Lessons lessons={lessons} bp={bp} goals={goals} /> :
          <Data examples={examples} />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
