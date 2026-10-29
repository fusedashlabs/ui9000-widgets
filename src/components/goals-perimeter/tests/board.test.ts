import { describe, expect, it } from 'vitest';

import {
  buildAgentField,
  camPose,
  createCalloutLayout,
  createSatelliteNamer,
  DEFAULT_CAMERA,
  deriveConnections,
  fieldCounts,
  fitScene,
  goalOrbits,
  goalSatellites,
  groupSlot,
  LINK_SAMPLES,
  linkPoints,
  layoutBoard,
  normalizeGoalsPerimeter,
  orbitItems,
  orbitPoint,
  placeCallout,
  standingCallouts,
  projector,
  ringTicks,
  sceneGoals,
  sceneLinks,
  sceneView,
  tickStep,
  wrapYaw,
  zoomCamera,
} from '../lib/index.js';
import defaultFixture from '../../../stories/fixtures/goals-perimeter.default.json';
import agentsFixture from '../../../stories/fixtures/goals-perimeter.agents.json';
import * as shaders from '../render/gl/shaders.js';

const model = normalizeGoalsPerimeter(defaultFixture);
const layout = layoutBoard(model.goals);
const connections = deriveConnections(model, layout);
const goals = sceneGoals(model, layout);
const links = sceneLinks(goals, connections);
const items = orbitItems(goals, links, model.externals);
const pair = (c: { source: string; target: string }) => [c.source, c.target].sort().join(' + ');

