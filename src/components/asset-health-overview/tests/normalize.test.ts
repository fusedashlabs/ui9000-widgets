import { describe, expect, it } from 'vitest';

import figma from '../../../stories/fixtures/asset-health.figma.json';
import { buildScene } from '../lib/scene.js';
import { normalizeAssetHealth, normalizeWall, WALL_SLOTS } from '../lib/index.js';

describe('normalizeAssetHealth', () => {
  it('reads the Figma sample: agent total and category totals stay in sync', () => {
    const model = normalizeAssetHealth(figma);
    expect(model.empty).toBe(false);
    expect(model.goal.total).toBe(1204);
    expect(model.goal.blocked).toBe(84);
    expect(model.categories).toHaveLength(6);
    expect(model.categories.map((c) => c.name)).toEqual([
      'Applications',
      'Databases',
      'Devices',
      'AI models',
      'People',
      'Tools',
    ]);
    expect(model.categories.map((c) => c.total)).toEqual([12, 9, 219, 6, 5, 24]);
    expect(model.categories.find((c) => c.id === 'db')?.problems[0]?.name).toBe('crm-prod');
    expect(model.categories.find((c) => c.id === 'ai')?.problems[0]?.sev).toBe('degraded');
    expect(model.wall).toHaveLength(WALL_SLOTS);
    expect(model.wall.filter((s) => s.err)).toHaveLength(4);
    const scene = buildScene(model);
    expect(scene.wall).toHaveLength(WALL_SLOTS);
    expect(scene.wall.some((s) => s.err)).toBe(true);
  });

  it('accepts agents as an alias for goal', () => {
    const model = normalizeAssetHealth({
      agents: { total: 10, awaiting: 1, blocked: 0, failed: 0 },
      categories: [{ name: 'Tools', total: 2, items: ['a', 'b'], problems: [] }],
    });
    expect(model.goal.total).toBe(10);
    expect(model.empty).toBe(false);
    expect(model.wall).toEqual([]);
  });

  it('accepts WidgetItem data rows with agent columns on a category row', () => {
    const model = normalizeAssetHealth({
      chartType: 'assetHealthOverview',
      name: 'Onboarding Velocity',
      data: [
        {
          category: 'Applications',
          total: 12,
          healthy: 12,
          agents: 1204,
          awaiting: 19,
          blocked: 84,
          failed: 2,
        },
        { category: 'Databases', healthy: 8, failing: 1 },
        { category: 'Tools', healthy: 20, degraded: 2, failing: 2 },
      ],
    });
    expect(model.empty).toBe(false);
    expect(model.goal).toMatchObject({
      name: 'Onboarding Velocity',
      total: 1204,
      awaiting: 19,
      blocked: 84,
      failed: 2,
    });
    expect(model.categories.map((c) => c.name)).toEqual(['Applications', 'Databases', 'Tools']);
    // Agent `failed` must not bleed into category failing / total.
    expect(model.categories[0]).toMatchObject({
      total: 12,
      healthy: 12,
      failing: 0,
      degraded: 0,
      problems: [],
    });
    expect(model.categories[1]).toMatchObject({
      total: 9,
      healthy: 8,
      failing: 1,
      degraded: 0,
      problems: [],
    });
    expect(model.wall).toEqual([]);
  });

  it('keeps healthy / degraded / failing counts without inventing items or problems', () => {
    const model = normalizeAssetHealth({
      agents: { total: 100 },
      categories: [{ name: 'Databases', healthy: 7, degraded: 1, failing: 1 }],
    });
    expect(model.categories[0]).toMatchObject({
      name: 'Databases',
      total: 9,
      healthy: 7,
      degraded: 1,
      failing: 1,
      items: [],
      problems: [],
    });
    const scene = buildScene(model);
    const tones = scene.tiles.filter((t) => t.cat === model.categories[0]!.id).map((t) => t.tone);
    expect(tones.filter((t) => t === 'crit').length).toBeGreaterThanOrEqual(1);
    expect(tones.filter((t) => t === 'warn').length).toBeGreaterThanOrEqual(1);
    expect(tones.filter((t) => t === 'ok').length).toBeGreaterThanOrEqual(1);
  });

  it('tints leftover failing counts after named problems (no extra beams)', () => {
    const model = normalizeAssetHealth({
      agents: { total: 50 },
      categories: [
        {
          name: 'Databases',
          healthy: 3,
          failing: 3,
          problems: [
            {
              name: 'crm-prod',
              type: 'DATABASE',
              why: 'writes blocked',
              loc: 'eu-west-1',
              sev: 'impaired',
            },
          ],
        },
      ],
    });
    const scene = buildScene(model);
    const tiles = scene.tiles.filter((t) => t.cat === model.categories[0]!.id);
    expect(tiles.filter((t) => t.problem)).toHaveLength(1);
    expect(tiles.filter((t) => t.tone === 'crit').length).toBeGreaterThanOrEqual(3);
    expect(scene.pins).toHaveLength(1);
  });

  it('labels unnamed tiles by tone, and filler tiles never claim to be healthy', () => {
    const model = normalizeAssetHealth({
      agents: { total: 50 },
      categories: [{ name: 'Databases', healthy: 1, degraded: 1, failing: 1 }],
    });
    const tiles = buildScene(model).tiles.filter((t) => t.cat === model.categories[0]!.id);
    const byTone = (tone: string) => tiles.find((t) => t.tone === tone);
    expect(byTone('crit')?.tip).toContain('Failing');
    expect(byTone('warn')?.tip).toContain('Degraded');
    expect(byTone('ok')?.tip).toContain('healthy');
    expect(byTone('neutral')).toBeTruthy();
    expect(byTone('neutral')?.tip).not.toContain('healthy');
    expect(byTone('neutral')?.tip).not.toContain('Failing');
  });

  it('omits the error wall when the payload does not send one', () => {
    const model = normalizeAssetHealth({
      goal: { total: 1204, awaiting: 0, blocked: 84, failed: 2 },
      categories: figma.categories.map((c) => ({ ...c, problems: [] })),
    });
    expect(model.wall).toEqual([]);
    expect(buildScene(model).wall).toEqual([]);
  });

  it('draws an explicit wall only when at least one slot has an error', () => {
    const model = normalizeAssetHealth({
      agents: { total: 10 },
      categories: [{ name: 'Tools', total: 2, healthy: 2 }],
      wall: [
        { slot: 3, err: true, reqs: 8, nErr: 2 },
        { slot: 10, err: false, reqs: 4 },
      ],
    });
    expect(model.wall).toHaveLength(WALL_SLOTS);
    expect(model.wall[3]).toMatchObject({ err: true, reqs: 8, nErr: 2 });
    expect(model.wall[10]).toMatchObject({ err: false, reqs: 4 });
    expect(model.wall[0]).toMatchObject({ err: false, reqs: 0 });
  });

  it('is empty without agents or without categories', () => {
    expect(normalizeAssetHealth(null).empty).toBe(true);
    expect(normalizeAssetHealth({ agents: { total: 10 } }).empty).toBe(true);
    expect(normalizeAssetHealth({ categories: [{ name: 'Tools', total: 1 }] }).empty).toBe(true);
  });
});

