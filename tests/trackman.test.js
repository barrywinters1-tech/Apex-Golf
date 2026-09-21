import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { aggregateTrackman, signed, dateFromFilename } from '../src/lib/trackman.js';

describe('trackman', () => {
  it('parses signed L/R values', () => {
    expect(signed('6.2 R')).toBe(6.2); expect(signed('3.5 L')).toBe(-3.5); expect(signed('-')).toBeNull();
  });
  it('reads TrackMan file-name dates', () => {
    expect(dateFromFilename('16-jul-2026_07_58_pm.csv')).toBe('2026-07-16');
  });
  it('averages shots per club and skips Avg/Dev rows', () => {
    const s = aggregateTrackman(readFileSync('data/trackman/2026-09-03.csv', 'utf8'), { date: '2026-09-03' });
    const d = s.find(x => x.club === 'Driver');
    expect(d.shots).toBe(21); expect(d.chs).toBe(109.7); expect(d.bs).toBe(148.6); expect(d.carry).toBe(230); expect(d.path).toBe(-1.3);
    expect(s.map(x => x.club).sort()).toEqual(['7 Iron', '8 Iron', 'Driver']);
  });
});
