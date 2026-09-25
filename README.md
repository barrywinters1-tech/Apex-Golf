# Apex Golf

Player-development prototype: coach blueprint, goals, TrackMan telemetry, on-course stats and a lesson log — one place to see whether a player is actually improving.

```bash
npm install
npm run dev          # http://localhost:5173
npm test
```

Data lives in the browser (IndexedDB). Use **Data → Backup** to move it between devices. First run seeds real TrackMan sessions from `data/seed/sessions.json` plus example rounds/lessons/goals (flagged *example*; clear them from the Data tab).

## Importing TrackMan
Drop TrackMan Range app exports in `data/trackman/` named `YYYY-MM-DD.csv` (or leave TrackMan's `16-jul-2026_….csv` name) and run `npm run import -- --notes "Range, low-compression balls"`. The app's Data tab does the same in the browser.

## AI lesson summaries
```bash
ANTHROPIC_API_KEY=sk-ant-… npm run ai
echo 'VITE_AI_ENDPOINT=/api/summarise' > .env.local
```
The "Generate summary & drills" button appears in the New Lesson sheet.

## Sharing with a coach (no backend)
**Data → Share with your coach** packs everything into one link (gzip, base64 in the URL hash — ~3 KB). Whoever opens it is offered a copy on their device. Re-send after each update. The link is the data: treat it as private.

## Deploy
Vercel, connected to this repo: every push to `main` redeploys (`vercel.json` holds the SPA rewrite). GitHub Pages is unavailable while the repo is private on the free plan. The app is installable to an iPhone home screen (manifest included).

## Accounts (Supabase) — one-time setup
1. Create a free project at supabase.com. In **SQL Editor → New query**, paste `supabase/schema.sql` and run it.
2. **Authentication → Providers → Email**: keep Email on; "Confirm email" can stay on. **Authentication → Email Templates → Magic Link**: make sure the body includes `{{ .Token }}` so the 6-digit code is sent as well as the link (add a line like `Or enter this code: {{ .Token }}`).
3. **Authentication → URL Configuration**: Site URL = your Vercel URL; add it to Redirect URLs too.
4. **Project Settings → API**: copy the Project URL and the `anon` public key. In Vercel → Project → Settings → Environment Variables add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
5. Sign in once with the coach's email, then in the SQL editor run `update public.profiles set role = 'coach' where email = 'coach@example.com';` and sign in again. The coach adds players by email from the player chip (top right); each player signs in with that email and sees only their own roadmap.

Without the two env vars the app runs exactly as before — offline, in this browser only, with the share link for sending data to someone.

## Layout
- `src/db/` schema, repo, seed · `src/lib/` TrackMan parser, stats, AI client · `src/components/` views + Sheet/Nav · `src/charts/` SVG charts · `server/` summariser · `scripts/` CLI import · `tests/`
