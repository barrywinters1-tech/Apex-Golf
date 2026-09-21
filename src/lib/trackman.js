/**
 * TrackMan Range app CSV → per-club session averages.
 *
 * The export has one row per shot plus "Avg" and "Dev" summary rows per club,
 * no date column, and signed values written as "6.2 R" / "3.5 L".
 * Convention here: R / right = positive, L / left = negative.
 */

export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === '\t' || c === ';') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

/** "6.2 R" → 6.2, "3.5 L" → -3.5, "-" → null */
export function signed(v) {
  if (v == null) return null;
  const t = String(v).trim();
  const n = parseFloat(t);
  if (isNaN(n)) return null;
  return /\bL$/i.test(t) ? -Math.abs(n) : n;
}

const COLS = {
  club:   [/^club$/, /^club ?name/, /^club ?type/],
  shot:   [/^shot$/, /^shot ?#/, /^#$/],
  date:   [/^date/, /^session ?date/, /^timestamp$/],
  chs:    [/^club ?\(mph/, /club ?speed/, /club ?spd/],
  bs:     [/^ball ?\(mph/, /ball ?speed/, /ball ?spd/],
  smash:  [/smash/],
  launch: [/launch ?v/, /launch ?ang/, /vert.*launch/],
  spin:   [/^spin ?\(/, /^spin ?rate/, /^spin$/],
  carry:  [/^carry ?\(/, /^carry$/, /carry ?dist/],
  total:  [/^total ?\(/, /^total$/, /total ?dist/],
  side:   [/^lateral/, /carry ?side/, /^side/],
  aoa:    [/^aoa/, /attack ?ang/],
  path:   [/club ?path/],
  ftp:    [/^ftp/, /face ?to ?path/],
  height: [/^height/],
  descent:[/descent/],
  curve:  [/curve/],
};

export function mapColumns(headerRow) {
  const H = headerRow.map(h => h.trim().toLowerCase());
  const out = {};
  for (const [k, pats] of Object.entries(COLS)) {
    out[k] = -1;
    for (const p of pats) { const i = H.findIndex(h => p.test(h)); if (i >= 0) { out[k] = i; break; } }
  }
  return out;
}

const DEC = { smash: 2, spin: 0, carry: 0, total: 0, side: 0, height: 0 };
const ABS = new Set(['side']);
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };

/**
 * @param {string} text  raw CSV
 * @param {{date:string, notes?:string, source?:string}} meta
 * @returns {Array<Session>} one per club
 */
export function aggregateTrackman(text, meta) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('Need a header row and at least one shot row');
  let h = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) if (rows[i].some(x => /club/i.test(x))) { h = i; break; }
  const c = mapColumns(rows[h]);
  if (c.club < 0) throw new Error('No "club" column found');
  const g = (r, i) => (i >= 0 ? r[i] : '');
  const isShot = r => c.shot < 0 || /^\d+$/.test((g(r, c.shot) || '').trim());

  const groups = new Map();
  for (const r of rows.slice(h + 1)) {
    if (!isShot(r)) continue;
    const club = (g(r, c.club) || '').trim();
    if (!club) continue;
    const date = normDate(g(r, c.date)) || meta.date;
    const key = `${date}|${club}`;
    if (!groups.has(key)) groups.set(key, { date, club, rows: [] });
    groups.get(key).rows.push(r);
  }

  const sessions = [];
  for (const gr of groups.values()) {
    const m = k => {
      if (c[k] < 0) return null;
      let vals = gr.rows.map(r => signed(g(r, c[k]))).filter(v => v != null);
      if (ABS.has(k)) vals = vals.map(Math.abs);
      return vals.length ? +mean(vals).toFixed(DEC[k] ?? 1) : null;
    };
    const carries = gr.rows.map(r => signed(g(r, c.carry))).filter(v => v != null);
    const laterals = gr.rows.map(r => signed(g(r, c.side))).filter(v => v != null);
    sessions.push({
      date: gr.date, club: gr.club, shots: gr.rows.length,
      chs: m('chs'), bs: m('bs'), smash: m('smash'), launch: m('launch'), spin: m('spin'),
      carry: m('carry'), total: m('total'), side: m('side'),
      aoa: m('aoa'), path: m('path'), ftp: m('ftp'), height: m('height'), descent: m('descent'),
      shotList: gr.rows.map(r => ({ carry: signed(g(r, c.carry)), total: signed(g(r, c.total)), lat: signed(g(r, c.side)), bs: signed(g(r, c.bs)), chs: signed(g(r, c.chs)), height: signed(g(r, c.height)), launch: signed(g(r, c.launch)), spin: signed(g(r, c.spin)), descent: c.descent >= 0 ? signed(g(r, c.descent)) : null, curve: c.curve >= 0 ? signed(g(r, c.curve)) : null })).filter(x => x.carry != null),
      carrySd: carries.length > 1 ? +sd(carries).toFixed(1) : null,
      lateralSd: laterals.length > 1 ? +sd(laterals).toFixed(1) : null,
      carryMax: carries.length ? Math.max(...carries) : null,
      source: meta.source || 'trackman', notes: meta.notes || '',
    });
  }
  return sessions;
}

export function normDate(v) {
  if (!v) return null;
  const t = String(v).trim(); let m;
  if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = t.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(t); return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

/** TrackMan file names look like "16-jul-2026_07_58_pm.csv" */
export function dateFromFilename(name) {
  const m = name.match(/(\d{2})-([a-z]{3})-(\d{4})/i);
  if (!m) return null;
  const mon = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase()) + 1;
  return mon ? `${m[3]}-${String(mon).padStart(2, '0')}-${m[1]}` : null;
}
