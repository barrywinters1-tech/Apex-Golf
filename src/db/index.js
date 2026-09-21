/**
 * Local database (IndexedDB via Dexie).
 *
 * Schema is deliberately relational so it can move to Postgres/Supabase later:
 * every record carries playerId; the app is single-player today (Barry) but
 * nothing assumes it. Swap this module for a Supabase client and keep the
 * same function signatures in ./repo.js.
 */
import Dexie from 'dexie';

export const db = new Dexie('apex-golf');

db.version(1).stores({
  players:   '++id, name',
  goals:     '++id, playerId, area',
  sessions:  '++id, playerId, date, club, [playerId+club]',   // TrackMan / launch-monitor club averages
  rounds:    '++id, playerId, date',
  lessons:   '++id, playerId, date',
  blueprint: 'playerId',                                      // one doc per player
  meta:      'key',
});

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
