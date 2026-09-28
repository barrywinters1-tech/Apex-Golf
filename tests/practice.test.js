import { describe, it, expect } from 'vitest';
import { phi, priorities, weeklyPlan, modeMix, weekLogged, yardageBook, gamePlan, approachReadiness, shotScore, scoreTest, coachDrills } from '../src/lib/practice.js';
import { nodeId } from '../src/lib/academy.js';

const round = (o = {}) => ({ par: 72, score: 82, fir: 7, firOf: 14, gir: 7, putts: 33, upDown: 3, upDownOf: 8, ...o });

describe('practice engine', () => {
  it('phi is a normal CDF', () => {
    expect(phi(0)).toBeCloseTo(0.5, 5);
    expect(phi(1.96)).toBeCloseTo(0.975, 3);
    expect(phi(-1)).toBeCloseTo(0.1587, 3);
  });

  it('ranks the area losing most strokes first, and uses coach ratings as room', () => {
    const rounds = [1, 2, 3].map(() => round({ sgT: -0.5, sgA: -3.5, sgG: -1, sgP: -1 }));
    const p = priorities({ rounds });
    expect(p[0].key).toBe('approach');
    expect(p[0].basis).toBe('sg');
    // Coach says approach is owned → it drops below around-the-green (unrated room 0.6)
    const owned = ['strike', 'skills', 'iq'].flatMap(b => ({ strike: ['Consistent face contact'], skills: ['Carry distances'], iq: ['Wind: how much and what direction'] })[b].map(n => ({ node: nodeId(b, n), value: 3 })));
    const p2 = priorities({ rounds: [round({ sgA: -1.2, sgG: -1.0 })], ratings: owned });
    expect(p2.find(x => x.key === 'approach').room).toBe(0);
    expect(p2[0].key).toBe('short');
  });

  it('falls back to the gap to target without strokes gained, and spots a worsening trend', () => {
    const rounds = [30, 30, 30, 35, 36, 36].map(putts => round({ putts }));
    const pt = priorities({ rounds }).find(x => x.key === 'putting');
    expect(pt.basis).toBe('gap');
    expect(pt.trend).toBe('worsening');
  });

  it('plans minutes by priority with a rating-driven mode mix, preferring the coach\'s drills', () => {
    const rounds = [round({ sgT: -0.5, sgA: -3, sgG: -1, sgP: -0.5 })];
    const bp = { areas: { swing: { drills: { setup: 'Harrington chest-down drill', delivery: '', finish: '' } } } };
    const plan = weeklyPlan(priorities({ rounds }), { minutes: 240, bp });
    const total = plan.reduce((s, b) => s + b.minutes, 0);
    expect(total).toBeGreaterThan(200); expect(total).toBeLessThan(280);
    const tech = plan.find(b => b.area === 'approach' && b.mode === 'technique');
    expect(tech.idea).toBe('Harrington chest-down drill'); expect(tech.coach).toBe(true);
    expect(modeMix(0.5).technique).toBeGreaterThan(modeMix(3).technique);
    expect(coachDrills(bp, 'swing')).toEqual(['Harrington chest-down drill']);
  });

  it('counts this week\'s logged minutes by area and mode', () => {
    const w = weekLogged([{ date: '2026-09-28', area: 'approach', mode: 'skill', minutes: 30 }, { date: '2026-09-20', area: 'approach', mode: 'skill', minutes: 60 }, { kind: 'test', date: '2026-09-28', minutes: 45 }], new Date('2026-09-30T10:00:00'));
    expect(w.start).toBe('2026-09-28'); expect(w.total).toBe(30); expect(w.by['approach|skill']).toBe(30);
  });

  const shots = [150, 152, 148, 151, 149, 90].map((carry, i) => ({ carry, lat: [4, 6, 5, 3, 7, 20][i] }));
  const sess = [{ date: '2026-09-03', club: '7 Iron', shotList: shots }, { date: '2026-09-06', club: 'Driver', shotList: [240, 250, 245].map((carry, i) => ({ carry, lat: [10, 20, 15][i] })) }];

  it('builds a yardage book that drops mishits and orders clubs', () => {
    const yb = yardageBook(sess);
    expect(yb.map(x => x.club)).toEqual(['Driver', '7 Iron']);
    const i7 = yb[1]; expect(i7.dropped).toBe(1); expect(i7.carry).toBe(150); expect(i7.bias).toBeCloseTo(5, 5);
  });

  it('game plan aims against the bias and more lands in play once centred', () => {
    const g = gamePlan({ bias: 15, latSd: 5 }, { width: 30 });
    expect(g.aim).toBe(-15); expect(g.inPlayAimed).toBeGreaterThan(g.inPlay); expect(g.width95).toBe(20);
  });

  it('rates approach readiness against the coach\'s band targets', () => {
    const r = approachReadiness(sess);
    expect(r).toHaveLength(1);
    expect(r[0].band).toBe('150–175'); expect(r[0].target).toBe(22); expect(r[0].prox).toBeLessThan(22);
  });

  it('scores test shots: dead-on 100, short misses cost more than long', () => {
    expect(shotScore(150, 150, 0)).toBe(100);
    expect(shotScore(150, 140, 0)).toBeLessThan(shotScore(150, 160, 0));
    const t = scoreTest('approach9', [{ carry: 130, side: 0 }, { carry: 125, side: 3 }]);
    expect(t.done).toBe(2); expect(t.bands[0].goal).toBe(18); expect(t.bands[1].prox).toBeNull();
  });
});
