/**
 * Practice engine: turns rounds, TrackMan shots and the coach's ratings into
 * "what to work on", a weekly plan, and scored tests.
 *
 * Ideas borrowed and re-cut for a coach-owned model:
 * - Priority = how much it costs you × room to improve × trend (Clippd's "What To Work On"
 *   idea), but "room" is the COACH's 0–3 rating on his own Academy nodes, not a vendor scale.
 * - Weekly minutes split across the top areas (Break X), with the Technique / Skill /
 *   Performance mix set by how well the coach rates the area (knowledge.js practice modes).
 * - Dispersion game plan (DECADE / Shot Scope MyStrategy) from real TrackMan shots.
 * - Scored approach test (TrackMan Combine style) against the coach's own proximity targets.
 * All formulas here are ours and deliberately simple; none are the vendors' published maths.
 */
import { TREE, nodeId, APPROACH_TARGETS } from './academy.js';
import { clubRank } from '../db/index.js';

const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const sd = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), i = (s.length - 1) / 2; return (s[Math.floor(i)] + s[Math.ceil(i)]) / 2; };
const quantile = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * q, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round5 = v => Math.round(v / 5) * 5;

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf). */
export function phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/* ---------------------------------------------------------------- priorities */

/** Skill areas, how each is measured, and where it lives in the coach's world. */
export const AREAS = [
  { key: 'tee', label: 'Off the tee', sg: 'sgT', stat: r => (r.firOf ? (r.fir / r.firOf) * 100 : null), target: 70, better: 'up', unit: '% fairways', branches: ['direction', 'distance'], bp: 'swing' },
  { key: 'approach', label: 'Approach', sg: 'sgA', stat: r => (r.gir != null ? (r.gir / 18) * 100 : null), target: 60, better: 'up', unit: '% greens', branches: ['strike', 'skills', 'iq'], bp: 'swing' },
  { key: 'short', label: 'Around the green', sg: 'sgG', stat: r => (r.upDownOf ? (r.upDown / r.upDownOf) * 100 : null), target: 60, better: 'up', unit: '% up & down', branches: [], bp: 'shortgame' },
  { key: 'putting', label: 'Putting', sg: 'sgP', stat: r => r.putts, target: 31, better: 'down', unit: 'putts', branches: [], bp: 'putting' },
  { key: 'mental', label: 'Commitment', sg: null, stat: r => r.mm, target: 0, better: 'down', unit: 'mental mistakes', branches: ['access'], bp: null },
];

/** Coach ratings for an area's Academy branches: { avg 0–3 | null, weakest nodes }. */
export function areaRatings(area, ratings = []) {
  const byNode = new Map(ratings.map(r => [r.node, r.value]));
  const nodes = TREE.filter(b => area.branches.includes(b.key)).flatMap(b => b.nodes.map(n => ({ id: nodeId(b.key, n), label: n, branch: b.label, value: byNode.get(nodeId(b.key, n)) ?? null })));
  const rated = nodes.filter(n => n.value != null).map(n => n.value);
  const weakest = [...nodes].sort((a, b) => (a.value ?? -1) - (b.value ?? -1)).slice(0, 3);
  return { avg: rated.length ? mean(rated) : null, rated: rated.length, total: nodes.length, weakest };
}

/**
 * Rank areas. Need is strokes lost (when rounds carry strokes gained) or the
 * shortfall to target; room comes from the coach's rating; trend compares the
 * last three rounds with the three before.
 * @returns [{ key, label, score, need, basis, loss, value, room, trend, rating, why }]
 */
