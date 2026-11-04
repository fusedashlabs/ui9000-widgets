import { describe, expect, it } from 'vitest';

import type { SimNode } from '../lib/layout-types.js';

import {
  forceBoxCollide,
  forceDragPush,
  separateFootprints,
} from '../lib/box-collide.js';
import type { Footprint } from '../lib/label-layout.js';

const BOX: Footprint = { halfWidth: 50, top: 20, bottom: 60 };

const node = (id: string, x: number, y: number, extra = {}) =>
  ({ id, x, y, vx: 0, vy: 0, ...extra } as SimNode);

const run = (nodes: SimNode[], boxOf: (n: SimNode) => Footprint) => {
  const force = forceBoxCollide(boxOf);
  force.initialize(nodes);
  force();
  return nodes;
};

const overlaps = (
  a: SimNode,
  b: SimNode,
  boxA: Footprint,
  boxB: Footprint
) =>
  Math.min(a.x! + boxA.halfWidth, b.x! + boxB.halfWidth) -
    Math.max(a.x! - boxA.halfWidth, b.x! - boxB.halfWidth) >
    0.5 &&
  Math.min(a.y! + boxA.bottom, b.y! + boxB.bottom) -
    Math.max(a.y! - boxA.top, b.y! - boxB.top) >
    0.5;

describe("forceBoxCollide", () => {
  it("pushes side by side names apart sideways", () => {
    const [left, right] = run([node("a", 0, 0), node("b", 80, 0)], () => BOX);
    // 20 of overlap, shared by two boxes of one size.
    expect(left.vx).toBeCloseTo(-10);
    expect(right.vx).toBeCloseTo(10);
    expect(left.vy).toBe(0);
  });

  it("pushes a node off the name above it", () => {
    // The lower node starts 70 below: 10 into the name of the upper one.
    const [upper, lower] = run([node("a", 0, 0), node("b", 10, 70)], () => BOX);
    expect(upper.vy).toBeCloseTo(-5);
    expect(lower.vy).toBeCloseTo(5);
    expect(upper.vx).toBe(0);
  });

  it("moves the smaller box further", () => {
    const small = { halfWidth: 20, top: 20, bottom: 60 };
    const [big, little] = run([node("a", 0, 0), node("b", 60, 0)], (n) =>
      n.id === "a" ? BOX : small
    );
    // 10 of overlap; the big box is 2.5 times the small one.
    expect(big.vx).toBeCloseTo(-10 / 3.5);
    expect(little.vx).toBeCloseTo((10 * 2.5) / 3.5);
  });

  it("leaves a dragged node where it is", () => {
    const [held, other] = run(
      [node("a", 0, 0, { fx: 0, fy: 0 }), node("b", 80, 0)],
      () => BOX
    );
    expect(held.vx).toBe(0);
    expect(other.vx).toBeCloseTo(20);
  });

  it("leaves boxes that do not touch alone", () => {
    const [a, b] = run([node("a", 0, 0), node("b", 101, 0)], () => BOX);
    expect([a.vx, a.vy, b.vx, b.vy]).toEqual([0, 0, 0, 0]);
  });

  it("settles a crowd without any overlap", () => {
    // Same steps as d3: forces, then x += vx *= 0.6.
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const boxes = new Map<string, Footprint>();
    const nodes = Array.from({ length: 40 }, (_, index) => {
      const id = String(index);
      boxes.set(id, {
        halfWidth: 20 + random() * 80,
        top: 10 + random() * 20,
        bottom: 30 + random() * 40,
      });
      return node(id, random() * 300, random() * 300);
    });
    const force = forceBoxCollide((n) => boxes.get(n.id) as Footprint);
    force.initialize(nodes);
    for (let tick = 0; tick < 300; tick++) {
      force();
      nodes.forEach((n) => {
        n.vx = (n.vx ?? 0) * 0.6;
        n.vy = (n.vy ?? 0) * 0.6;
        n.x = (n.x ?? 0) + n.vx;
        n.y = (n.y ?? 0) + n.vy;
      });
    }
    const pairs = nodes.flatMap((a, i) =>
      nodes
        .slice(i + 1)
        .filter((b) =>
          overlaps(
            a,
            b,
            boxes.get(a.id) as Footprint,
            boxes.get(b.id) as Footprint
          )
        )
    );
    expect(pairs).toHaveLength(0);
  });
});

