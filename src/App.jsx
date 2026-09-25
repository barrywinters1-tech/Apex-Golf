import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateLegacy } from './db/index.js';
import { getPlayerId, getLibraryId, subscribeScope, importAll, exportAll } from './db/repo.js';
import { seedIfEmpty, upgradeSeed } from './db/seed.js';
import { useSession } from './lib/session.js';
import { cloud } from './lib/supabase.js';
import { Segmented, TabBar } from './components/Nav.jsx';
import Overview from './components/Overview.jsx';
import Blueprint from './components/Blueprint.jsx';
import TrackMan from './components/TrackMan.jsx';
import OnCourse from './components/OnCourse.jsx';
import Lessons from './components/Lessons.jsx';
import Data from './components/Data.jsx';
import Academy from './components/Academy.jsx';
import Login from './components/Login.jsx';
import Roster from './components/Roster.jsx';
import { decodeShare } from './lib/share.js';

const initialTab = () => { try { return localStorage.getItem('apex.tab') || 'overview'; } catch { return 'overview'; } };
const useScope = () => useSyncExternalStore(subscribeScope, () => `${getPlayerId()}|${getLibraryId()}`);

export default function App() {
  const session = useSession();
  const [ready, setReady] = useState(false);
  const [tab, setTabState] = useState(initialTab);
  const [incoming, setIncoming] = useState(null);
  const [roster, setRoster] = useState(false);
  const setTab = t => { setTabState(t); try { localStorage.setItem('apex.tab', t); } catch {} };
  const scope = useScope(); const [pid, lid] = scope.split('|');

  useEffect(() => { migrateLegacy().then(() => (cloud ? null : seedIfEmpty())).then(() => setReady(true)); decodeShare().then(d => d && setIncoming(d)).catch(() => {}); }, []);
  // Local mode: starter lessons + shotList backfill. Cloud mode does this per library in the session.
  useEffect(() => { if (ready && !session.cloud) upgradeSeed(); }, [ready, session.cloud]);

  const player = useLiveQuery(() => db.players.get(pid), [pid], null);
  const bp = useLiveQuery(() => db.blueprint.get(pid), [pid], null);
  const goals = useLiveQuery(() => db.goals.where('playerId').equals(pid).toArray(), [pid], []);
  const sessions = useLiveQuery(() => db.sessions.where('playerId').equals(pid).sortBy('date'), [pid], []);
  const rounds = useLiveQuery(() => db.rounds.where('playerId').equals(pid).sortBy('date'), [pid], []);
  const lessons = useLiveQuery(() => db.lessons.where('playerId').equals(pid).sortBy('date'), [pid], []);
  const academyLessons = useLiveQuery(() => db.academy.where('playerId').equals(lid).sortBy('order'), [lid], []);
  const ratings = useLiveQuery(() => db.ratings.where('playerId').equals(pid).toArray(), [pid], []);
  const watched = useLiveQuery(() => db.watched.where('playerId').equals(pid).toArray(), [pid], []);
  const examples = useLiveQuery(async () => (await db.meta.get('examples'))?.value ?? false, [], false);
  const localSessions = useLiveQuery(() => session.cloud && pid !== 'local' ? db.sessions.where('playerId').equals('local').count() : 0, [pid, session.cloud], 0);
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);

  if (session.cloud && session.status === 'signed-out') return <Login />;
  if (session.cloud && (session.status === 'loading' || !ready)) return <div className="login"><div className="brand">Apex Golf</div></div>;
  if (session.status === 'error') return <div className="login"><div className="login-card"><h1>Couldn't load</h1><p className="sub">{session.error}</p><button className="btn primary block" onClick={() => location.reload()}>Try again</button><button className="btn quiet block" onClick={session.signOut}>Sign out</button></div></div>;

  const isCoach = session.cloud ? session.isCoach : true;
  const initials = (player?.name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const viewingOther = session.cloud && session.isCoach && session.players?.find(p => p.id === pid)?.user_id !== session.user?.id;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="none" stroke="var(--speed)" strokeWidth="3"/><circle cx="14" cy="14" r="7" fill="none" stroke="var(--strike)" strokeWidth="3"/><circle cx="14" cy="14" r="3" fill="var(--accuracy)"/></svg>Apex Golf</div>
          <Segmented tab={tab} onChange={setTab} />
          <div className="spacer" />
          <button className="player-chip tappable" onClick={() => setRoster(true)} aria-label="Players and account"><span className="avatar">{initials}</span><span className="hide-sm">{player?.name}</span>{session.cloud && <span className={`sync-dot ${pending ? 'off' : ''}`} title={pending ? `${pending} changes waiting to sync` : 'Synced'} />}</button>
        </div>
      </header>
      <main className="page">
        {viewingOther && <div className="banner" style={{ background: 'rgba(0,122,255,0.10)' }}><p><b>Coach view</b> · you're looking at {player?.name}'s roadmap. Edits save to their account.</p><button className="btn" onClick={() => setRoster(true)}>Switch player</button></div>}
        {incoming && <div className="banner"><p><b>Shared roadmap for {incoming.player?.name || 'a player'}</b> · {incoming.sessions?.length ?? 0} sessions, {incoming.rounds?.length ?? 0} rounds, {incoming.lessons?.length ?? 0} lessons. Load it here? This replaces {player?.name || 'this player'}'s data.</p><button className="btn primary" onClick={async () => { await importAll(incoming, { library: isCoach }); setIncoming(null); history.replaceState(null, '', location.pathname); setTab('overview'); }}>Load</button><button className="btn" onClick={() => { setIncoming(null); history.replaceState(null, '', location.pathname); }}>Not now</button></div>}
        {!!localSessions && sessions.length === 0 && <div className="banner"><p><b>This device has {localSessions} TrackMan sessions from before you signed in.</b> Copy them, the blueprint and goals into {player?.name}'s account?</p><button className="btn primary" onClick={async () => importAll(await exportAll('local', 'local'), { library: false })}>Copy in</button></div>}
        {tab === 'overview' ? <Overview player={player} sessions={sessions} rounds={rounds} goals={goals} lessons={lessons} /> :
          tab === 'blueprint' ? <Blueprint player={player} bp={bp} goals={goals} sessions={sessions} rounds={rounds} /> :
          tab === 'trackman' ? <TrackMan sessions={sessions} goals={goals} /> :
          tab === 'course' ? <OnCourse rounds={rounds} goals={goals} /> :
          tab === 'lessons' ? <Lessons lessons={lessons} bp={bp} goals={goals} /> :
          tab === 'academy' ? <Academy lessons={academyLessons} ratings={ratings} watched={watched} isCoach={isCoach} isPro={isCoach || !!player?.pro} libraryId={lid} userId={session.user?.id} /> :
          <Data examples={examples} counts={{ sessions: sessions.length, rounds: rounds.length, lessons: lessons.length }} cloud={session.cloud} isCoach={isCoach} />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
      <Roster open={roster} onClose={() => setRoster(false)} session={session} />
    </div>
  );
}
