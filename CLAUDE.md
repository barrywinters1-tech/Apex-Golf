# Apex Golf — working notes for Claude Code

Player-development platform prototype: coach blueprint + goals, TrackMan sessions, on-course stats, lesson log. Single player (Barry) for now; coach (Jack) is the second user. Recruiter/scout side is deferred.

## Stack
- Vite + React 19, plain CSS (`src/styles.css` holds all tokens; light + dark).
- Dexie (IndexedDB) for local data — `src/db/index.js` schema, `src/db/repo.js` is the only data-access layer. Swap repo.js for Supabase later; keep signatures.
- `motion` for springs (sheet, segmented control). Follow Apple fluid-interface rules: interruptible, velocity handoff, no CSS transitions on gesture-driven things.
- `src/lib/trackman.js` is shared by the browser importer and `scripts/import-trackman.mjs`. It is the one place TrackMan CSV semantics live; tests in `tests/`.

## Blueprint model
The coach's blueprint is his own Excel format: rows (Practice station, Set-up checks, Movement checks, Drills, Miss & why, Added notes) × columns (Backswing/Setup, Downswing/Delivery, Follow-through/Notes), one grid per area (Swing, Short game, Putting), plus a Mental toughness page (Old story / Ideal performance state / Scorecard). `src/lib/blueprint.js` defines it; `parseBlueprintGrid` ingests a grid copied from Excel. Never rename the rows to "nicer" labels without checking with the coach — familiarity beats tidiness.

## Design direction (decided 21 Sep 2026)
Apple Fitness. iOS grouped canvas (#f2f2f7) / true black in dark mode, white 22px-radius cards, system SF fonts (`ui-rounded` for numerals). Three colours do all the work: Speed pink #fa114f, Strike green #30d158, Accuracy cyan #0bd3ff; gold for targets/awards; iOS blue for actions. Hero = three closing rings from real numbers (club speed vs target, smash vs 1.48, fairway-hit % vs 70). Rejected: the "night range" dark telemetry look and the generic clean-cards look — Barry wants first-open wow, not a dashboard.

## Academy (coach's competency model)
`src/lib/academy.js` encodes Jack's "World's Best Approach Player" mind map (data/coach-model-approach-player.jpg) — his branches and wording: Strike, Distance, Direction, Skills, Equipment, Gaining access to acquired skills, Golf IQ, Stats. Each node holds lessons (YouTube/Vimeo link, notes, drills, `pro` flag), a coach rating 0–3 (`ratings` table) and player progress (`watched`). Approach targets from the Stats branch are `APPROACH_TARGETS` / `GIR_TARGETS`. Video uploads and paid Pro membership need the backend step (Supabase storage + Stripe); the schema already carries `pro`.

## Coaching knowledge
`src/lib/knowledge.js` holds principles paraphrased from Dane Cvetkovic's e-books "The Art of Practice" and "My 10 Biggest Golf Hacks" (Barry's copies): Performance Matrix (performance → ball flight → impact laws), four game boxes, Technique/Skill/Performance practice modes, dispersion vs intended target, own-caddie routine. Copyrighted — never paste the books' text into the repo. `impactReport()` turns a TrackMan row into impact-law verdicts; the AI summariser gets `KNOWLEDGE_SUMMARY` as its frame.

## Conventions
- Signed launch-monitor values: right / open = positive, left / closed = negative. TrackMan writes "6.2 R" / "3.5 L".
- Every record carries `playerId`. Example placeholder rows carry `source: 'example'`.
- UK English in UI copy. Units: mph, yds, rpm, degrees.
- Benchmarks in `src/db/index.js` are approximate reference points, not sourced facts.

## Commands
- `npm run dev` — app on :5173. `npm run build`, `npm test`.
- `npm run import -- --notes "..."` — regenerate `data/seed/sessions.json` from `data/trackman/*.csv` (file name gives the date).
- `npm run ai` — local summariser on :8787 (needs `ANTHROPIC_API_KEY`); set `VITE_AI_ENDPOINT=/api/summarise` in `.env.local`.

## Accounts and sync (added 25 Sep 2026)
Supabase, optional. `src/lib/supabase.js` builds a client only when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set; otherwise the app is offline-only with a `'local'` player. Schema in `supabase/schema.sql` (run once in the SQL editor): `profiles` (role player|coach), `players` (coach_id, user_id, email), `rows` (player_id, tbl, id, data jsonb — every per-player record), `library` (coach_id, id, data — academy lessons shared by a coach's players), storage bucket `videos` (public read, coach-only write under `<uid>/`). RLS: a player sees their own rows; a coach sees every player with `coach_id = uid`.
- Dexie stays the UI's store. `repo.js` writes locally then queues an `outbox` item; `sync.js` flushes to Supabase and pulls a player's rows on sign-in / roster switch (`session.js`). No realtime.
- Ids are client uuids (`db/index.js` `uuid()`); DB renamed `apex-golf-v3`, `migrateLegacy()` copies the old integer-id store once.
- Scope is module state in `repo.js` (`getPlayerId()` / `getLibraryId()`, `setScope`); `App.jsx` subscribes so live queries re-run on roster switch.
- Sign-in is passwordless (`signInWithOtp`, link or 6-digit code). Make someone a coach with SQL: `update profiles set role='coach' where email='…'`. A coach adds players by email (`add_player` RPC); when that email signs in it links.
- Share link (`src/lib/share.js`) still works as the no-account fallback; `importAll` re-keys ids under the current player.

## Known gaps / next
- Real rounds data (UpGame/Arccos export) — rounds importer is header-matched, untested on a real file.
- Pro membership (Stripe) — `pro` flag exists on lessons and `player.pro`; no payment yet.
- Video bucket is public-read; switch to signed URLs before any paid content.
- CoachNow has no public API: lessons link to CoachNow posts by URL only.
