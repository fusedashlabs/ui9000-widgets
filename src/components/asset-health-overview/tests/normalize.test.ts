import { describe, expect, it } from 'vitest';

import goalRings from '../../../stories/fixtures/asset-health.goal-rings.json';
import { apportion, arenaField, arenaSectors, crewSize, normalizeAssetHealth, resampleDay } from '../lib/index.js';

describe('normalizeAssetHealth', () => {
  it('reads the goal and its categories from the goal-rings fixture', () => {
    const model = normalizeAssetHealth(goalRings);

    expect(model.empty).toBe(false);
    expect(model.title).toBe('Onboarding Velocity');
    expect(model.goal).toMatchObject({ code: 'G-007', total: 842, working: 645, idle: 22, held: 175, progress: 0.41, burn: 4.2 });
    expect(model.goal.status).toEqual({ label: 'Blocked', tone: 'blocked' });
    expect(model.sections.map((s) => s.name)).toEqual(['SYSTEM', 'APP', 'TOOL', 'HUMAN', 'MODEL']);
  });

  it('seats every agent of the goal: the held at their gates, the rest spread by calls', () => {
    const { goal, sections } = normalizeAssetHealth(goalRings);
    const sys = sections.find((s) => s.id === 'RG-SYS')!;

    expect(sys.hold).toBe('blocked');
    expect(sys.crew.held).toBe(94);
    expect(sys.health).toBe('held');
    // as the reference apportions the goal's working and over-budget agents by calls a minute
    expect(sections.map((s) => s.crew.working)).toEqual(apportion([5400, 3300, 1800, 14, 6200], 645));
    expect(sections.map((s) => s.crew.overBudget)).toEqual(apportion([5400, 3300, 1800, 14, 6200], 21));
    expect(sections.reduce((sum, s) => sum + crewSize(s), 0) + goal.idle).toBe(goal.total);
  });

  it('reads a section’s gate from its traffic, and what holds nobody as slowed', () => {
    const { sections } = normalizeAssetHealth(goalRings);
    const human = sections.find((s) => s.id === 'RG-HUMAN')!;
    const app = sections.find((s) => s.id === 'RG-APP')!;

    expect(human.mix).toEqual([
      { state: 'flowing', share: 0.4 },
      { state: 'awaiting', share: 0.6 },
    ]);
    expect(human.health).toBe('degraded');
    expect(human.crew.held).toBe(0);
    expect(app.troubles).toEqual([expect.objectContaining({ asset: 'Okta', state: 'slowed', agents: 0 })]);
  });

  it('puts named assets on their cells in the order sent, troubles among them', () => {
    const { sections } = normalizeAssetHealth(goalRings);
    const sys = sections.find((s) => s.id === 'RG-SYS')!;

    expect(sys.assets).toBe(9);
    expect(sys.named.map((n) => n.tick)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(sys.troubles.map((t) => [t.asset, t.tick])).toEqual([
      ['crm-prod', 1],
      ['hr-records', 6],
    ]);
  });

  it('keeps the 24-hour day as sent, and invents none', () => {
    const model = normalizeAssetHealth(goalRings);
    expect(model.sections.every((s) => s.day.length === 96)).toBe(true);

    const bare = normalizeAssetHealth({ goal: { total: 10 }, categories: [{ name: 'Tools', total: 3 }] });
    expect(bare.sections[0]!.day).toEqual([]);
  });

  it('reads WidgetItem rows, with the goal’s columns on a row', () => {
    const model = normalizeAssetHealth({
      chartType: 'assetHealthOverview',
      name: 'Onboarding',
      data: [
        { category: 'Applications', total: 12, agents: 100, blocked: 10, calls: 300 },
        { category: 'Databases', total: 4, calls: 100, problems: [{ name: 'crm-prod', sev: 'blocked' }] },
      ],
    });

    expect(model.empty).toBe(false);
    expect(model.goal).toMatchObject({ total: 100, blocked: 10, working: 90, name: 'Onboarding' });
    const db = model.sections.find((s) => s.name === 'Databases')!;
    // the goal's blocked agents nobody claims go to the section whose problem blocks them
    expect(db.crew.held).toBe(10);
    expect(db.hold).toBe('blocked');
  });

  it('maps free-text severities', () => {
    const { sections } = normalizeAssetHealth({
      goal: { total: 5 },
      categories: [
        {
          name: 'Mixed',
          problems: [
            { name: 'a', sev: 'warning' },
            { name: 'b', sev: 'impaired' },
            { name: 'c', sev: 'waiting on approval' },
          ],
        },
      ],
    });
    expect(sections[0]!.troubles.map((t) => t.state)).toEqual(['slowed', 'failed', 'awaiting']);
  });

  it('is empty without categories or agents', () => {
    expect(normalizeAssetHealth(null).empty).toBe(true);
    expect(normalizeAssetHealth({ goal: { total: 10 } }).empty).toBe(true);
    expect(normalizeAssetHealth({ categories: [{ name: 'Tools' }] }).empty).toBe(true);
  });
});

describe('the arena', () => {
  it('seats as many agents as the goal has, the held in their state', () => {
    const { goal, sections } = normalizeAssetHealth(goalRings);
    const sectors = arenaSectors(sections);
    const { field, crews } = arenaField(goal, sectors);
    const cloud = field.clouds[0]!;
    const size = ([from, to]: [number, number]) => to - from;

    expect(size(cloud.ranges.blocked)).toBe(94);
    expect(size(cloud.ranges.failed)).toBe(27);
    expect(size(cloud.ranges.awaiting)).toBe(33);
    expect(size(cloud.ranges.overBudget)).toBe(21);
    expect(size(cloud.ranges.idle)).toBe(22);
    expect(cloud.position.length / 3).toBe(goal.total);
    expect(Object.keys(crews).sort()).toEqual(sections.map((s) => s.id).sort());
  });

  it('gives every section room, the widest to the most agents', () => {
    const { sections } = normalizeAssetHealth(goalRings);
    const sectors = arenaSectors(sections);
    const spans = sectors.map((s) => s.a1 - s.a0);

    expect(spans.every((span) => span >= 0.3)).toBe(true);
    // SYSTEM's 94 held count with its crew: the widest section
    expect(sectors[0]!.section.id).toBe('RG-SYS');
    expect(spans[0]).toBe(Math.max(...spans));
  });

  it('cuts a sent day to fewer stretches without losing calls', () => {
    const day = [
      { calls: 10, away: 0 },
      { calls: 30, away: 0.5 },
      { calls: 20, away: 0 },
      { calls: 20, away: 0 },
    ];
    expect(resampleDay(day, 2)).toEqual([
      { calls: 40, away: 15 / 40 },
      { calls: 40, away: 0 },
    ]);
    expect(resampleDay(day, 8)).toEqual(day);
  });
});