export function priorities({ rounds = [], ratings = [], n = 5 } = {}) {
  const R = rounds.slice(-n);
  const out = [];
  for (const a of AREAS) {
    const sgVals = a.sg ? R.map(r => r[a.sg]).filter(v => v != null) : [];
    const statVals = R.map(a.stat).filter(v => v != null && !isNaN(v));
    let basis = null, loss = null, gap = null, value = null;
    if (sgVals.length) { basis = 'sg'; value = mean(sgVals); loss = Math.max(0, -value); }
    else if (statVals.length) {
      basis = 'gap'; value = mean(statVals);
      gap = a.better === 'up' ? Math.max(0, (a.target - value) / a.target) : a.target === 0 ? Math.min(1, value / 3) : Math.max(0, (value - a.target) / a.target);
    }
    if (!basis) continue;
    const series = rounds.map(r => (basis === 'sg' ? r[a.sg] : a.stat(r))).filter(v => v != null && !isNaN(v));
    const last = mean(series.slice(-3)), prev = series.length >= 6 ? mean(series.slice(-6, -3)) : null;
    const higherIsBetter = basis === 'sg' || a.better === 'up';
    let trend = 'flat';
    if (prev != null && Math.abs(last - prev) > Math.abs(prev) * 0.03 + 0.05) trend = (last > prev) === higherIsBetter ? 'improving' : 'worsening';
    const rt = areaRatings(a, ratings);
    const room = rt.avg == null ? 0.6 : 1 - rt.avg / 3;
    out.push({ key: a.key, label: a.label, area: a, basis, loss, gap, value, trend, room, rating: rt });
  }
  // Put SG losses and target gaps on one 0–1 need scale.
  const maxLoss = Math.max(0.5, ...out.filter(o => o.basis === 'sg').map(o => o.loss));
  for (const o of out) {
    o.need = o.basis === 'sg' ? o.loss / maxLoss : clamp(o.gap * 2.5, 0, 1);
    const tf = o.trend === 'worsening' ? 1.2 : o.trend === 'improving' ? 0.85 : 1;
    o.score = +(o.need * (0.5 + o.room) * tf).toFixed(3);
    const parts = [];
    if (o.basis === 'sg') parts.push(o.loss > 0 ? `Losing ${o.loss.toFixed(1)} shots a round` : `Gaining ${o.value.toFixed(1)} shots a round`);
    else parts.push(`${o.value.toFixed(o.area.unit === 'putts' ? 1 : 0)} ${o.area.unit} vs ${o.area.target} target`);
    if (o.rating.avg != null) parts.push(`coach rates it ${o.rating.avg.toFixed(1)}/3`);
    else if (o.area.branches.length) parts.push('not rated by coach yet');
    if (o.trend !== 'flat') parts.push(o.trend);
    o.why = parts.join(' · ');
  }
  return out.sort((a, b) => b.score - a.score);
}

/* ---------------------------------------------------------------- weekly plan */

/** Technique / Skill / Performance split by the coach's rating of the area. */
export function modeMix(avgRating) {
  if (avgRating == null) return { technique: 0.3, skill: 0.4, performance: 0.3 };
  if (avgRating < 1.5) return { technique: 0.5, skill: 0.3, performance: 0.2 };
  if (avgRating < 2.5) return { technique: 0.25, skill: 0.45, performance: 0.3 };
  return { technique: 0.1, skill: 0.3, performance: 0.6 };
}

const IDEAS = {
  tee: { technique: 'Blueprint swing drill into a net, no target', skill: 'Hit draws and fades on purpose; check path and face-to-path each ball', performance: 'Fairway test: 14 drives into a 30-yd corridor, count hits' },
  approach: { technique: 'Blueprint swing drill, slow reps, strike tape on the face', skill: 'Three trajectories with one club; call the launch before each ball', performance: 'Approach test (9 balls at 130 / 160 / 185)' },
  short: { technique: 'Low-point drill: towel behind the ball', skill: 'One club, three landing spots, same roll-out', performance: '9-ball up-and-down test from mixed lies' },
  putting: { technique: 'Start-line gate at 6 ft', skill: 'Pace ladder 20 / 30 / 40 ft, stop inside a club length past', performance: 'Round-the-clock 3 ft and 6 ft; score makes' },
  mental: { technique: 'Rehearse the pre-shot routine with no ball', skill: 'Every range ball: pick target, one focus, commit, score the commitment', performance: 'Play 9 holes scoring only committed shots' },
};

