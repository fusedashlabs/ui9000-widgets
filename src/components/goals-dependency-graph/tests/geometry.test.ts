import { describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/goals-dependency-graph.default.json';
import { FIELD_STATES, focusSets, normalizeGoalsDependencyGraph, plantGoals, resourcePlaces, slotX, TREE } from '../lib/index.js';

const model = normalizeGoalsDependencyGraph(fixture);

describe('goals dependency graph geometry', () => {
  it('stands the others either side of the centre, evenly, and the row in the middle of the board', () => {
    const xs = slotX(6);
    const left = xs.slice(1, 3);
    const right = xs.slice(3);
    expect(left.every((x) => x < xs[0]!)).toBe(true);
    expect(right.every((x) => x > xs[0]!)).toBe(true);
    expect(left[1]! - left[0]!).toBeCloseTo(right[1]! - right[0]!);
    for (const n of [1, 2, 5, 6, 8]) {
      const row = slotX(n);
      expect((Math.min(...row) + Math.max(...row)) / 2).toBeCloseTo(640);
    }
    expect(slotX(1)).toEqual([640]);
    expect(slotX(5)[0]).toBe(640);
  });

  it('hangs the groups in one row across the field, in order', () => {
    const places = resourcePlaces(model);
    const xs = model.resources.map((r) => places[r.id]!.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(new Set(model.resources.map((r) => places[r.id]!.y)).size).toBe(1);
  });

  it('grows a tree with a tip for every agent, and stands each agent on one', () => {
    const planted = plantGoals(model.goals);
    for (const goal of model.goals) {
      const { tree, cloud } = planted[goal.id]!;
      const drawn = FIELD_STATES.reduce((sum, s) => sum + goal.agents[s], 0);
      expect(tree.tips.length / 3).toBe(drawn);
      expect(cloud.position.length / 3).toBe(drawn);
      expect(cloud.ranges.blocked[1] - cloud.ranges.blocked[0]).toBe(goal.agents.blocked);
      // the canopy reaches no further than the largest tree, and stays above the baseline
      expect(tree.reach).toBeLessThanOrEqual(TREE.reach + 1e-6);
      for (let i = 1; i < tree.tips.length; i += 3) expect(tree.tips[i]).toBeLessThan(0);
    }
  });

  it('grows the same tree for the same goal', () => {
    const a = plantGoals(model.goals)[model.goals[0]!.id]!.tree;
    const b = plantGoals(model.goals)[model.goals[0]!.id]!.tree;
    expect(a.limbs).toBe(b.limbs);
    expect(Array.from(a.tips)).toEqual(Array.from(b.tips));
  });

  it('lights a focused goal’s lines and, softly, the goals its groups could reach — but not through a group every goal uses', () => {
    const sets = focusSets(model, 'onboarding-velocity', null);
    expect(sets.lit.has('g:onboarding-velocity')).toBe(true);
    expect(sets.lit.has('r:system')).toBe(true);
    // Incident Response shares System with it; Model Drift Watch only shares Model, which every goal draws on
    expect(sets.soft.has('g:incident-response')).toBe(true);
    expect(sets.soft.has('g:model-drift-watch')).toBe(false);
    expect([...sets.edges].every((i) => model.edges[i]!.goal === 'onboarding-velocity')).toBe(true);
  });

  it('lights every line into a traced group', () => {
    const sets = focusSets(model, null, 'tool');
    expect([...sets.edges].map((i) => model.edges[i]!.goal).sort()).toEqual(['maintain-verified-asset-visibility', 'onboarding-velocity', 'pipeline-quality']);
    expect(focusSets(model, null, null).active).toBe(false);
  });
});
