import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/index.js';
import { PLAYER_ID } from './db/repo.js';
import { seedIfEmpty } from './db/seed.js';
import { Segmented, TabBar } from './components/Nav.jsx';
import Overview from './components/Overview.jsx';
import Blueprint from './components/Blueprint.jsx';
import TrackMan from './components/TrackMan.jsx';
import OnCourse from './components/OnCourse.jsx';
import Lessons from './components/Lessons.jsx';
import Data from './components/Data.jsx';

const initialTab = () => { try { return localStorage.getItem('apex.tab') || 'overview'; } catch { return 'overview'; } };

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTabState] = useState(initialTab);
  const setTab = t => { setTabState(t); try { localStorage.setItem('apex.tab', t); } catch {} };
  useEffect(() => { seedIfEmpty().then(() => setReady(true)); }, []);

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
          <div className="brand"><span className="brand-mark">A</span>Apex Golf</div>
          <Segmented tab={tab} onChange={setTab} />
          <div className="spacer" />
          <div className="player-chip"><span className="avatar">{initials}</span><span className="hide-sm">{player?.name}</span></div>
        </div>
      </header>
      <main className="page">
        {!ready ? null :
          tab === 'overview' ? <Overview player={player} sessions={sessions} rounds={rounds} goals={goals} /> :
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
