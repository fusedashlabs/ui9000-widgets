import { describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/goals-dependency-graph.default.json';
import { MAX_GOALS, normalizeGoalsDependencyGraph, resourceStanding, worstHold } from '../lib/index.js';

describe('normalizeGoalsDependencyGraph', () => {
  it('is empty without goals', () => {
    expect(normalizeGoalsDependencyGraph(null).empty).toBe(true);
    expect(normalizeGoalsDependencyGraph({ goals: [] }).empty).toBe(true);
    expect(normalizeGoalsDependencyGraph({ goals: [{ agents: 4 }] }).empty).toBe(true);
  });

  it('reads the design sample: six goals, the row of seven groups in its order, a line per goal and group', () => {
    const model = normalizeGoalsDependencyGraph(fixture);
    expect(model.title).toBe('Agent operations');
    expect(model.goals.map((g) => g.code)).toEqual(['G-014', 'G-007', 'G-022', 'G-045', 'G-052', 'G-061']);
    expect(model.resources.map((r) => r.name)).toEqual(['Camera', 'App', 'System', 'Tool', 'Store', 'Model', 'Human']);
    expect(model.edges).toHaveLength(19);
    expect(model.held).toBe(214);
  });

  it('puts the goal holding the most agents at the centre, unless the payload names one', () => {
    expect(normalizeGoalsDependencyGraph(fixture).center).toBe('onboarding-velocity');
    expect(normalizeGoalsDependencyGraph({ ...fixture, center: 'G-061' }).center).toBe('model-drift-watch');
    expect(normalizeGoalsDependencyGraph({ ...fixture, center: 'model drift watch' }).center).toBe('model-drift-watch');
    expect(normalizeGoalsDependencyGraph({ ...fixture, center: 'nowhere' }).center).toBe('onboarding-velocity');
  });

  it('sums what a group holds across the goals that draw on it', () => {
    const model = normalizeGoalsDependencyGraph(fixture);
    expect(resourceStanding(model, 'system')).toMatchObject({ hold: 'blocked', held: 94, goals: 3 });
    expect(resourceStanding(model, 'model')).toMatchObject({ hold: 'awaiting', held: 56, goals: 6 });
    expect(resourceStanding(model, 'store')).toMatchObject({ hold: null, health: 'clean', held: 0 });
    expect(resourceStanding(model, 'camera')).toMatchObject({ hold: null, health: 'degraded' });
  });

  it('traces the line that holds most of a goal: blocked over failed over awaiting', () => {
    const model = normalizeGoalsDependencyGraph(fixture);
    expect(worstHold(model, 'onboarding-velocity')).toMatchObject({ resource: 'system', hold: 'blocked', held: 94, cause: 'credential grant required' });
    expect(worstHold(model, 'perimeter-watch')).toMatchObject({ resource: 'model', hold: 'awaiting' });
    expect(worstHold(model, 'pipeline-quality')).toBeUndefined();
  });

  it('joins groups by name across goals, and draws one line where a goal names a group twice', () => {
    const model = normalizeGoalsDependencyGraph({
      goals: [
        { name: 'A', agents: 10, resourceGroups: [{ name: 'Model' }, { name: 'model', state: 'degraded' }, { kind: 'tool' }] },
        { name: 'B', agents: 5, resourceGroups: [{ name: 'MODEL', held: 3 }] },
      ],
    });
    expect(model.resources.map((r) => r.id)).toEqual(['model', 'tool']);
    expect(model.edges.map((e) => `${e.goal}:${e.resource}:${e.state}`)).toEqual(['a:model:healthy', 'a:tool:healthy', 'b:model:blocked']);
    expect(model.edges[2]!.held).toBe(3);
  });

  it('leaves out listed groups no goal draws on', () => {
    const model = normalizeGoalsDependencyGraph({
      resourceGroups: [{ name: 'Unused', count: 4 }, { name: 'Store', count: 340 }],
      goals: [{ name: 'A', resourceGroups: [{ name: 'store' }] }],
    });
    expect(model.resources.map((r) => [r.name, r.count])).toEqual([['Store', 340]]);
  });

  it('reads agents, progress, burn and status as the goals perimeter does', () => {
    const [goal] = normalizeGoalsDependencyGraph({
      goals: [{ name: 'A', agents: { total: '1,000', idle: 10, blocked: 20, failed: 5 }, health: '64%', multiplier: '2.5x' }],
    }).goals;
    expect(goal).toMatchObject({ progress: 0.64, multiplier: 2.5, status: 'degraded', statusLabel: 'AT RISK', held: 25 });
    expect(goal!.agents).toMatchObject({ total: 1000, healthy: 965 });
    const [blocked] = normalizeGoalsDependencyGraph({ goals: [{ name: 'B', status: 'blocked', progress: 0.9 }] }).goals;
    expect(blocked).toMatchObject({ status: 'critical', statusLabel: 'BLOCKED' });
  });

  it(`draws at most ${MAX_GOALS} goals`, () => {
    const goals = Array.from({ length: 11 }, (_, i) => ({ name: `Goal ${i}`, agents: 10 }));
    expect(normalizeGoalsDependencyGraph({ goals }).goals).toHaveLength(MAX_GOALS);
  });
});
