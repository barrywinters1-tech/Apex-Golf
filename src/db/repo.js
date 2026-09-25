/**
 * Data access. Everything the UI needs goes through here so the backend can change.
 * Reads/writes go to Dexie; when Supabase is configured each write is mirrored
 * to the cloud (see ./sync.js). The current player and library ids are module
 * state set by the session (src/lib/session.js) — 'local' when offline-only.
 */
import { db, uuid } from './index.js';
import { cloudPut, cloudDel, libPut, libDel } from './sync.js';

let PLAYER = 'local';   // players.id (uuid) or 'local'
let LIBRARY = 'local';  // coach's user id (academy lessons owner) or 'local'
const listeners = new Set();
export const getPlayerId = () => PLAYER;
export const getLibraryId = () => LIBRARY;
export function setScope({ playerId, libraryId }) { if (playerId) PLAYER = playerId; if (libraryId) LIBRARY = libraryId; listeners.forEach(f => f()); }
export const subscribeScope = f => { listeners.add(f); return () => listeners.delete(f); };

const P = () => PLAYER, L = () => LIBRARY;
const stamp = r => ({ ...r, id: r.id || uuid() });

export const players = {
  get: () => db.players.get(P()),
  update: async patch => { await db.players.update(P(), patch); const row = await db.players.get(P()); if (row) await cloudPut(P(), 'player', { ...row, id: undefined }); },
};

export const blueprint = {
  get: () => db.blueprint.get(P()),
  update: async patch => { const doc = { ...patch, playerId: P() }; await db.blueprint.put(doc); await cloudPut(P(), 'blueprint', doc); },
};

const perPlayer = (tbl, sortKey) => ({
  list: () => sortKey ? db[tbl].where('playerId').equals(P()).sortBy(sortKey) : db[tbl].where('playerId').equals(P()).toArray(),
  add: async r => { const row = stamp({ ...r, playerId: P() }); await db[tbl].add(row); await cloudPut(P(), tbl, row); return row.id; },
  bulkAdd: async arr => { const rows = arr.map(r => stamp({ ...r, playerId: P() })); await db[tbl].bulkAdd(rows); for (const row of rows) await cloudPut(P(), tbl, row); return rows.length; },
  update: async (id, patch) => { await db[tbl].update(id, patch); const row = await db[tbl].get(id); if (row) await cloudPut(row.playerId, tbl, row); },
  remove: async id => { const row = await db[tbl].get(id); await db[tbl].delete(id); if (row) await cloudDel(row.playerId, tbl, id); },
});

export const goals = perPlayer('goals');
export const sessions = perPlayer('sessions', 'date');
export const rounds = perPlayer('rounds', 'date');
export const lessons = perPlayer('lessons', 'date');

/** Academy lessons live in the coach's library, shared by every player they coach. */
export const academy = {
  list: () => db.academy.where('playerId').equals(L()).sortBy('order'),
  add: async l => { const row = stamp({ ...l, playerId: L(), order: l.order ?? Date.now() }); await db.academy.add(row); await libPut(L(), row); return row.id; },
  update: async (id, patch) => { await db.academy.update(id, patch); const row = await db.academy.get(id); if (row) await libPut(row.playerId, row); },
  remove: async id => { const row = await db.academy.get(id); await db.academy.delete(id); if (row) await libDel(row.playerId, id); },
};
export const ratings = {
  list: () => db.ratings.where('playerId').equals(P()).toArray(),
  set: async (node, value) => { const row = { playerId: P(), node, value, at: new Date().toISOString() }; await db.ratings.put(row); await cloudPut(P(), 'ratings', row); },
};
export const watched = {
  list: () => db.watched.where('playerId').equals(P()).toArray(),
  toggle: async lessonId => {
    const k = [P(), lessonId]; const cur = await db.watched.get(k);
    if (cur) { await db.watched.delete(k); await cloudDel(P(), 'watched', lessonId); }
    else { const row = { playerId: P(), lessonId, at: new Date().toISOString() }; await db.watched.put(row); await cloudPut(P(), 'watched', row); }
  },
};

