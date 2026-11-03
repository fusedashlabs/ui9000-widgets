import { describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/goals-insights.default.json';
import { claimRadius, MAX_CLAIMS, MAX_CONNECTED, normalizeGoalsInsights } from '../lib/index.js';

describe('normalizeGoalsInsights', () => {
  it('reads the design’s Perimeter Watch: its claims first, then its connected goals’ other claims', () => {
    const model = normalizeGoalsInsights(defaultFixture);
    expect(model.empty).toBe(false);
    expect(model.title).toBe('Perimeter Watch');
    expect(model.goal).toMatchObject({ id: 'G-014', code: 'G-014', status: { label: 'On track', tone: 'ok' }, confidence: 0.81, held: 19 });
    expect(model.goal.agents.total).toBe(1108);
    expect(model.connected.map((g) => g.id)).toEqual(['G-022', 'G-052']);
    expect(model.claims).toHaveLength(41);
    expect(model.dropped).toBe(0);
    // its own 18, and the 3 its connected goals filed that bear on it
    expect(model.counted).toBe(21);
    const own = model.claims.slice(0, model.counted);
    expect(own.every((c) => c.goal === 'G-014' || c.also.includes('G-014'))).toBe(true);
    expect(model.claims.slice(model.counted).every((c) => c.goal !== 'G-014' && !c.also.includes('G-014'))).toBe(true);
    // oldest first within each, as filed
    expect(own.map((c) => c.age)).toEqual([...own.map((c) => c.age)].sort((a, b) => b - a));
    // a connected goal's callout counts the claims filed under it
    expect(model.connected.map((g) => g.claims)).toEqual([15, 8]);
  });

  it('reads each claim’s side from its state, polarity and sources', () => {
    const model = normalizeGoalsInsights(defaultFixture);
    const evidence = (text: string) => model.claims.find((c) => c.text.startsWith(text))!.evidence;
    expect(evidence('Cameras C-0412')).toBe('contradicting');
    expect(evidence('HR leave record')).toBe('disputed');
    expect(evidence('Visitor badges expire')).toBe('unverified');
    expect(evidence('Patrol route coverage')).toBe('supporting');
  });

  it('takes numbers as strings, percents, aliases, and fills what is left out', () => {
    const model = normalizeGoalsInsights({
      mainGoal: { code: 'G-1', title: 'Goal one', status: 'At-Risk', progress: '64%', agents: '1,200', waiting: '12', blocked: 3, over_budget: '5' },
      insights: [
        { text: 'Gateway p95 over threshold', topic: 'Latency', stance: 'argues against', ageHours: '2.5', sources: '4', kind: 'Model' },
        { label: 'Cache warm', hours: 30, sources: 1 },
        { claim: 'No age, no place on the column' },
      ],
    });
    expect(model.goal).toMatchObject({ id: 'G-1', name: 'Goal one', status: { tone: 'warn' }, confidence: 0.64, held: 20 });
    expect(model.goal.agents).toMatchObject({ total: 1200, awaiting: 12, overBudget: 5, working: 1200 - 20 });
    // oldest first, as filed
    const [b, a] = model.claims;
    expect(a).toMatchObject({ theme: 'latency', polarity: 'contradicting', age: 2.5, sources: 4, asset: 'model', state: 'corroborated', evidence: 'contradicting', goal: 'G-1' });
    expect(a!.weight).toBeGreaterThan(0.06);
    // a volume not sent is not made up
    expect(a!.records).toBeNull();
    expect(b!.records).toBeNull();
    expect(claimRadius(a!.records)).toBe(claimRadius(b!.records));
    expect(b).toMatchObject({ state: 'open', evidence: 'unverified' });
    expect(model.dropped).toBe(1);
  });

  it('stands the goals its claims name beside it when no connected goals are listed, the two that share most', () => {
    const model = normalizeGoalsInsights({
      goal: { id: 'A' },
      claims: [
        { goal: 'A', also: 'B, C', claim: 'one', age: 1 },
        { goal: 'C', also: ['A'], claim: 'two', age: 2 },
        { goal: 'A', also: ['D'], claim: 'three', age: 3 },
        { goal: 'D', also: ['A'], claim: 'four', age: 4 },
        { goal: 'C', claim: 'five', age: 5 },
        { goal: 'E', also: ['A'], claim: 'filed under a goal not drawn', age: 6 },
      ],
    });
    expect(MAX_CONNECTED).toBe(2);
    expect(model.connected.map((g) => [g.id, g.name])).toEqual([
      ['C', 'C'],
      ['D', 'D'],
    ]);
    // B is not drawn, so the claim no longer names it; E's claim has no goal to run to
    expect(model.claims.find((c) => c.text === 'one')!.also).toEqual(['C']);
    expect(model.claims.map((c) => c.text)).not.toContain('filed under a goal not drawn');
    expect(model.claims.map((c) => c.text).slice(model.counted)).toEqual(['five']);
    expect(model.dropped).toBe(1);
  });

  it('keeps the goal’s own claims first past the column’s room, and says how many were left out', () => {
    const own = Array.from({ length: MAX_CLAIMS - 10 }, (_, i) => ({ claim: `own ${i}`, age: i % 60 }));
    const context = Array.from({ length: 30 }, (_, i) => ({ goal: 'B', claim: `theirs ${i}`, age: i }));
    const model = normalizeGoalsInsights({ goal: { id: 'A' }, connected: [{ id: 'B' }], claims: [...own, ...context] });
    expect(model.claims).toHaveLength(MAX_CLAIMS);
    expect(model.counted).toBe(MAX_CLAIMS - 10);
    expect(model.dropped).toBe(20);
    // the newest of the connected goal's claims are the ones kept
    expect(Math.max(...model.claims.slice(model.counted).map((c) => c.age))).toBe(9);
    expect(model.connected[0]!.claims).toBe(10);
  });

  it('keeps claim ids unique, so a pick finds one claim', () => {
    const model = normalizeGoalsInsights({ goal: { id: 'A' }, claims: [{ id: 'X', claim: 'a', age: 1 }, { id: 'X', claim: 'b', age: 2 }] });
    expect(new Set(model.claims.map((c) => c.id)).size).toBe(2);
  });

  it('is empty without a goal', () => {
    expect(normalizeGoalsInsights(null).empty).toBe(true);
    expect(normalizeGoalsInsights({ claims: [{ claim: 'x', age: 1 }] }).empty).toBe(true);
    expect(normalizeGoalsInsights({ title: 'T', goal: {} })).toMatchObject({ empty: true, title: 'T' });
  });
});
