#!/usr/bin/env node
/**
 * Aggregate every TrackMan CSV in data/trackman/ into data/seed/sessions.json.
 * Date comes from the file name (YYYY-MM-DD.csv, or TrackMan's 16-jul-2026_….csv).
 *
 *   node scripts/import-trackman.mjs [--notes "Range, low-compression balls"]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { aggregateTrackman, dateFromFilename, normDate } from '../src/lib/trackman.js';

const args = process.argv.slice(2);
const notes = args.includes('--notes') ? args[args.indexOf('--notes') + 1] : '';
const dir = 'data/trackman';
const out = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.csv')).sort()) {
  const date = normDate(f.slice(0, 10)) || dateFromFilename(f);
  if (!date) { console.error(`skip ${f}: no date in file name`); continue; }
  const s = aggregateTrackman(readFileSync(join(dir, f), 'utf8'), { date, notes, source: 'trackman' });
  s.forEach(x => { x.file = f; });
  out.push(...s);
  console.log(`${f}: ${s.map(x => `${x.club} ×${x.shots}`).join(', ')}`);
}
mkdirSync('data/seed', { recursive: true });
writeFileSync('data/seed/sessions.json', JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} sessions → data/seed/sessions.json`);
