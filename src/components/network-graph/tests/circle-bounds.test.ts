import { describe, expect, it } from 'vitest';

import type { SimNode } from '../lib/layout-types.js';
import { forceCircleBounds } from '../lib/circle-bounds.js';

const run = (node: SimNode, limit = 100) => {
  const force = forceCircleBounds(0, 0, () => limit, 0.12);
  force.initialize([node]);
  force();
  return node;
};

describe("forceCircleBounds", () => {
  it("puts a node that left the circle back on its edge", () => {
    const node = run({ id: "a", x: 150, y: 0, vx: 0, vy: 0 } as SimNode);
    expect(node.x).toBeCloseTo(100);
    expect(node.y).toBeCloseTo(0);
  });

  it("stops the outward motion but lets the node slide along the edge", () => {
    // Pushed out to the right while moving down: neighbours on the edge
    // can only make room for each other by sliding along it.
    const node = run({ id: "a", x: 150, y: 0, vx: 5, vy: 3 } as SimNode);
    expect(node.vx).toBeCloseTo(0);
    expect(node.vy).toBeCloseTo(3);
  });

  it("keeps an inward motion", () => {
    const node = run({ id: "a", x: 150, y: 0, vx: -4, vy: 0 } as SimNode);
    expect(node.vx).toBeCloseTo(-4);
  });

  it("leaves nodes inside the circle alone", () => {
    const node = run({ id: "a", x: 50, y: 0, vx: 5, vy: 3 } as SimNode);
    expect(node).toMatchObject({ x: 50, y: 0, vx: 5, vy: 3 });
  });

  it("stops a step that would cross the edge on it", () => {
    // 10 inside the edge, moving out by 25 and along it by 4.
    const node = run({ id: "a", x: 90, y: 0, vx: 25, vy: 4 } as SimNode);
    expect(node.vx).toBeCloseTo(10);
    expect(node.vy).toBeCloseTo(4);
    expect(node.x).toBe(90);
  });

  it("lets a node pushed out by a dragged one glide back, not jump", () => {
    const pushed = { id: "a", x: 150, y: 0, vx: 0, vy: 0 } as SimNode;
    const dragged = { id: "b", x: 90, y: 0, fx: 90, fy: 0 } as SimNode;
    const force = forceCircleBounds(
      0,
      0,
      () => 100,
      0.12,
      (node) => node.id === "a"
    );
    force.initialize([pushed, dragged]);
    force();
    // 12% of the 50 outside, not straight back to 100 (onto the dragged).
    expect(pushed.x).toBeCloseTo(144);
    // Released, it keeps gliding instead of jumping to the edge.
    dragged.fx = null;
    dragged.fy = null;
    force();
    expect(pushed.x).toBeGreaterThan(100);
  });
});