describe('camera', () => {
  it('turns the board about its pivot, flat and without perspective in 2D', () => {
    const P = projector(camPose('3D', { yaw: 0, pitch: 0 }));
    expect(P(640, 300, 0)).toEqual({ x: 640, y: 300, k: 1, z: 0 });
    // further away is smaller
    expect(P(740, 300, 300).k).toBeLessThan(1);
    const plan = projector(camPose('2D', DEFAULT_CAMERA));
    const p = plan(900, 100, 400);
    expect(p.x).toBeCloseTo(900);
    expect(p.y).toBeCloseTo(100);
  });

  it('wraps yaw and zooms about the centre within its limits', () => {
    expect(wrapYaw(Math.PI * 2.5)).toBeCloseTo(Math.PI / 2);
    expect(wrapYaw(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
    expect(zoomCamera({ ...DEFAULT_CAMERA, panX: 10 }, 2)).toEqual({ zoom: 2, panX: 20, panY: 0 });
    expect(zoomCamera(DEFAULT_CAMERA, 100).zoom).toBe(4);
    expect(zoomCamera(DEFAULT_CAMERA, 0.01).zoom).toBe(0.5);
  });

  it('fits the design space to the map window and maps it both ways', () => {
    const fit = fitScene({ width: 1336, height: 640 }, { x0: 56, y0: 0, x1: 1336, y1: 640 });
    expect(fit.scale).toBeCloseTo(1.03);
    const view = sceneView(fit, DEFAULT_CAMERA);
    expect(view.toX(640)).toBeCloseTo(fit.cx);
    expect(view.fromX(view.toX(123))).toBeCloseTo(123);
    expect(view.unit).toBeCloseTo(1 / view.scale);
    // never drawn past 160%, however large the plot
    expect(fitScene({ width: 4000, height: 2000 }, { x0: 0, y0: 0, x1: 4000, y1: 2000 }).scale).toBe(1.6);
  });
});

describe('links', () => {
  it('joins goals through the groups they share, the shortest tree per group, a group every goal uses left out', () => {
    expect(connections.map((c) => [c.via, pair(c)])).toEqual([
      ['camera', 'maintain-verified-asset-visibility + perimeter-watch'],
      ['system', 'incident-response + perimeter-watch'],
      ['system', 'onboarding-velocity + perimeter-watch'],
      ['tool', 'maintain-verified-asset-visibility + onboarding-velocity'],
      ['tool', 'onboarding-velocity + pipeline-quality'],
      ['human', 'incident-response + onboarding-velocity'],
      ['store', 'maintain-verified-asset-visibility + pipeline-quality'],
    ]);
    expect(connections.some((c) => c.via === 'model')).toBe(false);
  });

  it('takes the colour of a hold both ends share: the crashing tool, as in the design', () => {
    const held = connections.filter((c) => c.hold);
    expect(held.map((c) => [c.via, c.hold, pair(c)])).toEqual([
      ['tool', 'failed', 'maintain-verified-asset-visibility + onboarding-velocity'],
    ]);
  });

  it('draws payload links through a group the two goals share, or from a bare point when they share none', () => {
    const given = normalizeGoalsPerimeter({
      goals: [
        { name: 'A', resourceGroups: [{ name: 'Model' }, { name: 'Tool', state: 'failed', held: 3 }] },
        { name: 'B', resourceGroups: [{ name: 'Model' }, { name: 'Tool', state: 'failed', held: 2 }] },
        { name: 'C', resourceGroups: [{ name: 'Model' }] },
      ],
      links: [
        { source: 'A', target: 'B', status: 'degraded' },
        { source: 'B', target: 'C' },
      ],
    });
    const at = layoutBoard(given.goals);
    const out = deriveConnections(given, at);
    // A and B share Tool and Model; Tool, which not every goal uses, is the one the line runs through
    expect(out.map((c) => [pair(c), c.via, c.hold, c.status])).toEqual([
      ['a + b', 'tool', 'failed', 'degraded'],
      ['b + c', 'model', null, 'active'],
    ]);
    const bare = normalizeGoalsPerimeter({ goals: [{ name: 'A' }, { name: 'B' }], links: [{ source: 'A', target: 'B' }] });
    const [link] = sceneLinks(sceneGoals(bare, layoutBoard(bare.goals)), deriveConnections(bare, layoutBoard(bare.goals)));
    expect(link!.aSlot).toMatch(/^port:/);
  });

  it('runs a link between its diamonds, bowed clear of both goals', () => {
    const orbits = goalOrbits(goals, links, items, false);
    const tool = links.find((l) => l.connection.hold === 'failed')!;
    const points = linkPoints(tool, orbits, 42, 34, false);
    expect(points).toHaveLength(LINK_SAMPLES + 1);
    const slot = orbits[tool.a.id]!.find((s) => s.key === groupSlot('tool'))!;
    const end = orbitPoint(tool.a, tool.a.r + 42, slot.angle, false);
    points[0]!.forEach((v, i) => expect(v).toBeCloseTo(end[i]!));
    const P = projector(camPose('3D', DEFAULT_CAMERA));
    for (const g of [tool.a, tool.b]) {
      const c = P(g.x, g.y, g.z);
      for (const p of points.slice(4, -4)) {
        const q = P(...p);
        expect(Math.hypot(q.x - c.x, q.y - c.y)).toBeGreaterThan(g.r * c.k);
      }
    }
  });
});

describe('orbits', () => {
  const orbits = goalOrbits(goals, links, items, false);

  it('carries each goal’s resource groups, the side facing its partners for those it shares', () => {
    expect(orbits['onboarding-velocity']!.map((s) => s.key)).toEqual(['rg:app', 'rg:system', 'rg:tool', 'rg:model', 'rg:human']);
    // seen from the resting camera, Perimeter Watch's shared groups face right, towards their partners
    const rest = camPose('3D', DEFAULT_CAMERA);
    const seen = (key: string) => Math.cos(orbits['perimeter-watch']!.find((s) => s.key === key)!.angle + rest.yaw);
    expect(seen('rg:camera')).toBeGreaterThan(0.5);
    expect(seen('rg:system')).toBeGreaterThan(0.5);
    // the unshared Model takes the emptier, outer side
    expect(seen('rg:model')).toBeLessThan(-0.5);
  });

  it('lays a plan view’s orbit flat, every item on its own place', () => {
    const flat = goalOrbits(goals, links, items, true);
    for (const g of goals) {
      const angles = flat[g.id]!.map((s) => s.angle);
      expect(new Set(angles.map((a) => a.toFixed(3))).size).toBe(angles.length);
    }
  });

  it('marks each diamond by how its goal fares there, with the held count beside the name', () => {
    const P = projector(camPose('3D', DEFAULT_CAMERA));
    const g = goals.find((s) => s.id === 'onboarding-velocity')!;
    const satellites = goalSatellites(g, orbits[g.id]!, P, false, 1, (x, y) => ({ x, y }));
    expect(satellites.map((s) => [s.name, s.held, s.health, s.hold])).toEqual([
      ['APP', 0, 'degraded', null],
      ['SYSTEM', 94, 'held', 'blocked'],
      ['TOOL', 27, 'held', 'failed'],
      ['MODEL', 33, 'held', 'awaiting'],
      ['HUMAN', 0, 'degraded', null],
    ]);
  });

  it('names diamonds clear of each other, and keeps the names while the view only drifts', () => {
    const P = projector(camPose('3D', DEFAULT_CAMERA));
    const named = goals.map((g) => {
      const c = P(g.x, g.y, g.z);
      return { id: g.id, x: c.x, y: c.y, r: g.r * c.k, satellites: goalSatellites(g, orbits[g.id]!, P, false, 1, (x, y) => ({ x, y })) };
    });
    const namer = createSatelliteNamer();
    namer(named, {}, 'rest');
    const placed = named.flatMap((g) => g.satellites.map((s) => [s.labelX, s.labelY, s.anchor]));
    namer(named, {}, 'rest');
    expect(named.flatMap((g) => g.satellites.map((s) => [s.labelX, s.labelY, s.anchor]))).toEqual(placed);
  });
});

describe('ring', () => {
  it('ticks every 1–10% depending on the room, a longer tick every tenth', () => {
    expect(tickStep(1000)).toBe(0.01);
    expect(tickStep(200)).toBe(0.05);
    expect(tickStep(40)).toBe(0.1);
    const d = ringTicks(0, 0, 100, 3, 6.5, 0.1, 0, 1);
    const ticks = d.split('M').filter(Boolean);
    expect(ticks).toHaveLength(10);
    // 12 o'clock is a tenth: the long tick runs from 100 to 106.5 straight up
    expect(ticks[0]).toBe('0.0 -100.0L0.0 -106.5');
  });
});

describe('callouts', () => {
  const frame = { x0: 0, y0: 0, x1: 1200, y1: 800 };

  it('leaves the ring on a diagonal to the lower right when nothing is in the way', () => {
    const layout = createCalloutLayout(() => 0);
    const [c] = layout.layout([{ id: 'a', x: 400, y: 300, r: 80, width: 186 }], { circles: [], rects: [], points: [], frame }, 77);
    expect(c!.corner).toBe('se');
    expect(c!.side).toBe(1);
    expect(c!.rect.x0).toBeGreaterThan(c!.hx);
  });

  it('moves off another goal, a link and the edge of the window', () => {
    const layout = createCalloutLayout(() => 0);
    const spec = { id: 'a', x: 400, y: 300, r: 80, width: 186 };
    const se = placeCallout(spec, 'se', 77, frame);
    const [c] = layout.layout(
      [spec],
      { circles: [{ id: 'b', x: (se.rect.x0 + se.rect.x1) / 2, y: (se.rect.y0 + se.rect.y1) / 2, r: 60 }], rects: [], points: [], frame },
      77,
    );
    expect(c!.corner).not.toBe('se');
    const [edge] = createCalloutLayout(() => 0).layout([{ id: 'c', x: 1100, y: 300, r: 60, width: 186 }], { circles: [], rects: [], points: [], frame }, 77);
    expect(edge!.side).toBe(-1);
  });

  it('keeps labels apart, and cross-fades a callout that changes corner', () => {
    let now = 0;
    const layout = createCalloutLayout(() => now);
    const specs = [
      { id: 'a', x: 300, y: 300, r: 60, width: 186 },
      { id: 'b', x: 330, y: 460, r: 40, width: 186 },
    ];
    const placed = layout.layout(specs, { circles: [], rects: [], points: [], frame }, 77, 'one');
    const [a, b] = placed.map((c) => c.rect);
    const apart = a!.x1 < b!.x0 || b!.x1 < a!.x0 || a!.y1 < b!.y0 || b!.y1 < a!.y0;
    expect(apart).toBe(true);
    // the same view keeps the same corners
    expect(layout.layout(specs, { circles: [], rects: [], points: [], frame }, 77, 'one').map((c) => c.corner)).toEqual(placed.map((c) => c.corner));
    // a goal moved under its label: the label moves, fading in while the old place fades out
    now = 1000;
    const blocker = { id: 'x', x: (placed[0]!.rect.x0 + placed[0]!.rect.x1) / 2, y: (placed[0]!.rect.y0 + placed[0]!.rect.y1) / 2, r: 70 };
    const moved = layout.layout(specs, { circles: [blocker], rects: [], points: [], frame }, 77, 'two');
    expect(moved[0]!.corner).not.toBe(placed[0]!.corner);
    expect(moved[0]!.fade).toBe(0);
    expect(moved[0]!.leaving?.corner).toBe(placed[0]!.corner);
    expect(layout.changing()).toBe(true);
  });
});

describe('tiny boards', () => {
  it('keep only the callouts that can stand, the largest goals’ first', () => {
    const frame = { x0: 0, y0: 0, x1: 400, y1: 400 };
    const big = placeCallout({ id: 'big', x: 100, y: 100, r: 30, width: 120 }, 'se', 36, frame);
    const small = placeCallout({ id: 'small', x: 110, y: 110, r: 10, width: 120 }, 'se', 36, frame);
    const apart = placeCallout({ id: 'apart', x: 100, y: 300, r: 10, width: 120 }, 'se', 36, frame);
    const circles = [
      { id: 'big', x: 100, y: 100, r: 40 },
      { id: 'small', x: 110, y: 110, r: 20 },
      { id: 'apart', x: 100, y: 300, r: 20 },
    ];
    expect([...standingCallouts([big, small, apart], circles, ['big', 'small', 'apart'])]).toEqual(['big', 'apart']);
    // a label reaching into another goal steps aside too
    const onGoal = [...circles, { id: 'x', x: (big.rect.x0 + big.rect.x1) / 2, y: (big.rect.y0 + big.rect.y1) / 2, r: 5 }];
    expect(standingCallouts([big], onGoal, ['big']).has('big')).toBe(false);
    // and one running out of the map window
    expect(standingCallouts([big], circles, ['big'], { x0: 0, y0: 0, x1: big.rect.x1 - 1, y1: 400 }).has('big')).toBe(false);
  });
});

describe('agent field', () => {
  it('draws every agent of the design board, one point each, by state', () => {
    const field = buildAgentField(goals);
    const onboarding = field.clouds.find((c) => c.goal.id === 'onboarding-velocity')!;
    const count = (state: keyof typeof onboarding.ranges) => onboarding.ranges[state][1] - onboarding.ranges[state][0];
    expect(['healthy', 'idle', 'awaiting', 'blocked', 'failed', 'degraded'].map((s) => count(s as never))).toEqual([645, 22, 33, 94, 27, 21]);
    expect(onboarding.position).toHaveLength(842 * 3);
    // every agent inside its goal
    for (let i = 0; i < 842; i += 1) {
      const d = Math.hypot(onboarding.position[i * 3]!, onboarding.position[i * 3 + 1]!, onboarding.position[i * 3 + 2]!);
      expect(d).toBeLessThanOrEqual(onboarding.goal.r);
    }
    // seeded: the same data, the same cloud
    expect(buildAgentField(goals).clouds[0]!.position).toEqual(field.clouds[0]!.position);
  });

  it('samples a board past its budget alike in every state, keeping each held state', () => {
    const big = normalizeGoalsPerimeter({ goals: [{ name: 'Big', agents: { total: 60_000, failed: 3, awaiting: 4000 } }] });
    const counts = fieldCounts(sceneGoals(big, layoutBoard(big.goals)), 6000)['big']!;
    expect(counts.failed).toBe(1);
    expect(counts.awaiting).toBe(400);
    expect(counts.healthy).toBe(5600);
    const agents = normalizeGoalsPerimeter(agentsFixture);
    expect(fieldCounts(sceneGoals(agents, layoutBoard(agents.goals)))['incident-response']!.healthy).toBe(agents.goals[0]!.agents.healthy);
  });

  it('gives a board of nine goals nine clouds, and the WebGL picture a place for every goal, link and slot', () => {
    const nine = normalizeGoalsPerimeter({
      goals: Array.from({ length: 9 }, (_, i) => ({ name: `Goal ${i + 1}`, agents: { total: 40 + i, blocked: 2 } })),
    });
    const field = buildAgentField(sceneGoals(nine, layoutBoard(nine.goals)));
    expect(field.clouds.map((c) => c.position.length / 3)).toEqual(nine.goals.map((g) => g.agents.total));
    // no shader array stops at a fixed count of goals, links or call slots: the renderer sizes them to the board
    const sized = new Set(Object.values(shaders).join('\n').match(/uniform \w+ u(Goal|Light|Scale|Slot|Link)\w*\[\w+\]/g));
    expect(sized.size).toBe(12);
    for (const line of sized) expect(line).toMatch(/\[(GOALS|LINKS|SLOTS)\]$/);
  });
});
