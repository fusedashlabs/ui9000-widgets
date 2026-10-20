import { describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/reasoning-orchestration.default.json';
import {
  breadthByDepth,
  layoutOrchestration,
  normalizeReasoningOrchestration,
  PAD_BOTTOM,
  PAD_TOP,
} from '../lib/index.js';

const W = 880;
const H = 520;

describe('layoutOrchestration', () => {
  const model = normalizeReasoningOrchestration(fixture);
  const layout = layoutOrchestration(model, W, H);

  it('puts the root at the bottom centre and every node inside the plot', () => {
    expect(layout.primaryRoot).toBe('prompt');
    const root = layout.nodes.get('prompt')!;
    expect(root.x).toBe(W / 2);
    expect(root.y).toBe(H - PAD_BOTTOM);
    expect(layout.nodes.size).toBe(model.nodes.length);
    for (const node of layout.nodes.values()) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(W);
      expect(node.y).toBeGreaterThanOrEqual(PAD_TOP - 1);
      expect(node.y).toBeLessThanOrEqual(H - PAD_BOTTOM + 0.01);
    }
  });

  it('spans the plot with the widest stage and climbs deeper stages toward the top', () => {
    const frontier = model.nodes.filter((n) => n.depth >= 6 && n.depth <= 8).map((n) => layout.nodes.get(n.id)!);
    const xs = frontier.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(W * 0.8);
    const end = layout.nodes.get('r14')!;
    expect(end.y).toBeLessThan(H * 0.15);
    // Deeper reaches higher along the active path.
    const path = model.paths.find((p) => p.id === 'refine')!.nodes.map((id) => layout.nodes.get(id)!.y);
    for (let i = 1; i < path.length; i += 1) expect(path[i]!).toBeLessThan(path[i - 1]!);
  });

  it('grows the other roots as small fans on the baseline, either side of the centre', () => {
    expect(layout.fans.map((f) => f.root)).toEqual(['resample-1', 'resample-2', 'resample-3']);
    for (const fan of layout.fans) {
      expect(Math.abs(fan.x - W / 2)).toBeGreaterThan(W * 0.1);
      const root = layout.nodes.get(fan.root)!;
      expect(root.y).toBe(H - PAD_BOTTOM);
      expect(root.fan).toBeGreaterThanOrEqual(0);
    }
    const leaf = layout.nodes.get('resample-1.1.1')!;
    expect(H - PAD_BOTTOM - leaf.y).toBeLessThanOrEqual(layout.fans[0]!.radius * 1.3 + 0.01);
  });

  it('places the same ids at the same points every time', () => {
    const again = layoutOrchestration(model, W, H);
    expect(again.nodes.get('s3a-f2')).toEqual(layout.nodes.get('s3a-f2'));
  });

  it('keeps the layout when stages are added or candidate paths removed', () => {
    const fewer = normalizeReasoningOrchestration({ ...fixture, paths: fixture.paths.slice(0, 1) });
    const fewerNodes = layoutOrchestration(fewer, W, H).nodes;
    // A removed path's own nodes lose the path's steadier jitter; everything else stays put.
    const removed = new Set(fixture.paths.slice(1).flatMap((path) => path.nodes));
    const active = new Set(fixture.paths[0]!.nodes);
    for (const [id, placed] of layout.nodes) {
      if (removed.has(id) && !active.has(id)) {
        expect(fewerNodes.get(id)!.angle).toBe(placed.angle);
      } else {
        expect(fewerNodes.get(id)).toEqual(placed);
      }
    }
    const stages = [...fixture.stages, { id: 'extra', label: 'Extra', depth: [15, 15] }];
    const more = layoutOrchestration(normalizeReasoningOrchestration({ ...fixture, stages }), W, H);
    expect(more.nodes).toEqual(layout.nodes);
  });

  it('counts nodes at each depth for the top chart', () => {
    const breadth = breadthByDepth(model);
    expect(breadth).toHaveLength(15);
    expect(breadth.reduce((a, b) => a + b, 0)).toBe(model.nodes.length);
    expect(Math.max(...breadth.slice(6, 9))).toBeGreaterThan(breadth[12]!);
  });
});
