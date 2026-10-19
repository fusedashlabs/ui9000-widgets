import { describe, expect, it } from 'vitest';

import {
  arcPath,
  BOARD,
  cloudParticles,
  connectionStrands,
  detailGeometry,
  detailSpecks,
  goalRelations,
  LABEL_CLEARANCE,
  sectorAt,
  sectorLabelAngles,
  separateLabelBoxes,
  stateSectors,
  SUMMARY_AVOID,
  diamondSlots,
  exceptionTickCount,
  fitBoard,
  glyphsFor,
  goalFootprint,
  goalRadius,
  layoutBoard,
  markerSpots,
  normalizeGoalsPerimeter,
  particleScale,
  BOARD_PARTICLES,
  particleBudget,
  particleShares,
  unavailableLine,
} from '../lib/index.js';
import defaultFixture from '../../../stories/fixtures/goals-perimeter.default.json';
import agentsFixture from '../../../stories/fixtures/goals-perimeter.agents.json';

const model = normalizeGoalsPerimeter(defaultFixture);

describe('goal layout', () => {
  it('sizes perimeters by the square root of agents, like the design', () => {
    const layout = layoutBoard(model.goals);
    const radii = layout.placements.map((p) => Math.round(p.r));
    // Measured on the design board: 120, ~103, ~90, ~70, ~55.
    expect(radii).toEqual([120, 104, 91, 71, 55]);
    expect(goalRadius(0, 0)).toBe(70);
  });

  it('places pinned goals on the design board', () => {
    const layout = layoutBoard(model.goals);
    const perimeter = layout.byId.get('perimeter-watch')!;
    expect(perimeter.x).toBeCloseTo(0.195 * BOARD.width);
    expect(perimeter.y).toBeCloseTo(0.34 * BOARD.height);
    // Fringe leans away from the board's centre of mass: Perimeter Watch to the upper left.
    expect(Math.cos(perimeter.fringeAngle)).toBeLessThan(0);
  });

  it('lays out unpinned goals deterministically without overlapping footprints', () => {
    const goals = model.goals.map((g) => ({ ...g, position: null }));
    const a = layoutBoard(goals);
    const b = layoutBoard(goals);
    expect(a.placements).toEqual(b.placements);
    const boxes = a.placements.map(goalFootprint);
    let overlaps = 0;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const p = boxes[i]!;
        const q = boxes[j]!;
        const w = Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0);
        const h = Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0);
        if (w > 1 && h > 1) overlaps += 1;
      }
    }
    expect(overlaps).toBe(0);
  });

  it('fits the bounds into the viewport, centred and capped', () => {
    const bounds = { x0: 0, y0: 0, x1: 1000, y1: 500 };
    const fit = fitBoard(bounds, 532, 1000, 16);
    expect(fit.k).toBeCloseTo(0.5);
    expect(fit.tx).toBeCloseTo(16);
    expect(fit.ty).toBeCloseTo(375);
    expect(fitBoard(bounds, 10_000, 10_000).k).toBe(1.25);
  });
});

describe('external dependencies', () => {
  it('sit outside their goal, inside the fitted bounds', () => {
    const agents = normalizeGoalsPerimeter(agentsFixture);
    const layout = layoutBoard(agents.goals, agents.externals);
    const p = layout.placements[0]!;
    expect(layout.externals.size).toBe(3);
    for (const at of layout.externals.values()) {
      expect(Math.hypot(at.x - p.x, at.y - p.y)).toBeCloseTo(p.r + 64);
      expect(at.x).toBeGreaterThanOrEqual(layout.bounds.x0);
      expect(at.x).toBeLessThanOrEqual(layout.bounds.x1);
    }
  });
});

