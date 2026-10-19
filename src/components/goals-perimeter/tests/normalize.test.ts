import { describe, expect, it } from 'vitest';

import { goalSummary, normalizeGoalsPerimeter } from '../lib/index.js';
import defaultFixture from '../../../stories/fixtures/goals-perimeter.default.json';
import agentsFixture from '../../../stories/fixtures/goals-perimeter.agents.json';

describe('normalizeGoalsPerimeter', () => {
  it('reads the default sample', () => {
    const model = normalizeGoalsPerimeter(defaultFixture);
    expect(model.empty).toBe(false);
    expect(model.title).toBe('Agents Management — Goals');
    expect(model.goals.map((g) => g.name)).toEqual([
      'Perimeter Watch',
      'Onboarding Velocity',
      'Maintain Verified Asset Visibility',
      'Pipeline Quality',
      'Incident Response',
    ]);
    expect(model.goals.map(goalSummary)).toEqual([
      '1,204 agents · 88% · 1.1×',
      '842 agents · 41% · 4.2×',
      '612 agents · 66% · 1.3×',
      '318 agents · 92% · 0.8×',
      '144 agents · 78% · 1.6×',
    ]);
    expect(model.goals.map((g) => g.impure)).toEqual([35, 159, 15, 0, 5]);
    expect(model.exceptionCount).toBe(214);
    expect(model.goals.map((g) => g.status)).toEqual([
      'healthy',
      'degraded',
      'degraded',
      'healthy',
      'degraded',
    ]);
    expect(model.goals.map((g) => g.resourceGroupCount)).toEqual([3, 3, 2, 1, 1]);
    expect(model.goals[0]!.resourceGroups.map((rg) => [rg.icon, rg.state])).toEqual([
      ['sensor', 'degraded'],
      ['model', 'failed'],
      ['network', 'failed'],
    ]);
    expect(model.connections).toHaveLength(9);
    expect(model.connections.filter((c) => c.status === 'unavailable')).toHaveLength(2);
    expect(model.externals).toEqual([]);
  });

  it('counts agent nodes into states, exceptions and the exception count', () => {
    const model = normalizeGoalsPerimeter(agentsFixture);
    expect(model.goals).toHaveLength(1);
    const goal = model.goals[0]!;
    expect(goal.name).toBe('Incident Response');
    expect(goal.agents).toEqual({ total: 72, healthy: 52, degraded: 8, blocked: 6, failed: 6, idle: 0 });
    expect(goal.impure).toBe(20);
    expect(model.exceptionCount).toBe(20);
    expect(model.agents).toHaveLength(72);
    expect(model.agents.every((a) => a.goalId === 'incident-response')).toBe(true);
    // One exception per state and reason, largest first.
    expect(goal.exceptions.map((e) => [e.state, e.count, e.blocker])).toEqual([
      ['degraded', 8, null],
      ['failed', 6, null],
      ['blocked', 4, 'human'],
      ['blocked', 2, 'dependency'],
    ]);
  });

  it('turns links into agent links and external dependencies', () => {
    const model = normalizeGoalsPerimeter(agentsFixture);
    expect(model.agentLinks).toHaveLength(12);
    expect(model.externals.map((d) => [d.label, d.status, d.links])).toEqual([
      ['PagerDuty', 'unavailable', 2],
      ['CMDB', 'degraded', 1],
      ['Runbook library', 'active', 1],
    ]);
    expect(model.externals[0]!.impact).toBe('Failed agents cannot page the on-call engineer');
  });

  it('adds a goal agents name and puts goal-less agents on the first goal', () => {
    const model = normalizeGoalsPerimeter({
      goal: 'Claims Triage',
      agents: [
        { id: 'a', state: 'failed' },
        { id: 'b', state: 'ok', goal: 'claims-triage' },
        { id: 'c', state: 'waiting', goal: 'Fraud Review' },
        { id: 'd', state: 'paused' },
        { id: 'e', state: 'mystery' },
      ],
    });
    expect(model.goals.map((g) => [g.id, g.name])).toEqual([
      ['claims-triage', 'Claims Triage'],
      ['fraud-review', 'Fraud Review'],
    ]);
    expect(model.agents.map((a) => [a.id, a.state, a.goalId])).toEqual([
      ['a', 'failed', 'claims-triage'],
      ['b', 'healthy', 'claims-triage'],
      ['c', 'blocked', 'fraud-review'],
      ['d', 'idle', 'claims-triage'],
      ['e', 'idle', 'claims-triage'],
    ]);
    expect(model.goals[0]!.agents).toMatchObject({ total: 4, healthy: 1, failed: 1, idle: 2 });
  });

  it('makes one goal from agents alone', () => {
    const model = normalizeGoalsPerimeter({ title: 'Fleet', nodes: [{ id: 1 }, { id: 2, state: 'failed' }] });
    expect(model.goals.map((g) => g.name)).toEqual(['Fleet']);
    expect(model.goals[0]!.agents.total).toBe(2);
  });

  it('lets the goal counts win over the nodes and keeps unexplained exceptions', () => {
    const { goals } = normalizeGoalsPerimeter({
      goal: { name: 'A', agents: { total: 100, failed: 10 } },
      agents: [
        { id: 'x', state: 'failed', reason: 'Timeout' },
        { id: 'y', state: 'failed', reason: 'Timeout' },
      ],
    });
    expect(goals[0]!.agents).toMatchObject({ total: 100, failed: 10, healthy: 90 });
    expect(goals[0]!.exceptions).toEqual([
      { state: 'failed', count: 2, reason: 'Timeout', blocker: null },
      { state: 'failed', count: 8, reason: '', blocker: null },
    ]);
  });

  it('derives states, the exception count and healthy from a breakdown', () => {
    const { goals } = normalizeGoalsPerimeter({
      goals: [{ name: 'Claims', agents: { healthy: 410, degraded: 38, blocked: 22, failed: 9, idle: 40 } }],
    });
    const goal = goals[0]!;
    expect(goal.agents).toEqual({ total: 519, healthy: 410, degraded: 38, blocked: 22, failed: 9, idle: 40 });
    expect(goal.impure).toBe(69);
    expect(goal.health).toBeCloseTo(410 / 519);
    expect(goal.exceptions.map((e) => [e.state, e.count])).toEqual([
      ['failed', 9],
      ['blocked', 22],
      ['degraded', 38],
    ]);
  });

  it('counts exceptions the states do not cover as degraded, under either name', () => {
    for (const field of ['exceptionCount', 'impure']) {
      const { goals } = normalizeGoalsPerimeter({
        goals: [{ name: 'A', agents: 100, [field]: 12, exceptions: [{ state: 'failed', count: 5 }] }],
      });
      expect(goals[0]!.agents).toMatchObject({ total: 100, failed: 5, degraded: 7, healthy: 88 });
      expect(goals[0]!.impure).toBe(12);
    }
  });

  it('reads health, multiplier and status in their loose forms', () => {
    const { goals } = normalizeGoalsPerimeter({
      thresholds: { degraded: '90%' },
      goals: [
        { name: 'A', agents: 1, health: '88%', multiplier: '1.1x' },
        { name: 'B', agents: 1, health: 92, multiplier: '2×' },
        { name: 'C', agents: 1, health: 0.1 },
        { name: 'D', agents: 1, health: 0.99, status: 'warning' },
      ],
    });
    expect(goals.map((g) => g.health)).toEqual([0.88, 0.92, 0.1, 0.99]);
    expect(goals.map((g) => g.multiplier)).toEqual([1.1, 2, null, null]);
    expect(goals.map((g) => g.status)).toEqual(['degraded', 'healthy', 'critical', 'degraded']);
  });

  it('folds goal links by pair and status, through agents and resource groups', () => {
    const model = normalizeGoalsPerimeter({
      goals: [
        { id: 'a', name: 'Alpha', resourceGroups: [{ id: 'rg-a', name: 'Model' }] },
        { name: 'Beta Goal' },
      ],
      agents: [
        { id: 'a1', goal: 'a' },
        { id: 'b1', goal: 'Beta Goal' },
      ],
      connections: [
        { from: 'a', to: 'beta goal', status: 'down', strands: 40 },
        { source: 'Alpha', target: 'beta-goal' },
        { source: 'a1', target: 'b1' },
        { source: 'b1', target: 'rg-a' },
        { source: 'a', target: 'a' },
        { source: 'nowhere', target: 'nothing' },
      ],
    });
    expect(model.connections.map((c) => [c.source, c.target, c.status, c.strands])).toEqual([
      ['a', 'beta-goal', 'unavailable', 16],
      ['a', 'beta-goal', 'active', 8],
    ]);
    expect(model.externals).toEqual([]);
  });

  it('takes a resource group count when only the count is known', () => {
    const { goals } = normalizeGoalsPerimeter({ goals: [{ name: 'A', agents: 3, resourceGroups: 4 }] });
    expect(goals[0]!.resourceGroups).toEqual([]);
    expect(goals[0]!.resourceGroupCount).toBe(4);
  });

  it('applies positions only as given', () => {
    const { goals } = normalizeGoalsPerimeter({
      goals: [
        { name: 'A', position: { x: 0.2, y: 1.4 } },
        { name: 'B', position: [0.5, 0.5] },
        { name: 'C', x: '0.1', y: 0.9 },
        { name: 'D' },
      ],
    });
    expect(goals.map((g) => g.position)).toEqual([
      { x: 0.2, y: 1 },
      { x: 0.5, y: 0.5 },
      { x: 0.1, y: 0.9 },
      null,
    ]);
  });

  it('keeps ids unique and skips unnamed goals', () => {
    const { goals } = normalizeGoalsPerimeter({
      goals: [{ name: 'Same' }, { name: 'Same' }, { agents: 4 }, null, 'x'],
    });
    expect(goals.map((g) => g.id)).toEqual(['same', 'same-1']);
  });

  it('never throws on bad input', () => {
    for (const input of [null, undefined, 42, 'x', [], { goals: 'nope' }, { goals: [{}] }, { agents: 'x' }]) {
      const model = normalizeGoalsPerimeter(input);
      expect(model.empty).toBe(true);
      expect(model.goals).toEqual([]);
      expect(model.exceptionCount).toBe(0);
    }
  });
});
