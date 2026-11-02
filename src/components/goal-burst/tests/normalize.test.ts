import { describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/goal-burst.default.json';
import { assetCount, PIVOT_X } from '../../asset-health-overview/lib/index.js';
import { BURST, burstSectors, burstSlots, formatSeconds, normalizeGoalBurst, timeRadius } from '../lib/index.js';
import { cornerLines } from '../render/index.js';

const model = normalizeGoalBurst(defaultFixture);
const sectors = burstSectors(model);
const sector = (id: string) => sectors.find((s) => s.group.section.id === id)!;

describe('normalizeGoalBurst', () => {
  it('reads the goal and its groups as the asset health overview does, with each group’s kind and answer time', () => {
    expect(model.empty).toBe(false);
    expect(model.title).toBe('Onboarding Velocity');
    expect(model.goal).toMatchObject({ code: 'G-007', total: 842, held: 175, progress: 0.41, burn: 4.2 });
    expect(model.groups.map((g) => [g.section.id, g.kind])).toEqual([
      ['RG-SYS', 'system'],
      ['RG-APP', 'app'],
      ['RG-TOOL', 'tool'],
      ['RG-HUMAN', 'human'],
      ['RG-MODEL', 'model'],
    ]);
    expect(model.groups.map((g) => g.latency)).toEqual([
      { p50: 0.24, p95: 0.7 },
      { p50: 0.3, p95: 0.9 },
      { p50: 0.62, p95: 1.5 },
      { p50: 180, p95: 900 },
      { p50: 0.9, p95: 2.1 },
    ]);
    expect(model.groups[0]).toMatchObject({ bytes: 12800000, sharedWith: 2 });
    expect(model.groupTotal).toBe(21);
    expect(cornerLines(model)).toEqual(['5 of 21 resource groups', '56 assets · 16.7K calls /min']);
  });

  it('reads a group’s kind from its name, names its assets by it, and takes the answer times sent', () => {
    const bare = normalizeGoalBurst({
      goal: defaultFixture.goal,
      categories: [
        { name: 'Systems of record', total: 9, calls: 5400, latency: { p95: '1.4s' } },
        { name: 'AI models', total: 1, calls: 6200, latency: { p50: '240ms', p95: 0.7 } },
        { name: 'Ledger', total: 3, calls: 10 },
      ],
    });
    expect(bare.groups.map((g) => g.kind)).toEqual(['system', 'model', null]);
    expect(bare.groups.map((g) => assetCount(g.section))).toEqual(['9 systems of record', '1 model', '3 assets']);
    expect(bare.groups[0]!.latency.p95).toBe(1.4);
    expect(bare.groups[0]!.latency.p50).toBeCloseTo(0.48);
    expect(bare.groups[1]!.latency).toEqual({ p50: 0.24, p95: 0.7 });
    expect(bare.groups[2]!.latency).toEqual({ p50: 0.3, p95: 0.9 });
    // no fleet total: the corner counts only the groups drawn
    expect(bare.groupTotal).toBe(3);
    expect(cornerLines(bare)[0]).toBe('3 resource groups');
  });

  it('is empty without a goal or groups', () => {
    expect(normalizeGoalBurst(null).empty).toBe(true);
    expect(normalizeGoalBurst({ goal: defaultFixture.goal, categories: [] }).empty).toBe(true);
  });
});

describe('the burst', () => {
  it('cuts the floor into a sector per group, as wide as its share of the calls, the busiest first', () => {
    expect(sectors.map((s) => s.group.section.id)).toEqual(['RG-MODEL', 'RG-SYS', 'RG-APP', 'RG-TOOL', 'RG-HUMAN']);
    const span = (id: string) => sector(id).a1 - sector(id).a0;
    expect(span('RG-MODEL')).toBeGreaterThan(span('RG-SYS'));
    expect(span('RG-SYS')).toBeGreaterThan(span('RG-TOOL'));
    // however few calls a group takes, its sector has room for its spikes
    expect(span('RG-HUMAN')).toBeGreaterThan(0.25);
  });

  it('throws a spike a call, in the group’s own mix, as long as the call took to be answered', () => {
    const sys = sector('RG-SYS');
    const count = (state: string) => sys.spikes.filter((s) => s.state === state).length;
    expect([count('flowing'), count('awaiting'), count('blocked')]).toEqual([60, 7, 30]);
    for (const spike of sys.spikes.filter((s) => s.seconds !== null)) {
      const reach = Math.hypot(spike.to[0] - PIVOT_X, spike.to[2]);
      expect(reach).toBeCloseTo(timeRadius(spike.seconds!), 3);
    }
    // nineteen in twenty of a system of record's calls are answered within about 0.7s
    expect(sys.p95).toBeGreaterThan(0.5);
    expect(sys.p95).toBeLessThan(0.9);
  });

  it('runs the calls that do not get through out to the asset that stops them, by the agents it holds', () => {
    const sys = sector('RG-SYS');
    const to = (asset: string) => sys.spikes.filter((s) => s.trouble === sys.group.section.troubles.find((t) => t.asset === asset)!.key).length;
    // 30 blocked and 7 awaiting, shared 84 : 10 between crm-prod and hr-records
    expect(to('crm-prod')).toBe(27 + 6);
    expect(to('hr-records')).toBe(3 + 1);
    for (const spike of sys.spikes.filter((s) => s.seconds === null)) {
      expect(Math.hypot(spike.to[0] - PIVOT_X, spike.to[2])).toBeGreaterThan(BURST.band - 6);
    }
    // a throttled call is answered late, towards the asset that slows it
    const app = sector('RG-APP');
    const okta = app.group.section.troubles[0]!.key;
    const throttled = app.spikes.filter((s) => s.state === 'throttled');
    expect(throttled.every((s) => s.trouble === okta)).toBe(true);
    const late = throttled.map((s) => s.seconds!).sort((a, b) => a - b)[Math.floor(throttled.length / 2)]!;
    expect(late).toBeGreaterThan(app.group.latency.p50 * 2);
  });

  it('gives the painter a slot for each sector’s calls and one for each asset in trouble', () => {
    const slots = burstSlots(sectors);
    expect(slots).toHaveLength(5 + 6);
    const held = slots.filter((s) => s.trouble === 1);
    expect(held.map((s) => s.hold ?? 'slowed').sort()).toEqual(['awaiting', 'blocked', 'blocked', 'failed', 'slowed', 'slowed']);
  });

  it('reads the clock in its own words', () => {
    expect(timeRadius(0.1)).toBe(112);
    expect(timeRadius(600)).toBe(BURST.over);
    expect([0.08, 0.5, 0.9, 2.1, 12.4, 180, 900].map(formatSeconds)).toEqual(['80ms', '0.5s', '0.9s', '2.1s', '12s', '3m', '15m']);
  });
});