describe('perimeter geometry', () => {
  it('draws the arc clockwise from 12 o’clock for the health share', () => {
    expect(arcPath(0, 0, 10, 0)).toBe('');
    expect(arcPath(0, 0, 10, 0.25)).toBe('M0,-10A10,10 0 0 1 10,0');
    expect(arcPath(0, 0, 10, 0.75)).toBe('M0,-10A10,10 0 1 1 -10,0');
    expect(arcPath(0, 0, 10, 1)).toContain('A10,10 0 1 1 0,10');
  });

  it('grows exception ticks with the square root of IMPURE, up to 12', () => {
    expect([0, 1, 5, 15, 35, 159, 10_000].map(exceptionTickCount)).toEqual([0, 1, 2, 4, 6, 12, 12]);
  });

  it('gives each exception group one to four glyphs', () => {
    expect([1, 3, 7, 8, 500].map(glyphsFor)).toEqual([1, 2, 3, 4, 4]);
  });

  it('centres the diamond row and keeps markers off it', () => {
    const layout = layoutBoard(model.goals);
    const goal = model.goals[0]!;
    const p = layout.byId.get(goal.id)!;
    const slots = diamondSlots(p, goal.resourceGroups.length);
    expect(slots).toHaveLength(3);
    expect(slots[1]!.x).toBeCloseTo(p.x);
    const spots = markerSpots(goal, p);
    expect(spots.length).toBeGreaterThan(0);
    const rowHalf = (3 * slots[0]!.e * 1.9) / 2;
    for (const spot of spots) {
      const onRow = Math.abs(spot.x - p.x) < rowHalf && Math.abs(spot.y - p.y) < slots[0]!.e * 1.4;
      expect(onRow).toBe(false);
      expect(Math.hypot(spot.x - p.x, spot.y - p.y)).toBeLessThanOrEqual(p.r);
    }
    expect(markerSpots(goal, p)).toEqual(spots);
  });

  it('runs an unavailable line ring edge to ring edge with the marker between', () => {
    const layout = layoutBoard(model.goals);
    const s = layout.byId.get('perimeter-watch')!;
    const t = layout.byId.get('onboarding-velocity')!;
    const line = unavailableLine(s, t);
    expect(line.d.startsWith('M')).toBe(true);
    expect(line.mid.x).toBeGreaterThan(s.x + s.r);
    expect(line.mid.x).toBeLessThan(t.x - t.r);
  });
});

describe('canvas texture', () => {
  it('keeps the board under the SVG speck budget', () => {
    const scale = particleScale(model.goals);
    expect(scale).toBeLessThanOrEqual(1);
    const total = model.goals.reduce(
      (sum, goal) => sum + Object.values(particleShares(goal, scale)).reduce((a, b) => a + b, 0),
      0,
    );
    expect(total).toBeLessThanOrEqual(BOARD_PARTICLES + model.goals.length * 30);
    expect(particleBudget(1_000_000)).toBe(900);
  });

  it('draws one speck per agent node, and the rest of each share without one', () => {
    const agents = normalizeGoalsPerimeter(agentsFixture);
    const goal = agents.goals[0]!;
    const layout = layoutBoard(agents.goals);
    const specks = cloudParticles(goal, layout.placements[0]!, agents.agents);
    const named = specks.filter((s) => s.agentId);
    expect(named).toHaveLength(72);
    expect(new Set(named.map((s) => s.agentId)).size).toBe(72);
    const failedIds = agents.agents.filter((a) => a.state === 'failed').map((a) => a.id);
    expect(named.filter((s) => s.tone === 'failed').map((s) => s.agentId).sort()).toEqual(failedIds.sort());
  });

  it('samples agent nodes when there are more than the budget', () => {
    const many = normalizeGoalsPerimeter({
      goal: 'Big',
      agents: Array.from({ length: 3000 }, (_, i) => ({ id: `a${i}`, state: i % 10 === 0 ? 'failed' : 'healthy' })),
    });
    const layout = layoutBoard(many.goals);
    const specks = cloudParticles(many.goals[0]!, layout.placements[0]!, many.agents);
    expect(specks.length).toBeLessThanOrEqual(900);
    expect(specks.filter((s) => s.tone === 'failed').length).toBeGreaterThan(0);
  });

  it('is seeded, so repaints match', () => {
    const layout = layoutBoard(model.goals);
    const goal = model.goals[1]!;
    const p = layout.byId.get(goal.id)!;
    expect(cloudParticles(goal, p)).toEqual(cloudParticles(goal, p));
  });

  it('keeps exceptional states visible however small their share', () => {
    const goal = model.goals[4]!;
    const shares = particleShares(goal);
    expect(shares.failed).toBeGreaterThanOrEqual(6);
    expect(shares.blocked).toBeGreaterThanOrEqual(6);
    expect(shares.healthy).toBeGreaterThan(shares.failed);
  });

  it('lights a bright core at 2× or more', () => {
    const layout = layoutBoard(model.goals);
    const tones = (i: number) =>
      new Set(cloudParticles(model.goals[i]!, layout.byId.get(model.goals[i]!.id)!).map((s) => s.tone));
    expect(tones(1).has('core')).toBe(true);
    expect(tones(0).has('core')).toBe(false);
  });

  it('draws no bundle for an unavailable connection and tints a degraded one', () => {
    const layout = layoutBoard(model.goals);
    const strandsOf = (i: number) => {
      const c = model.connections[i]!;
      return connectionStrands(c, layout.byId.get(c.source)!, layout.byId.get(c.target)!);
    };
    expect(strandsOf(1)).toEqual([]);
    const degraded = strandsOf(2);
    expect(degraded).toHaveLength(10);
    expect(degraded.filter((s) => s.tone === 'exception')).toHaveLength(2);
    expect(strandsOf(0).every((s) => s.tone === 'neutral')).toBe(true);
  });
});