describe("forceDragPush", () => {
  const push = (nodes: SimNode[]) => {
    const force = forceDragPush(() => BOX);
    force.initialize(nodes);
    force();
    return nodes;
  };

  it("moves what overlaps a dragged node out at once", () => {
    const [held, other] = push([
      node("a", 0, 0, { fx: 0, fy: 0 }),
      node("b", 80, 0),
    ]);
    expect([held.x, held.vx]).toEqual([0, 0]);
    // 20 of overlap, all of it on the other node, by position.
    expect(other.x).toBeCloseTo(100);
  });

  it("pushes from where the pointer is and stops the way back", () => {
    // Dragged from 0 to 30 since the last tick; the other node comes
    // towards it.
    const [held, other] = push([
      node("a", 0, 0, { fx: 30, fy: 0 }),
      node("b", 80, 0, { vx: -5 }),
    ]);
    expect(held.x).toBe(0);
    // Its box now starts where the dragged one's ends (30 + 50 + 50).
    expect(other.x).toBeCloseTo(130);
    expect(other.vx).toBe(0);
    expect(overlaps({ ...held, x: 30 }, other, BOX, BOX)).toBe(false);
  });

  it("stops a step into the dragged node at its edge", () => {
    // Touching the dragged node and pulled towards it by 10.
    const [, touching] = push([
      node("a", 0, 0, { fx: 0, fy: 0 }),
      node("b", 100, 0, { vx: -10 }),
    ]);
    expect([touching.x, touching.vx]).toEqual([100, 0]);
    // 5 away: it may close the gap, not go in.
    const [, near] = push([
      node("a", 0, 0, { fx: 0, fy: 0 }),
      node("b", 105, 0, { vx: -10 }),
    ]);
    expect(near.vx).toBeCloseTo(-5);
  });

  it("pushes a node at a corner straight away, not along one axis", () => {
    // Below and to the right of the dragged node, 30 into its name.
    const [held, corner] = push([
      node("a", 0, 0, { fx: 0, fy: 0 }),
      node("b", 60, 50),
    ]);
    // Out along (60, 50): to the bottom edge of the area (y 80), both
    // ways at once.
    expect(corner.x).toBeCloseTo(96);
    expect(corner.y).toBeCloseTo(80);
    expect(overlaps(held, corner, BOX, BOX)).toBe(false);
  });

  it("does nothing without a dragged node", () => {
    const [a, b] = push([node("a", 0, 0), node("b", 80, 0)]);
    expect([a.x, b.x]).toEqual([0, 80]);
  });
});

describe("separateFootprints", () => {
  // Layout circle of radius 200 around (0, 0).
  const LIMIT = 200;
  const keepInside = (n: SimNode) => {
    const distance = Math.hypot(n.x ?? 0, n.y ?? 0);
    if (distance > LIMIT) {
      n.x = ((n.x ?? 0) / distance) * LIMIT;
      n.y = ((n.y ?? 0) / distance) * LIMIT;
    }
  };

  it("clears an overlap the rim of the layout holds in place", () => {
    // The lower node sits on the rim, 30 into the name of the upper one,
    // and cannot move further out.
    const upper = node("a", 0, 150);
    const lower = node("b", 10, 200);
    separateFootprints([upper, lower], () => BOX, keepInside);
    expect(overlaps(upper, lower, BOX, BOX)).toBe(false);
    expect(Math.hypot(lower.x ?? 0, lower.y ?? 0)).toBeLessThanOrEqual(
      LIMIT + 1e-9
    );
  });

  it("does not move nodes that do not overlap", () => {
    const a = node("a", 0, 0);
    const b = node("b", 120, 0);
    separateFootprints([a, b], () => BOX, keepInside);
    expect([a.x, a.y, b.x, b.y]).toEqual([0, 0, 120, 0]);
  });
});
