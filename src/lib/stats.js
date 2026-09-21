export const avg = a => { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
export const lastN = (arr, n) => arr.slice(-n);
export const fmt = (n, d = 0) => (n == null || isNaN(n)) ? '—' : Number(n).toFixed(d);
export const sgn = (n, d = 1) => (n == null || isNaN(n)) ? '—' : (n > 0 ? '+' : '') + Number(n).toFixed(d);
export const shortDate = d => (d ? d.slice(5).replace('-', '/') : '');

export function roundSummary(rounds, n = 5) {
  const R = lastN(rounds, n), prev = rounds.slice(-2 * n, -n);
  return {
    scoring: avg(R.map(r => r.score)),
    scoringPrev: avg(prev.map(r => r.score)),
    gir: avg(R.map(r => r.gir != null ? r.gir / 18 * 100 : null)),
    fir: avg(R.map(r => r.firOf ? r.fir / r.firOf * 100 : null)),
    putts: avg(R.map(r => r.putts)),
    upDown: avg(R.map(r => r.upDownOf ? r.upDown / r.upDownOf * 100 : null)),
    pen: avg(R.map(r => r.pen)),
    latest: rounds[rounds.length - 1] || null,
  };
}

export function driverSessions(sessions) { return sessions.filter(s => /driver/i.test(s.club)); }

export function latestByClub(sessions) {
  const m = new Map();
  for (const s of sessions) m.set(s.club, s); // sessions arrive sorted by date asc
  return [...m.values()];
}

export function goalProgress(g) {
  const span = g.target - g.baseline;
  if (!span) return 0;
  return Math.max(0, Math.min(1, (g.current - g.baseline) / span));
}

/** Find the goal matching a metric family, by loose name match. */
export function goalFor(goals, key) {
  const pats = { score: /scoring/i, chs: /club ?speed|clubhead/i, gir: /green|gir/i, putts: /putt/i, smash: /smash/i };
  return goals.find(g => pats[key]?.test(g.metric || '')) || null;
}