/**
 * Split `minutes` across the top three priorities. Blocks carry a mode, minutes
 * and a suggestion (coach's own drill for the area first, else a generic one).
 */
export function weeklyPlan(prios, { minutes = 240, bp = null, top = 3 } = {}) {
  const pick = prios.filter(p => p.score > 0).slice(0, top);
  if (!pick.length) return [];
  const total = pick.reduce((s, p) => s + Math.max(p.score, 0.15), 0);
  const blocks = [];
  for (const p of pick) {
    const share = round5((minutes * Math.max(p.score, 0.15)) / total);
    const mix = modeMix(p.rating.avg);
    const drills = p.area.bp ? coachDrills(bp, p.area.bp) : [];
    for (const [mode, f] of Object.entries(mix)) {
      const m = round5(share * f);
      if (m < 5) continue;
      const idea = mode === 'technique' && drills.length ? drills[0] : IDEAS[p.key][mode];
      blocks.push({ area: p.key, label: p.label, mode, minutes: m, idea, coach: mode === 'technique' && drills.length > 0 });
    }
  }
  return blocks;
}

/** Drills the coach wrote in the blueprint's Drills row for an area, one per line. */
export function coachDrills(bp, area) {
  const row = bp?.areas?.[area]?.drills || {};
  return Object.values(row).flatMap(t => String(t || '').split('\n')).map(s => s.trim()).filter(Boolean);
}

/** Minutes logged this ISO week per area / mode, from practice rows. */
export function weekLogged(practice = [], today = new Date()) {
  const d = new Date(today); d.setHours(12, 0, 0, 0); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
  const start = d.toISOString().slice(0, 10);
  const rows = practice.filter(p => p.kind !== 'test' && p.date >= start);
  const by = {};
  for (const r of rows) { const k = `${r.area}|${r.mode}`; by[k] = (by[k] || 0) + (r.minutes || 0); }
  return { start, total: rows.reduce((s, r) => s + (r.minutes || 0), 0), by };
}

/* ---------------------------------------------------------------- dispersion */

const shotsOf = s => (s?.shotList || []).filter(x => x.carry != null);

/** Latest session per club that has shot-level data, sorted by club order. */
export function latestShotSessions(sessions = []) {
  const m = new Map();
  for (const s of sessions) if (shotsOf(s).length >= 3) m.set(s.club, s);
  return [...m.values()].sort((a, b) => clubRank(a.club) - clubRank(b.club));
}

/**
 * Yardage book: carry go-to number (median) and the p10–p90 window, per club,
 * from the latest session with shots. Mishits under 75% of the median are dropped.
 */
export function yardageBook(sessions = []) {
  return latestShotSessions(sessions).map(s => {
    const all = shotsOf(s).map(x => x.carry), med0 = median(all);
    const c = all.filter(v => v >= med0 * 0.75);
    const lat = shotsOf(s).filter(x => x.carry >= med0 * 0.75).map(x => x.lat ?? 0);
    return { club: s.club, date: s.date, n: c.length, dropped: all.length - c.length, carry: median(c), lo: quantile(c, 0.1), hi: quantile(c, 0.9), bias: mean(lat), latSd: sd(lat), notes: s.notes || '' };
  });
}

/**
 * Game plan for one club from its pattern: where to aim to centre it, how wide it is,
 * and the share that finishes inside a corridor of `width` yards.
 */
export function gamePlan(entry, { width = 30 } = {}) {
  if (!entry || entry.latSd == null) return null;
  const { bias, latSd } = entry, half = width / 2;
  const inPlay = phi((half - bias) / latSd) - phi((-half - bias) / latSd);
  const aimAtCentre = phi(half / latSd) - phi(-half / latSd);
  return {
    aim: -bias,                 // + = aim right of target, − = aim left
    width95: 4 * latSd,         // ±2σ
    inPlay: inPlay * 100,       // aiming at the target
    inPlayAimed: aimAtCentre * 100, // after the aim adjustment
    hazardGap: 2 * latSd,       // keep the centre this far from a one-sided hazard for ~97.5% safe
  };
}

