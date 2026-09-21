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
Pushing to `main` builds, tests and publishes to GitHub Pages (`.github/workflows/deploy.yml`). Enable Pages → Source: GitHub Actions once in the repo settings. The app is installable to an iPhone home screen (manifest included).

## Layout
- `src/db/` schema, repo, seed · `src/lib/` TrackMan parser, stats, AI client · `src/components/` views + Sheet/Nav · `src/charts/` SVG charts · `server/` summariser · `scripts/` CLI import · `tests/`