describe('open goal', () => {
  it('gives each state a sector, clockwise from 12 o’clock, exceptions never too thin to see', () => {
    const perimeter = model.goals[0]!;
    const sectors = stateSectors(perimeter);
    expect(sectors.map((s) => [s.state, s.count])).toEqual([
      ['healthy', 1169],
      ['blocked', 19],
      ['failed', 16],
    ]);
    for (let i = 1; i < sectors.length; i += 1) expect(sectors[i]!.start).toBeGreaterThan(sectors[i - 1]!.end);
    expect(sectors.at(-1)!.end).toBeLessThanOrEqual(Math.PI * 2);
    // 16 of 1,204 is about 5°; the sector keeps at least ~20°.
    expect(sectors[2]!.end - sectors[2]!.start).toBeGreaterThan((19 * Math.PI) / 180);
    expect(sectors[2]!.exceptions.map((e) => e.reason)).toEqual(['Sensor feed timed out after three retries']);
    expect(stateSectors({ ...perimeter, agents: { ...perimeter.agents, blocked: 0, failed: 0, healthy: 1204 } })).toEqual([
      { state: 'healthy', count: 1204, start: 0, end: Math.PI * 2, exceptions: [] },
    ]);
  });

  it('places neighbours in their direction on the board, fanned apart', () => {
    const layout = layoutBoard(model.goals);
    const relations = goalRelations(model, layout, 'perimeter-watch');
    const byLabel = new Map(relations.map((r) => [r.label, r]));
    expect([...byLabel.keys()].sort()).toEqual([
      'Maintain Verified Asset Visibility',
      'Onboarding Velocity',
      'Pipeline Quality',
    ]);
    const onboarding = byLabel.get('Onboarding Velocity')!;
    // Active strands and the link that is down, together.
    expect(onboarding.status).toBe('unavailable');
    expect(onboarding.strands).toBe(9);
    expect(onboarding.down?.reason).toBe('Threat feed to onboarding risk checks is down');
    // Onboarding is to the right of Perimeter Watch on the board.
    expect(Math.sin(onboarding.angle)).toBeGreaterThan(0.5);
    expect(byLabel.get('Maintain Verified Asset Visibility')!.status).toBe('degraded');
    const agents = normalizeGoalsPerimeter(agentsFixture);
    const ext = goalRelations(agents, layoutBoard(agents.goals, agents.externals), 'incident-response');
    expect(ext.map((r) => [r.kind, r.label, r.status]).sort()).toEqual([
      ['external', 'CMDB', 'degraded'],
      ['external', 'PagerDuty', 'unavailable'],
      ['external', 'Runbook library', 'active'],
    ]);
  });

  it('keeps sector labels off the goal’s title and summary under the perimeter', () => {
    const inZone = (a: number, avoid: number) => {
      const n = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return n > Math.PI - avoid + 1e-9 && n < Math.PI + avoid - 1e-9;
    };
    // One state is a full circle: its label goes to 12 o'clock, not 6.
    const pipeline = model.goals.find((g) => g.id === 'pipeline-quality')!;
    expect(sectorLabelAngles(stateSectors(pipeline))).toEqual([0]);
    // A sector centred under the perimeter has its label moved to the edge of the zone.
    const bottom = [{ state: 'failed' as const, count: 3, start: Math.PI - 0.2, end: Math.PI + 0.1, exceptions: [] }];
    expect(sectorLabelAngles(bottom)).toEqual([Math.PI - SUMMARY_AVOID]);
    // Every goal on the board, with a wider zone too.
    for (const goal of model.goals) {
      for (const avoid of [SUMMARY_AVOID, (70 * Math.PI) / 180]) {
        const angles = sectorLabelAngles(stateSectors(goal), avoid);
        for (const a of angles) expect(inZone(a, avoid), `${goal.id} ${a}`).toBe(false);
        const sorted = [...angles].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i += 1) {
          expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual((24 * Math.PI) / 180 - 1e-9);
        }
      }
    }
  });

  it('keeps neighbours off the goal’s summary too', () => {
    const layout = layoutBoard(model.goals);
    for (const goal of model.goals) {
      for (const relation of goalRelations(model, layout, goal.id, (60 * Math.PI) / 180)) {
        const n = ((relation.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        expect(Math.abs(n - Math.PI), `${goal.id} ${relation.label}`).toBeGreaterThanOrEqual((60 * Math.PI) / 180 - 1e-9);
      }
    }
  });

  it('keeps neighbours clear of the sector labels', () => {
    const layout = layoutBoard(model.goals);
    for (const goal of model.goals) {
      const labels = sectorLabelAngles(stateSectors(goal));
      for (const relation of goalRelations(model, layout, goal.id, SUMMARY_AVOID, labels)) {
        for (const label of labels) {
          const d = Math.abs(((relation.angle - label + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          expect(d, `${goal.id} ${relation.label}`).toBeGreaterThanOrEqual(LABEL_CLEARANCE - 1e-9);
        }
      }
    }
  });

  it('pulls overlapping label blocks apart, away from the perimeter', () => {
    // Two blocks above the centre: the higher one moves up.
    expect(
      separateLabelBoxes([
        { x0: -50, x1: 50, y0: -200, y1: -160 },
        { x0: -20, x1: 80, y0: -180, y1: -150 },
      ]),
    ).toEqual([-26, 0]);
    // Below the centre: the lower one moves down.
    expect(
      separateLabelBoxes([
        { x0: 0, x1: 100, y0: 150, y1: 190 },
        { x0: 40, x1: 140, y0: 170, y1: 200 },
      ]),
    ).toEqual([0, 26]);
    // Apart already: nothing moves.
    expect(
      separateLabelBoxes([
        { x0: -100, x1: -20, y0: -100, y1: -80 },
        { x0: 20, x1: 100, y0: -100, y1: -80 },
      ]),
    ).toEqual([0, 0]);
  });

  it('finds the sector under the pointer, inside the ring and outside the hub', () => {
    const sectors = stateSectors(model.goals[0]!);
    const r = 200;
    const point = (angle: number, dist: number) => ({ x: dist * Math.sin(angle), y: -dist * Math.cos(angle) });
    for (const sector of sectors) {
      const { x, y } = point((sector.start + sector.end) / 2, r * 0.6);
      expect(sectorAt(sectors, x, y, r)).toBe(sector.state);
    }
    // The hub, where the resource groups sit, and outside the ring: no sector.
    expect(sectorAt(sectors, 0, -r * 0.1, r)).toBeNull();
    expect(sectorAt(sectors, 0, -(r + 40), r)).toBeNull();
    // On the ring band itself, still the sector.
    const failed = sectors.find((s) => s.state === 'failed')!;
    const edge = point((failed.start + failed.end) / 2, r + 4);
    expect(sectorAt(sectors, edge.x, edge.y, r)).toBe('failed');
    // In the gap between two sectors, the nearer one.
    const gap = point(failed.start - 0.004, r * 0.6);
    expect(sectorAt(sectors, gap.x, gap.y, r)).toBe('failed');
  });

  it('puts every speck in its state’s sector, inside the perimeter', () => {
    const agents = normalizeGoalsPerimeter(agentsFixture);
    const goal = agents.goals[0]!;
    const sectors = stateSectors(goal);
    const specks = detailSpecks(goal, agents.agents, sectors, 200);
    expect(specks.filter((s) => s.agentId)).toHaveLength(72);
    for (const speck of specks) {
      const sector = sectors.find((s) => s.state === speck.tone)!;
      const angle = (Math.atan2(speck.x, -speck.y) + Math.PI * 2) % (Math.PI * 2);
      expect(angle).toBeGreaterThanOrEqual(sector.start - 1e-6);
      expect(angle).toBeLessThanOrEqual(sector.end + 1e-6);
      expect(Math.hypot(speck.x, speck.y)).toBeLessThanOrEqual(200);
    }
  });

  it('sizes the open perimeter to the plot, with room around it', () => {
    const geo = detailGeometry(1000, 640);
    expect(geo.cx).toBe(500);
    // The band under the way back stays clear of the perimeter.
    expect(geo.cy - geo.r).toBeGreaterThan(36 + 30);
    expect(geo.r).toBeGreaterThan(150);
    expect(geo.relationRadius).toBeGreaterThan(geo.r + 80);
    expect(detailGeometry(200, 200).r).toBe(60);
  });
});