/* ---------------------------------------------------------------- approach readiness */

/**
 * How close this club's pattern finishes to its own centre, in feet — the best case
 * if aim and number were perfect (flat range, no wind). Compared with the coach's
 * proximity target for the band its carry falls in.
 */
export function approachReadiness(sessions = []) {
  return latestShotSessions(sessions).filter(s => !/driver|wood/i.test(s.club)).map(s => {
    const shots = shotsOf(s), med0 = median(shots.map(x => x.carry));
    const core = shots.filter(x => x.carry >= med0 * 0.75);
    const c = mean(core.map(x => x.carry)), l = mean(core.map(x => x.lat ?? 0));
    const prox = core.map(x => Math.hypot(x.carry - c, (x.lat ?? 0) - l) * 3);
    const band = APPROACH_TARGETS.find(t => c >= t.min && c < t.max) || null;
    const target = band?.proxFt ?? null;
    return { club: s.club, date: s.date, carry: c, n: core.length, prox: median(prox), inside: target ? (prox.filter(p => p <= target).length / prox.length) * 100 : null, band: band?.band ?? null, target };
  });
}

/* ---------------------------------------------------------------- approach test */

export const TESTS = {
  approach9: { key: 'approach9', label: 'Approach test', blurb: '9 balls: 3 each at 130, 160 and 185 yds. Enter carry and side off the monitor.', targets: [130, 130, 130, 160, 160, 160, 185, 185, 185] },
};

/**
 * Score one shot 0–100. Error is distance to the target point, with short misses
 * weighted 1.25× (short is the costly miss on approach), as a percentage of the
 * target distance; 2 points off per percent. Ours, not TrackMan's formula.
 */
export function shotScore(target, carry, side = 0) {
  if (carry == null || isNaN(carry)) return null;
  const long = carry - target, s = side || 0;
  const err = Math.hypot(long < 0 ? long * 1.25 : long, s);
  return clamp(100 - (err / target) * 100 * 2, 0, 100);
}

/** Proximity in feet to the target point. */
export const proximityFt = (target, carry, side = 0) => (carry == null ? null : Math.hypot(carry - target, side || 0) * 3);

/** Score a whole test: overall score and per-distance proximity vs the coach's targets. */
export function scoreTest(testKey, shots = []) {
  const t = TESTS[testKey]; if (!t) return null;
  const rows = t.targets.map((tg, i) => { const s = shots[i] || {}; return { target: tg, carry: s.carry ?? null, side: s.side ?? 0, score: shotScore(tg, s.carry, s.side), prox: proximityFt(tg, s.carry, s.side) }; });
  const done = rows.filter(r => r.score != null);
  const bands = [...new Set(t.targets)].map(tg => {
    const rs = done.filter(r => r.target === tg), band = APPROACH_TARGETS.find(b => tg >= b.min && tg < b.max);
    return { target: tg, prox: rs.length ? mean(rs.map(r => r.prox)) : null, goal: band?.proxFt ?? null, band: band?.band ?? null };
  });
  return { score: done.length ? mean(done.map(r => r.score)) : null, done: done.length, of: rows.length, rows, bands };
}

/**
 * The one block to do next: in priority order, the first area with minutes left,
 * and within it the mode with the most left. Null when the week's plan is done.
 */
export function nextBlock(plan = [], week = { by: {} }) {
  const left = b => b.minutes - (week.by[`${b.area}|${b.mode}`] || 0);
  for (const area of [...new Set(plan.map(b => b.area))]) {
    const open = plan.filter(b => b.area === area && left(b) > 0).sort((a, b) => left(b) - left(a));
    if (open.length) return { ...open[0], left: left(open[0]) };
  }
  return null;
}
