/**
 * Cloud mirror. Local Dexie stays the source the UI reads; every write made
 * through repo.js is queued in `outbox` and flushed to Supabase. A player's
 * rows are pulled (replacing local rows for that player) on sign-in and on
 * roster switch. No realtime — coach and player rarely edit at the same time.
 *
 * Remote shape (see supabase/schema.sql):
 *   rows(player_id, tbl, id, data)   per-player data, one row per local record
 *   library(coach_id, id, data)      academy lessons, shared by a coach's players
 */
import { db } from './index.js';
import { supabase } from '../lib/supabase.js';

const TABLES = ['goals', 'sessions', 'rounds', 'lessons'];
const remoteId = (tbl, row) => tbl === 'blueprint' ? 'blueprint' : tbl === 'player' ? 'player' : tbl === 'ratings' ? row.node : tbl === 'watched' ? row.lessonId : row.id;

let flushing = null;
export async function flush() {
  if (!supabase || flushing) return flushing;
  flushing = (async () => {
    try { for (let pass = 0; pass < 20; pass++) {
      const items = await db.outbox.orderBy('at').toArray();
      if (!items.length) return;
      for (const it of items) {
        let err;
        if (it.scope === 'library') {
          if (it.op === 'put') ({ error: err } = await supabase.from('library').upsert({ coach_id: it.owner, id: it.id, data: it.data, updated_at: new Date().toISOString() }));
          else ({ error: err } = await supabase.from('library').delete().match({ coach_id: it.owner, id: it.id }));
        } else {
          if (it.op === 'put') ({ error: err } = await supabase.from('rows').upsert({ player_id: it.owner, tbl: it.tbl, id: it.id, data: it.data, updated_at: new Date().toISOString() }));
          else ({ error: err } = await supabase.from('rows').delete().match({ player_id: it.owner, tbl: it.tbl, id: it.id }));
        }
        if (err) {
          // Permission / validation errors will never succeed — drop them. Network errors wait.
          if (/permission|policy|violates|invalid|42501|22P02|23503/i.test(err.message || '') || err.code === '42501') { await db.outbox.delete(it.pk); continue; }
          console.warn('sync: paused on', err.message); return;
        }
        await db.outbox.delete(it.pk);
      }
    } } finally { flushing = null; }
  })();
  return flushing;
}

const enqueue = async item => { if (!supabase) return; await db.outbox.add({ ...item, at: Date.now() }); flush(); };

export const cloudPut = (owner, tbl, row) => enqueue({ scope: 'rows', op: 'put', owner, tbl, id: String(remoteId(tbl, row)), data: strip(row) });
export const cloudDel = (owner, tbl, id) => enqueue({ scope: 'rows', op: 'del', owner, tbl, id: String(id) });
export const libPut = (owner, row) => enqueue({ scope: 'library', op: 'put', owner, id: String(row.id), data: strip(row) });
export const libDel = (owner, id) => enqueue({ scope: 'library', op: 'del', owner, id: String(id) });
const strip = ({ playerId, ...r }) => r;

/** Replace local rows for a player with the cloud copy. */
export async function pullPlayer(playerId, playerMeta = {}) {
  if (!supabase) return;
  await flush();
  const { data, error } = await supabase.from('rows').select('tbl,id,data').eq('player_id', playerId);
  if (error) throw error;
  const by = {}; for (const r of data) (by[r.tbl] = by[r.tbl] || []).push(r);
  await db.transaction('rw', db.players, db.blueprint, db.goals, db.sessions, db.rounds, db.lessons, db.ratings, db.watched, async () => {
    for (const t of [...TABLES, 'ratings', 'watched']) await db[t].where('playerId').equals(playerId).delete();
    await db.blueprint.delete(playerId);
    const p = by.player?.[0]?.data || {};
    await db.players.put({ ...p, ...playerMeta, id: playerId, name: p.name || playerMeta.name || 'Player' });
    if (by.blueprint?.[0]) await db.blueprint.put({ ...by.blueprint[0].data, playerId });
    for (const t of TABLES) if (by[t]) await db[t].bulkPut(by[t].map(r => ({ ...r.data, id: r.id, playerId })));
    if (by.ratings) await db.ratings.bulkPut(by.ratings.map(r => ({ ...r.data, node: r.id, playerId })));
    if (by.watched) await db.watched.bulkPut(by.watched.map(r => ({ ...r.data, lessonId: r.id, playerId })));
  });
}

export async function pullLibrary(libId) {
  if (!supabase) return 0;
  await flush();
  const { data, error } = await supabase.from('library').select('id,data').eq('coach_id', libId);
  if (error) throw error;
  await db.transaction('rw', db.academy, async () => {
    await db.academy.where('playerId').equals(libId).delete();
    await db.academy.bulkPut(data.map(r => ({ ...r.data, id: r.id, playerId: libId })));
  });
  return data.length;
}

if (typeof window !== 'undefined') { window.addEventListener('online', () => flush()); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush(); }); }
