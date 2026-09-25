/**
 * Local database (IndexedDB via Dexie).
 *
 * Dexie is the store the UI reads from (live queries). When Supabase is
 * configured (see ../lib/supabase.js) every write made through ./repo.js is
 * mirrored to the cloud via ./sync.js, and a player's rows are pulled into
 * Dexie on sign-in / roster switch. Without Supabase the app is fully local.
 *
 * Every record carries playerId (a Supabase players.id uuid, or 'local').
 * Row ids are client-generated uuids so they are stable across devices.
 */
import Dexie from 'dexie';

export const db = new Dexie('apex-golf-v3');

db.version(1).stores({
  players:   'id, name',                                     // id === playerId
  goals:     'id, playerId, area',
  sessions:  'id, playerId, date, club, [playerId+club]',    // TrackMan / launch-monitor club averages
  rounds:    'id, playerId, date',
  lessons:   'id, playerId, date',
  blueprint: 'playerId',                                     // one doc per player
  academy:   'id, playerId, node, pro',                      // playerId here is the LIBRARY id (coach's) — see repo.getLibraryId
  ratings:   '[playerId+node], playerId',                    // coach rating per node
  watched:   '[playerId+lessonId], playerId',                // player progress
  meta:      'key',
  outbox:    '++pk, at',                                     // pending cloud writes
});

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));

/** One-time copy from the pre-cloud 'apex-golf' database (integer ids, playerId 1). */
export async function migrateLegacy() {
  if (!(await Dexie.exists('apex-golf'))) return false;
  if ((await db.meta.get('migratedLegacy'))?.value) return false;
  const old = new Dexie('apex-golf');
  try {
    await old.open();
    const t = n => (old.tables.find(x => x.name === n) ? old.table(n).toArray() : Promise.resolve([]));
    const [players, goals, sessions, rounds, lessons, blueprint, academy, ratings, watched, meta] = await Promise.all(['players', 'goals', 'sessions', 'rounds', 'lessons', 'blueprint', 'academy', 'ratings', 'watched', 'meta'].map(t));
    if (!players.length) return false;
    const P = 'local';
    const idMap = new Map(); // old academy int id -> uuid (watched refers to it)
    const re = (arr, extra = {}) => arr.map(({ id, ...r }) => ({ ...r, ...extra, id: uuid(), playerId: P }));
    const ac = academy.map(({ id, ...r }) => { const n = uuid(); idMap.set(id, n); return { ...r, id: n, playerId: P }; });
    await db.transaction('rw', db.tables, async () => {
      const p = players[0]; await db.players.put({ ...p, id: P });
      if (blueprint[0]) await db.blueprint.put({ ...blueprint[0], playerId: P });
      await db.goals.bulkPut(re(goals)); await db.sessions.bulkPut(re(sessions)); await db.rounds.bulkPut(re(rounds)); await db.lessons.bulkPut(re(lessons));
      await db.academy.bulkPut(ac);
      await db.ratings.bulkPut(ratings.map(r => ({ ...r, playerId: P })));
      await db.watched.bulkPut(watched.filter(w => idMap.has(w.lessonId)).map(w => ({ ...w, playerId: P, lessonId: idMap.get(w.lessonId) })));
      await db.meta.bulkPut(meta.filter(m => m.key !== 'migratedLegacy'));
      await db.meta.put({ key: 'migratedLegacy', value: true });
    });
    return true;
  } catch { return false; } finally { old.close(); }
}

export const CLUB_ORDER = ['Driver','3 Wood','5 Wood','Hybrid','2 Iron','3 Iron','4 Iron','5 Iron','6 Iron','7 Iron','8 Iron','9 Iron','PW','Gap Wedge','GW','SW','LW'];
export const clubRank = c => { const i = CLUB_ORDER.findIndex(x => x.toLowerCase() === String(c).toLowerCase()); return i < 0 ? 99 : i; };

/** Approximate reference points; edit freely. Sources: public TrackMan / PGA Tour averages, rounded. */
export const BENCHMARKS = {
  chs:   { label: 'Driver club speed (mph)', scratch: 106, d1: 112, tour: 115 },
  bs:    { label: 'Driver ball speed (mph)', scratch: 155, d1: 165, tour: 172 },
  carry: { label: 'Driver carry (yds)',      scratch: 250, d1: 270, tour: 282 },
  iron7: { label: '7-iron carry (yds)',      scratch: 155, d1: 165, tour: 172 },
  gir:   { label: 'Greens in regulation',    scratch: 55,  d1: 60,  tour: 66 },
  putts: { label: 'Putts per round',         scratch: 31,  d1: 29.5, tour: 28.5 },
  score: { label: 'Scoring average',         scratch: 74,  d1: 72,  tour: 70.5 },
};

/** Coach's approach targets (his 'World's Best Approach Player' model). */
export { APPROACH_TARGETS, GIR_TARGETS } from '../lib/academy.js';
