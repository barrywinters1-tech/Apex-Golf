import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// A tiny in-memory stand-in for the two Supabase tables the app writes to.
const store = { rows: new Map(), library: new Map() };
const key = r => r.player_id ? `${r.player_id}|${r.tbl}|${r.id}` : `${r.coach_id}|${r.id}`;
const table = name => ({
  upsert: async r => { store[name].set(key(r), r); return { error: null }; },
  delete: () => ({ match: async m => { store[name].delete(key(m)); return { error: null }; } }),
  select: () => ({ eq: async (col, v) => ({ data: [...store[name].values()].filter(r => r[col] === v), error: null }) }),
});
vi.mock('../src/lib/supabase.js', () => ({ supabase: { from: table }, cloud: true }));

const { db } = await import('../src/db/index.js');
const repo = await import('../src/db/repo.js');
const sync = await import('../src/db/sync.js');

beforeEach(async () => { store.rows.clear(); store.library.clear(); await Promise.all(db.tables.map(t => t.clear())); });

describe('cloud mirror', () => {
  it('mirrors per-player writes and deletes to rows', async () => {
    repo.setScope({ playerId: 'p1', libraryId: 'c1' });
    const id = await repo.goals.add({ area: 'Driving', metric: 'Club speed', target: 115 });
    await repo.ratings.set('strike:low-point', 2);
    await repo.blueprint.update({ areas: {}, mental: {} });
    await sync.flush();
    expect(store.rows.get(`p1|goals|${id}`).data.metric).toBe('Club speed');
    expect(store.rows.get('p1|ratings|strike:low-point').data.value).toBe(2);
    expect(store.rows.has('p1|blueprint|blueprint')).toBe(true);
    await repo.goals.remove(id); await sync.flush();
    expect(store.rows.has(`p1|goals|${id}`)).toBe(false);
    expect(await db.outbox.count()).toBe(0);
  });

  it('academy lessons go to the coach library, not the player', async () => {
    repo.setScope({ playerId: 'p1', libraryId: 'coach' });
    const id = await repo.academy.add({ node: 'strike:x', title: 'Towel drill', url: '' });
    await sync.flush();
    expect(store.library.get(`coach|${id}`).data.title).toBe('Towel drill');
    expect([...store.rows.keys()].some(k => k.includes('academy'))).toBe(false);
  });

  it('pullPlayer replaces local rows with the cloud copy and keeps other players intact', async () => {
    repo.setScope({ playerId: 'p2', libraryId: 'c' });
    await repo.sessions.add({ date: '2026-01-01', club: 'Driver', carry: 250 }); await sync.flush();
    repo.setScope({ playerId: 'p1', libraryId: 'c' });
    await db.sessions.add({ id: 'stale', playerId: 'p1', date: '2020-01-01', club: '7 Iron' });
    store.rows.set('p1|sessions|s9', { player_id: 'p1', tbl: 'sessions', id: 's9', data: { date: '2026-05-05', club: 'Driver', carry: 260 } });
    store.rows.set('p1|player|player', { player_id: 'p1', tbl: 'player', id: 'player', data: { name: 'Jack Smith' } });
    await sync.pullPlayer('p1', { name: 'Ignored' });
    const s = await repo.sessions.list();
    expect(s.map(x => x.id)).toEqual(['s9']);
    expect((await repo.players.get()).name).toBe('Jack Smith');
    expect(await db.sessions.where('playerId').equals('p2').count()).toBe(1);
  });

  it('importAll re-homes a share-link export under the current player and mirrors it', async () => {
    repo.setScope({ playerId: 'p1', libraryId: 'me' });
    await repo.importAll({ sessions: [{ id: 7, date: '2026-02-02', club: 'Driver' }], goals: [], rounds: [], lessons: [], academy: [{ id: 3, node: 'n', title: 'L' }], watched: [{ lessonId: 3 }], player: { name: 'Barry' } });
    await sync.flush();
    const rows = [...store.rows.values()];
    expect(rows.find(r => r.tbl === 'sessions').data.club).toBe('Driver');
    const lib = [...store.library.values()][0];
    expect(rows.find(r => r.tbl === 'watched').id).toBe(lib.id); // watched follows the re-keyed lesson
  });
});
