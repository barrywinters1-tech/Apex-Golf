/**
 * The coach's blueprint is a matrix (coach's own format, from his Excel blueprints):
 * rows are what to check, columns are phases of the swing.
 * Stored as blueprint.matrix[row][col] = text.
 */
export const BP_COLS = [
  ['setup', 'Backswing / Setup'],
  ['delivery', 'Downswing / Delivery'],
  ['finish', 'Follow-through / Notes'],
];

export const BP_ROWS = [
  ['station', 'Practice station', 'Sticks, ball position, alignment aids'],
  ['setup', 'Set-up checks', 'Face, body alignment, tilts, pressure, arm hang'],
  ['movement', 'Movement checks', 'What the body and arms do in this phase'],
  ['drills', 'Drills', 'Named drills and what each one fixes'],
  ['miss', 'Miss & why', 'The bad shot in this phase and its cause'],
  ['notes', 'Added notes', 'Shot shaping, trajectory, anything else'],
];

/** Blueprint areas: each is a full matrix. Mental toughness has its own shape (below). */
export const BP_AREAS = [['swing', 'Swing'], ['shortgame', 'Short game'], ['putting', 'Putting']];

export const MENTAL = {
  old: ['Old story', [['bodyLanguage', 'Body language'], ['selfTalk', 'Self talk'], ['tone', 'Tone of voice']]],
  ideal: ['Ideal performance state · the zone · new story', [['bodyLanguage', 'Body language'], ['selfTalk', 'Self talk'], ['tone', 'Tone of voice'], ['process', 'Process cues']]],
  scorecard: ['Mental toughness scorecard', [['state', 'State'], ['info', 'Info'], ['routine', 'Routine'], ['commitment', 'Commitment']]],
};

export const emptyMatrix = () => Object.fromEntries(BP_ROWS.map(([r]) => [r, Object.fromEntries(BP_COLS.map(([c]) => [c, '']))]));
export const emptyMental = () => Object.fromEntries(Object.entries(MENTAL).map(([k, [, fields]]) => [k, Object.fromEntries(fields.map(([f]) => [f, '']))]));
export const emptyBlueprint = () => ({ areas: Object.fromEntries(BP_AREAS.map(([a]) => [a, emptyMatrix()])), mental: emptyMental() });

export const cell = (bp, area, r, c) => bp?.areas?.[area]?.[r]?.[c] ?? '';
export const mcell = (bp, k, f) => bp?.mental?.[k]?.[f] ?? '';

/** Flatten for AI prompts and search. */
export function matrixText(bp) {
  const out = [];
  for (const [a, al] of BP_AREAS) for (const [r, rl] of BP_ROWS) {
    const parts = BP_COLS.map(([c, cl]) => cell(bp, a, r, c) && `[${cl}] ${cell(bp, a, r, c)}`).filter(Boolean);
    if (parts.length) out.push(`${al} · ${rl}: ${parts.join(' | ')}`);
  }
  for (const [k, [kl, fields]] of Object.entries(MENTAL)) {
    const parts = fields.map(([f, fl]) => mcell(bp, k, f) && `${fl}: ${mcell(bp, k, f)}`).filter(Boolean);
    if (parts.length) out.push(`Mental · ${kl}: ${parts.join(' | ')}`);
  }
  return out.join('\n');
}

/**
 * Parse a grid copied from the coach's Excel blueprint (tab-separated; first
 * column is the row label, header row has the phase names). Row/column labels
 * are matched loosely so "Shit Shot & Why" → miss, "Set-up Checks" → setup.
 */
const ROW_PAT = { station: /station|practice/i, setup: /set-?up|setup/i, movement: /movement|motion/i, drills: /drill/i, miss: /shot|miss|why/i, notes: /note/i };
const COL_PAT = { setup: /back|set-?up/i, delivery: /down|deliver/i, finish: /follow|finish|note/i };

export function parseBlueprintGrid(text) {
  const rows = text.split(/\r?\n/).map(l => l.split('\t')).filter(r => r.some(c => c.trim()));
  if (rows.length < 2) throw new Error('Paste at least a header row and one section row');
  const header = rows[0];
  const colOf = i => Object.keys(COL_PAT).find(k => COL_PAT[k].test(header[i] || '')) || Object.keys(COL_PAT)[i - 1];
  const m = emptyMatrix(); let n = 0;
  for (const r of rows.slice(1)) {
    const key = Object.keys(ROW_PAT).find(k => ROW_PAT[k].test(r[0] || ''));
    if (!key) continue;
    for (let i = 1; i < r.length && i <= 3; i++) { const c = colOf(i); if (c && r[i]?.trim()) { m[key][c] = r[i].trim().replace(/;\s*/g, '\n'); n++; } }
  }
  if (!n) throw new Error('No recognisable rows — expected labels like Set-up Checks, Movement Checks, Drills');
  return m;
}