/** Full export / import for backup and for moving between machines. */
export async function exportAll(playerId = P(), libraryId = L()) {
  const q = t => db[t].where('playerId').equals(playerId).toArray();
  const [p, b, g, s, r, l, a, ra, w] = await Promise.all([db.players.get(playerId), db.blueprint.get(playerId), q('goals'), q('sessions'), q('rounds'), q('lessons'), db.academy.where('playerId').equals(libraryId).toArray(), q('ratings'), q('watched')]);
  return { version: 3, exportedAt: new Date().toISOString(), player: p, blueprint: b, goals: g, sessions: s, rounds: r, lessons: l, academy: a, ratings: ra, watched: w };
}

/** Replace the current player's data (and, if allowed, the library) with an export. Mirrors to the cloud. */
export async function importAll(data, { library = true } = {}) {
  if (!data || !Array.isArray(data.sessions)) throw new Error('Not an Apex Golf export');
  const p = P(), lib = L();
  const strip = arr => (arr || []).map(({ id, ...rest }) => stamp({ ...rest, playerId: p }));
  const idMap = new Map();
  const ac = library ? (data.academy || []).map(({ id, ...rest }) => { const n = uuid(); idMap.set(id, n); return { ...rest, id: n, playerId: lib }; }) : [];
  const rows = { goals: strip(data.goals), sessions: strip(data.sessions), rounds: strip(data.rounds), lessons: strip(data.lessons) };
  const ratingsRows = (data.ratings || []).map(r => ({ ...r, playerId: p }));
  const watchedRows = library ? (data.watched || []).filter(w => idMap.has(w.lessonId)).map(w => ({ ...w, lessonId: idMap.get(w.lessonId), playerId: p })) : [];
  const existing = {};
  await db.transaction('rw', db.players, db.blueprint, db.goals, db.sessions, db.rounds, db.lessons, db.academy, db.ratings, db.watched, async () => {
    for (const t of ['goals', 'sessions', 'rounds', 'lessons', 'ratings', 'watched']) { existing[t] = await db[t].where('playerId').equals(p).toArray(); await db[t].where('playerId').equals(p).delete(); }
    if (library) { existing.academy = await db.academy.where('playerId').equals(lib).toArray(); await db.academy.where('playerId').equals(lib).delete(); }
    const cur = await db.players.get(p);
    await db.players.put({ ...(cur || {}), ...(data.player || {}), id: p });
    if (data.blueprint) await db.blueprint.put({ ...data.blueprint, playerId: p });
    for (const t of Object.keys(rows)) await db[t].bulkAdd(rows[t]);
    if (library) await db.academy.bulkAdd(ac);
    await db.ratings.bulkPut(ratingsRows); await db.watched.bulkPut(watchedRows);
  });
  // Mirror: deletes for what was there, puts for what is now.
  for (const t of ['goals', 'sessions', 'rounds', 'lessons']) { for (const r of existing[t]) await cloudDel(p, t, r.id); for (const r of rows[t]) await cloudPut(p, t, r); }
  for (const r of existing.ratings) await cloudDel(p, 'ratings', r.node); for (const r of ratingsRows) await cloudPut(p, 'ratings', r);
  for (const r of existing.watched) await cloudDel(p, 'watched', r.lessonId); for (const r of watchedRows) await cloudPut(p, 'watched', r);
  if (library) { for (const r of existing.academy) await libDel(lib, r.id); for (const r of ac) await libPut(lib, r); }
  const pl = await db.players.get(p); if (pl) await cloudPut(p, 'player', { ...pl, id: undefined });
  if (data.blueprint) await cloudPut(p, 'blueprint', { ...data.blueprint, playerId: p });
}

export async function clearExamples() {
  for (const t of ['rounds', 'lessons', 'goals']) { const rows = await db[t].where('playerId').equals(P()).toArray(); for (const r of rows.filter(x => x.source === 'example')) await perPlayerRemove(t, r.id); }
  await db.meta.put({ key: 'examples', value: false });
}
const perPlayerRemove = (t, id) => ({ rounds, lessons, goals })[t].remove(id);
