import { describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/bipartite.default.json';
import {
  formatAssets,
  formatShort,
  goalRows,
  normalizeBipartiteGraph,
  placeColumns,
  ribbonLanes,
  ribbonWidth,
} from '../lib/index.js';
import { cornerCaption } from '../render/index.js';

describe('normalizeBipartiteGraph', () => {
  it('lines the goals up against the groups they draw on, in the catalog’s order', () => {
    const model = normalizeBipartiteGraph(defaultFixture);
    expect(model.empty).toBe(false);
    expect(model.title).toBe('Agent operations');
    expect(model.goals.map((g) => g.code)).toEqual(['G-014', 'G-007', 'G-022', 'G-045', 'G-052', 'G-061']);
    expect(model.resources.map((r) => r.name)).toEqual(['Camera', 'App', 'System', 'Tool', 'Store', 'Model', 'Human']);
    expect(model.resources.map(formatAssets)).toEqual([
      '31,204 cameras',
      '8,940 apps',
      '1,284 systems of record',
      '4,612 tools',
      '340 data stores',
      '24 models',
      '41 people',
    ]);
    expect(model.dependencies).toHaveLength(19);
    expect(model.resourceTotal).toBe(21);
    expect(model.exceptionCount).toBe(214);
    expect(cornerCaption(model)).toBe('7 of 21 resource groups — the ones these goals draw on');
  });

  it('reads how each goal fares with each group, and what the goals meet there together', () => {
    const model = normalizeBipartiteGraph(defaultFixture);
    const dep = (goal: string, group: string) => model.dependencies.find((d) => d.goal.code === goal && d.resource.key === group)!;
    expect(dep('G-007', 'system')).toMatchObject({ health: 'held', hold: 'blocked', held: 94, calls: 5400 });
    expect(dep('G-007', 'app')).toMatchObject({ health: 'degraded', hold: null, held: 0 });
    expect(dep('G-045', 'store')).toMatchObject({ health: 'clean', hold: null });
    // the worst of it, and every agent held there
    expect(model.standing.get('model')).toEqual({ health: 'held', hold: 'awaiting', held: 56, goals: 6, calls: 26_200 });
    expect(model.standing.get('tool')).toMatchObject({ hold: 'failed', held: 38, goals: 3 });
    expect(model.standing.get('camera')).toMatchObject({ health: 'degraded', hold: null, held: 0, goals: 2 });
  });

  it('draws the groups the goals name without a catalog, and only the catalog’s groups some goal draws on', () => {
    const bare = (({ resourceGroups: _groups, resourceGroupTotal: _total, ...rest }) => rest)(defaultFixture);
    const plain = normalizeBipartiteGraph(bare);
    // in the order the goals first name them
    expect(plain.resources.map((r) => r.name)).toEqual(['Camera', 'System', 'Model', 'App', 'Tool', 'Human', 'Store']);
    expect(plain.resources.every((r) => r.count === null)).toBe(true);
    expect(formatAssets(plain.resources[0]!)).toBeNull();
    expect(cornerCaption(plain)).toBe('7 resource groups — the ones these goals draw on');

    const extra = normalizeBipartiteGraph({
      goals: [{ name: 'Claims', resourceGroups: [{ name: 'Scoring', state: 'blocked', held: 4 }, { name: 'Queue' }] }],
      resources: [
        { name: 'Ledger', count: 3 },
        { name: 'Queue', count: 1, unit: ['queue', 'queues'] },
        { name: 'Scoring', kind: 'model', count: 2 },
      ],
    });
    expect(extra.resources.map((r) => r.name)).toEqual(['Queue', 'Scoring']);
    expect(extra.resources.map(formatAssets)).toEqual(['1 queue', '2 models']);
    expect(extra.resourceTotal).toBe(3);
  });

  it('is empty, not broken, without goals', () => {
    for (const input of [null, {}, { goals: [] }, 'nope']) {
      const model = normalizeBipartiteGraph(input);
      expect(model.empty).toBe(true);
      expect(model.resources).toEqual([]);
    }
  });
});

describe('bipartite layout', () => {
  it('spreads the goals down one column, the largest the widest, and keeps them apart when there are many', () => {
    const model = normalizeBipartiteGraph(defaultFixture);
    const rows = goalRows(model.goals);
    expect(rows.map((r) => Math.round(r.y))).toEqual([52, 151, 250, 350, 449, 548]);
    expect(rows[0]!.r).toBeGreaterThan(rows[5]!.r);
    const crowded = goalRows(Array.from({ length: 14 }, () => model.goals[0]!));
    const gap = crowded[1]!.y - crowded[0]!.y;
    expect(crowded[0]!.r * 2).toBeLessThan(gap);
  });

  it('keeps the columns where they are under a zoom, and between their limits', () => {
    const near = placeColumns(0.8, 40, 260);
    const far = placeColumns(1.6, 40, 260);
    expect(near.resources - near.goals).toBeGreaterThanOrEqual(400);
    expect(near.resources - near.goals).toBeLessThanOrEqual(620);
    expect(far.resources - far.goals).toBe(400);
  });

  it('fans each bundle of ribbons out in the order of what it runs to', () => {
    const model = normalizeBipartiteGraph(defaultFixture);
    const lanes = ribbonLanes(
      model.dependencies,
      new Map(model.goals.map((g, i) => [g.id, i])),
      new Map(model.resources.map((r, i) => [r.key, i])),
    );
    const of = (goal: string) => model.dependencies.flatMap((d, i) => (d.goal.code === goal ? [[d.resource.name, lanes[i]!.goal]] : []));
    // Onboarding Velocity's five ribbons leave from the top down in the groups' order
    expect(Object.fromEntries(of('G-007'))).toEqual({ App: -2, System: -1, Tool: 0, Model: 1, Human: 2 });
    expect(lanes.every((lane) => Number.isFinite(lane.resource))).toBe(true);
  });

  it('widens a ribbon by area with its calls, and shortens big numbers', () => {
    expect(ribbonWidth(0, 14_200)).toBe(1.5);
    expect(ribbonWidth(14_200, 14_200)).toBe(14);
    expect(ribbonWidth(3_550, 14_200)).toBeCloseTo(1.5 + 12.5 * 0.5);
    expect([formatShort(36), formatShort(9_400), formatShort(26_200), formatShort(1_200_000)]).toEqual(['36', '9.4k', '26.2k', '1.2M']);
  });
});
