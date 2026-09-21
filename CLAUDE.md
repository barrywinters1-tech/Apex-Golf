# Apex Golf — working notes for Claude Code

Player-development platform prototype: coach blueprint + goals, TrackMan sessions, on-course stats, lesson log. Single player (Barry) for now; coach (Jack) is the second user. Recruiter/scout side is deferred.

## Stack
- Vite + React 19, plain CSS (`src/styles.css` holds all tokens; light + dark).
- Dexie (IndexedDB) for local data — `src/db/index.js` schema, `src/db/repo.js` is the only data-access layer. Swap repo.js for Supabase later; keep signatures.
- `motion` for springs (sheet, segmented control). Follow Apple fluid-interface rules: interruptible, velocity handoff, no CSS transitions on gesture-driven things.
- `src/lib/trackman.js` is shared by the browser importer and `scripts/import-trackman.mjs`. It is the one place TrackMan CSV semantics live; tests in `tests/`.

## Conventions
- Signed launch-monitor values: right / open = positive, left / closed = negative. TrackMan writes "6.2 R" / "3.5 L".
- Every record carries `playerId`. Example placeholder rows carry `source: 'example'`.
- UK English in UI copy. Units: mph, yds, rpm, degrees.
- Benchmarks in `src/db/index.js` are approximate reference points, not sourced facts.

## Commands
- `npm run dev` — app on :5173. `npm run build`, `npm test`.
- `npm run import -- --notes "..."` — regenerate `data/seed/sessions.json` from `data/trackman/*.csv` (file name gives the date).
- `npm run ai` — local summariser on :8787 (needs `ANTHROPIC_API_KEY`); set `VITE_AI_ENDPOINT=/api/summarise` in `.env.local`.

## Sharing model (current)
No backend. `src/lib/share.js` encodes `exportAll()` into a `#share=` URL; `App.jsx` offers to import it on load. Replace with Supabase sync when multi-user is needed; keep the share link as an offline fallback.

## Known gaps / next
- Real rounds data (UpGame/Arccos export) — rounds importer is header-matched, untested on a real file.
- Multi-player + auth (Supabase). Coach roster view.
- CoachNow has no public API: lessons link to CoachNow posts by URL only.
