import { describe, expect, it } from 'vitest';

import { BOARD, goalRadius, layoutBoard, normalizeGoalsPerimeter } from '../lib/index.js';
import defaultFixture from '../../../stories/fixtures/goals-perimeter.default.json';

const model = normalizeGoalsPerimeter(defaultFixture);
const layout = layoutBoard(model.goals);

describe('goal layout', () => {
  it('sizes a goal by its agents, as the design sizes its clouds', () => {
    expect([1108, 842, 318, 96].map((n) => Math.round(goalRadius(n)))).toEqual([89, 79, 52, 31]);
    // a handful of agents still makes a goal you can point at; a huge one stops growing
    expect(goalRadius(3)).toBe(22);
    expect(goalRadius(1_000_000)).toBe(96);
  });

  it('places pinned goals in the design space, with their depth and radius', () => {
    const p = layout.byId.get('perimeter-watch')!;
    expect(p.x).toBeCloseTo(300, 0);
    expect(p.y).toBeCloseTo(186, 0);
    expect(p.z).toBeCloseTo(-150, 0);
    expect(p.r).toBeCloseTo(88.8, 0);
    expect(layout.byId.get('pipeline-quality')!.z).toBeCloseTo(180, 0);
    // a pinned goal without a radius is sized by its agents
    const unsized = normalizeGoalsPerimeter({ goals: [{ name: 'A', agents: 842, position: { x: 0.5, y: 0.5 } }] });
    const at = layoutBoard(unsized.goals).placements[0]!;
    expect([at.x, at.y, at.z, Math.round(at.r)]).toEqual([BOARD.width / 2, BOARD.height / 2, 0, 79]);
  });

  it('lays out unpinned goals deterministically, inside the board, their orbits clear of each other', () => {
    const unpinned = normalizeGoalsPerimeter({
      goals: model.goals.map((g) => ({ name: g.name, agents: g.agents.total })),
    });
    const a = layoutBoard(unpinned.goals);
    expect(layoutBoard(unpinned.goals)).toEqual(a);
    for (const p of a.placements) {
      expect(p.x - p.r).toBeGreaterThan(0);
      expect(p.x + p.r).toBeLessThan(BOARD.width);
      expect(p.y - p.r).toBeGreaterThan(0);
      expect(p.y + p.r).toBeLessThan(BOARD.height);
      expect(p.z).toBe(0);
    }
    for (let i = 0; i < a.placements.length; i += 1)
      for (let j = i + 1; j < a.placements.length; j += 1) {
        const p = a.placements[i]!;
        const q = a.placements[j]!;
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(p.r + q.r + 60);
      }
    // one goal alone is drawn large enough to read
    const one = layoutBoard(normalizeGoalsPerimeter({ goal: { name: 'Solo', agents: 72 } }).goals).placements[0]!;
    expect(one.r).toBeGreaterThan(50);
  });
});
