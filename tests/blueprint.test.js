import { describe, it, expect } from 'vitest';
import { parseBlueprintGrid, matrixText } from '../src/lib/blueprint.js';

const grid = `Section\tBackswing / Setup\tDownswing / Delivery\tFollow-through / Notes
Practice Station\tAlignment sticks; Ball position\tPlane stick for exit\t
Set-up Checks\tFace angle; Body alignment\tRight arm under\t
Drills\tBall in arms\tPump drill\tQuarter swings
Shit Shot & Why\tFace shut – low left\tEarly hit\tArc left
Added Notes\tDraws: ball back\tFades: ball forward\tHigh: ball up`;

describe('blueprint grid', () => {
  it('maps coach labels to the matrix and splits semicolons', () => {
    const m = parseBlueprintGrid(grid);
    expect(m.station.setup).toBe('Alignment sticks\nBall position');
    expect(m.miss.setup).toMatch(/Face shut/);
    expect(m.notes.finish).toBe('High: ball up');
    expect(m.movement.setup).toBe('');
    expect(matrixText({ areas: { swing: m } })).toMatch(/Swing · Drills: \[Backswing \/ Setup\] Ball in arms/);
  });
});
