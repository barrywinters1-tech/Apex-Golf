/** Data access. Everything the UI needs goes through here so the backend can change. */
import { db } from './index.js';

export const PLAYER_ID = 1; // single-player prototype

export const players = {
  get: () => db.players.get(PLAYER_ID),
  update: patch => db.players.update(PLAYER_ID, patch),
};

export const blueprint = {
  get: () => db.blueprint.get(PLAYER_ID),
  update: patch => db.blueprint.put({ ...(patch), playerId: PLAYER_ID }),
};

export const goals = {
  list: () => db.goals.where('playerId').equals(PLAYER_ID).toArray(),
  add: g => db.goals.add({ ...g, playerId: PLAYER_ID }),
  update: (id, patch) => db.goals.update(id, patch),
  remove: id => db.goals.delete(id),
};

export const sessions = {
  list: () => db.sessions.where('playerId').equals(PLAYER_ID).sortBy('date'),
  add: s => db.sessions.add({ ...s, playerId: PLAYER_ID }),
  bulkAdd: arr => db.sessions.bulkAdd(arr.map(s => ({ ...s, playerId: PLAYER_ID }))),
  remove: id => db.sessions.delete(id),
};

export const rounds = {
  list: () => db.rounds.where('playerId').equals(PLAYER_ID).sortBy('date'),
  add: r => db.rounds.add({ ...r, playerId: PLAYER_ID }),
  bulkAdd: arr => db.rounds.bulkAdd(arr.map(r => ({ ...r, playerId: PLAYER_ID }))),
  remove: id => db.rounds.delete(id),
};

export const lessons = {
  list: () => db.lessons.where('playerId').equals(PLAYER_ID).sortBy('date'),
  add: l => db.lessons.add({ ...l, playerId: PLAYER_ID }),
  remove: id => db.lessons.delete(id),
};

export const academy = {
  list: () => db.academy.where('playerId').equals(PLAYER_ID).sortBy('order'),
  add: l => db.academy.add({ ...l, playerId: PLAYER_ID, order: Date.now() }),
  update: (id, patch) => db.academy.update(id, patch),
  remove: id => db.academy.delete(id),
};
export const ratings = {
  list: () => db.ratings.where('playerId').equals(PLAYER_ID).toArray(),
  set: (node, value) => db.ratings.put({ playerId: PLAYER_ID, node, value, at: new Date().toISOString() }),
};
export const watched = {
  list: () => db.watched.where('playerId').equals(PLAYER_ID).toArray(),
  toggle: async lessonId => { const k = [PLAYER_ID, lessonId]; const cur = await db.watched.get(k); return cur ? db.watched.delete(k) : db.watched.put({ playerId: PLAYER_ID, lessonId, at: new Date().toISOString() }); },
};

/** Full export / import for backup and for moving between machines. */
export async function exportAll() {
  const [p, b, g, s, r, l, a, ra, w] = await Promise.all([players.get(), blueprint.get(), goals.list(), sessions.list(), rounds.list(), lessons.list(), academy.list(), ratings.list(), watched.list()]);
  return { version: 2, exportedAt: new Date().toISOString(), player: p, blueprint: b, goals: g, sessions: s, rounds: r, lessons: l, academy: a, ratings: ra, watched: w };
}

export async function importAll(data) {
  if (!data || !Array.isArray(data.sessions)) throw new Error('Not an Apex Golf export');
  await db.transaction('rw', db.players, db.blueprint, db.goals, db.sessions, db.rounds, db.lessons, db.academy, db.ratings, db.watched, async () => {
    await Promise.all([db.players.clear(), db.blueprint.clear(), db.goals.clear(), db.sessions.clear(), db.rounds.clear(), db.lessons.clear(), db.academy.clear(), db.ratings.clear(), db.watched.clear()]);
    if (data.player) await db.players.put({ ...data.player, id: PLAYER_ID });
    if (data.blueprint) await db.blueprint.put({ ...data.blueprint, playerId: PLAYER_ID });
    const strip = arr => (arr || []).map(({ id, ...rest }) => ({ ...rest, playerId: PLAYER_ID }));
    await db.goals.bulkAdd(strip(data.goals));
    await db.sessions.bulkAdd(strip(data.sessions));
    await db.rounds.bulkAdd(strip(data.rounds));
    await db.lessons.bulkAdd(strip(data.lessons));
    await db.academy.bulkAdd(strip(data.academy));
    await db.ratings.bulkPut((data.ratings || []).map(r => ({ ...r, playerId: PLAYER_ID })));
    await db.watched.bulkPut((data.watched || []).map(w => ({ ...w, playerId: PLAYER_ID })));
  });
}

export async function clearExamples() {
  await db.rounds.where('source').equals('example').delete().catch(() => {});
  const r = await rounds.list(); await db.rounds.bulkDelete(r.filter(x => x.source === 'example').map(x => x.id));
  const l = await lessons.list(); await db.lessons.bulkDelete(l.filter(x => x.source === 'example').map(x => x.id));
  const g = await goals.list(); await db.goals.bulkDelete(g.filter(x => x.source === 'example').map(x => x.id));
  await db.meta.put({ key: 'examples', value: false });
}