describe('normalizeWall', () => {
  it('reads the height / requests / errors / source aliases declared in the schema', () => {
    const wall = normalizeWall([
      {
        slot: 3,
        err: true,
        height: 44,
        requests: 9,
        errors: 2,
        source: {
          name: 'crm-prod',
          type: 'DATABASE',
          why: 'writes blocked',
          loc: 'eu-west-1',
          sev: 'warning',
          catName: 'Databases',
        },
      },
    ]);
    expect(wall[3]).toMatchObject({
      err: true,
      hgt: 44,
      reqs: 9,
      nErr: 2,
      src: { name: 'crm-prod', sev: 'degraded', catName: 'Databases' },
    });
  });

  it('reads the error / hasError aliases of the err flag declared in the schema', () => {
    const wall = normalizeWall([
      { slot: 4, error: true },
      { slot: 5, hasError: 1 },
      { slot: 6, hasError: 0 },
    ]);
    expect(wall[4]?.err).toBe(true);
    expect(wall[5]?.err).toBe(true);
    expect(wall[6]?.err).toBe(false);
  });

  it('returns empty for missing, empty, or all-clear slots', () => {
    expect(normalizeWall(undefined)).toEqual([]);
    expect(normalizeWall([])).toEqual([]);
    expect(normalizeWall([{ slot: 1, err: false }])).toEqual([]);
  });
});
