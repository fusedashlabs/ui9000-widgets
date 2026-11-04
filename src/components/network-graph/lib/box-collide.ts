import type { Footprint } from './label-layout.js';
import type { SimNode } from './layout-types.js';

interface Body {
  node: SimNode;
  box: Footprint;
  /** Larger footprints move less. */
  mass: number;
}

type Position = (node: SimNode) => number;

// Overlap (canvas units) too small to see; the footprints have air around.
const MIN_OVERLAP = 0.5;

const toBodies = (
  nodes: SimNode[],
  footprintOf: (node: SimNode) => Footprint
): Body[] =>
  nodes.map((node) => {
    const box = footprintOf(node);
    return { node, box, mass: box.halfWidth * (box.top + box.bottom) };
  });

const isFixed = (node: SimNode) => node.fx != null || node.fy != null;

/**
 * Offsets [ax, ay, bx, by] that take two overlapping footprints apart along
 * the shorter way out, the smaller one further; null when they do not
 * overlap. A dragged (fixed) node does not move.
 */
const separation = (
  a: Body,
  ax: number,
  ay: number,
  b: Body,
  bx: number,
  by: number
): [number, number, number, number] | null => {
  const fixedA = isFixed(a.node);
  const fixedB = isFixed(b.node);
  if (fixedA && fixedB) return null;
  const overlapX =
    Math.min(ax + a.box.halfWidth, bx + b.box.halfWidth) -
    Math.max(ax - a.box.halfWidth, bx - b.box.halfWidth);
  const overlapY =
    Math.min(ay + a.box.bottom, by + b.box.bottom) -
    Math.max(ay - a.box.top, by - b.box.top);
  // Boxes moved apart end up just touching; that is not an overlap.
  if (overlapX <= MIN_OVERLAP || overlapY <= MIN_OVERLAP) return null;

  let shareA = b.mass / (a.mass + b.mass);
  if (fixedA) shareA = 0;
  if (fixedB) shareA = 1;
  const shareB = 1 - shareA;

  if (overlapX < overlapY) {
    const dir = ax <= bx ? -1 : 1;
    return [dir * overlapX * shareA, 0, -dir * overlapX * shareB, 0];
  }
  // Compare the box centres: the names hang below the nodes.
  const dir =
    ay + (a.box.bottom - a.box.top) / 2 <= by + (b.box.bottom - b.box.top) / 2
      ? -1
      : 1;
  return [0, dir * overlapY * shareA, 0, -dir * overlapY * shareB];
};

/** Calls `visit` for the pairs whose boxes share some x range. */
const sweep = (
  bodies: Body[],
  x: Position,
  visit: (a: Body, b: Body) => void
) => {
  const left = (body: Body) => x(body.node) - body.box.halfWidth;
  const sorted = [...bodies].sort((a, b) => left(a) - left(b));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      // Every later box starts right of this one.
      if (left(sorted[j]) >= x(sorted[i].node) + sorted[i].box.halfWidth) {
        break;
      }
      visit(sorted[i], sorted[j]);
    }
  }
};

/** d3 force: the shape d3-force calls every tick and on `nodes(...)`. */
export interface BoxCollideForce {
  (): void;
  initialize: (nodes: SimNode[]) => void;
}

/**
 * Keeps the footprints of the nodes (circle and name, see getNodeFootprint)
 * apart, so names neither overlap each other nor lie on other nodes. Like
 * d3's collide force it looks at the next positions (x + vx) and changes
 * velocities, `iterations` times per tick (more is stiffer, as in d3).
 */
export const forceBoxCollide = (
  footprintOf: (node: SimNode) => Footprint,
  strength = 1,
  iterations = 2
): BoxCollideForce => {
  let bodies: Body[] = [];
  // A dragged node will be where the pointer put it (fx, fy).
  const nextX: Position = (node) => node.fx ?? (node.x ?? 0) + (node.vx ?? 0);
  const nextY: Position = (node) => node.fy ?? (node.y ?? 0) + (node.vy ?? 0);

  const apply = () => {
    for (let pass = 0; pass < iterations; pass++) {
      sweep(bodies, nextX, (a, b) => {
        const push = separation(
          a,
          nextX(a.node),
          nextY(a.node),
          b,
          nextX(b.node),
          nextY(b.node)
        );
        if (!push) return;
        a.node.vx = (a.node.vx ?? 0) + push[0] * strength;
        a.node.vy = (a.node.vy ?? 0) + push[1] * strength;
        b.node.vx = (b.node.vx ?? 0) + push[2] * strength;
        b.node.vy = (b.node.vy ?? 0) + push[3] * strength;
      });
    }
  };

  return Object.assign(apply, {
    initialize: (nodes: SimNode[]) => {
      bodies = toBodies(nodes, footprintOf);
    },
  });
};

/**
 * Move [dx, dy] that takes `body`, at (x, y), out of the footprint of
 * `fixed`, at (fx, fy): straight away from the middle of the area its
 * position may not enter, to its edge. The way out turns smoothly as the
 * nodes move; along the shorter axis it would flip between x and y at a
 * corner and shake the node. Null when the footprints do not overlap.
 */
const exitPush = (
  fixed: Body,
  fx: number,
  fy: number,
  body: Body,
  x: number,
  y: number
): [number, number] | null => {
  // Where body's position may not be, relative to the fixed node.
  const halfX = fixed.box.halfWidth + body.box.halfWidth;
  const top = -(fixed.box.top + body.box.bottom);
  const bottom = fixed.box.bottom + body.box.top;
  const rx = x - fx;
  const ry = y - fy;
  if (
    Math.abs(rx) >= halfX - MIN_OVERLAP ||
    ry <= top + MIN_OVERLAP ||
    ry >= bottom - MIN_OVERLAP
  ) {
    return null;
  }
  let ux = rx;
  let uy = ry - (top + bottom) / 2;
  const length = Math.hypot(ux, uy);
  if (length < 1e-6) {
    ux = 1;
    uy = 0;
  } else {
    ux /= length;
    uy /= length;
  }
  const out = Math.min(
    ux > 0 ? (halfX - rx) / ux : ux < 0 ? (-halfX - rx) / ux : Infinity,
    uy > 0 ? (bottom - ry) / uy : uy < 0 ? (top - ry) / uy : Infinity
  );
  return [ux * out, uy * out];
};

/**
 * A dragged (fixed) node does not give way: every footprint that overlaps
 * its own is moved out at once, by position, as the pointer node of d3's
 * collision example pushes the others. A push through the velocity would be
 * damped (velocityDecay) and lag behind the pointer. The velocity into the
 * dragged node is dropped, so the next step does not bring a node back; the
 * pushed nodes push their own neighbours through the usual collisions. A
 * step that would take a node into the dragged one (a link pulling it) is
 * cut short at its edge, so the node rests against it instead of going in
 * and being pushed out again on every tick. Add it last, so no later force
 * moves a node back onto the dragged one; `pushed` holds the ids it moved
 * in the last tick (see forceCircleBounds).
 */
export const forceDragPush = (
  footprintOf: (node: SimNode) => Footprint,
  pushed = new Set<string>()
): BoxCollideForce => {
  let bodies: Body[] = [];

  const apply = () => {
    pushed.clear();
    bodies.forEach((fixed) => {
      if (!isFixed(fixed.node)) return;
      const fx = fixed.node.fx ?? fixed.node.x ?? 0;
      const fy = fixed.node.fy ?? fixed.node.y ?? 0;
      bodies.forEach((body) => {
        if (body === fixed || isFixed(body.node)) return;
        const node = body.node;
        const push = exitPush(fixed, fx, fy, body, node.x ?? 0, node.y ?? 0);
        if (push) {
          node.x = (node.x ?? 0) + push[0];
          node.y = (node.y ?? 0) + push[1];
          // Drop the motion back into the dragged node.
          const length = Math.hypot(push[0], push[1]) || 1;
          const into =
            ((node.vx ?? 0) * push[0] + (node.vy ?? 0) * push[1]) / length;
          if (into < 0) {
            node.vx = (node.vx ?? 0) - (into * push[0]) / length;
            node.vy = (node.vy ?? 0) - (into * push[1]) / length;
          }
          pushed.add(node.id);
        }
        // The next step stops at the dragged node's edge (the step is
        // shorter still once damped, so the node does not reach inside).
        const ahead = exitPush(
          fixed,
          fx,
          fy,
          body,
          (node.x ?? 0) + (node.vx ?? 0),
          (node.y ?? 0) + (node.vy ?? 0)
        );
        if (ahead) {
          node.vx = (node.vx ?? 0) + ahead[0];
          node.vy = (node.vy ?? 0) + ahead[1];
        }
      });
    });
  };

  return Object.assign(apply, {
    initialize: (nodes: SimNode[]) => {
      bodies = toBodies(nodes, footprintOf);
    },
  });
};

/**
 * Moves overlapping footprints straight apart, round after round, until
 * none overlap (or `rounds` run out); `keepInside` puts a node pushed out
 * of the layout back. Run when the layout comes to rest, it clears what the
 * forces leave behind: at the rim of the circle the bounds force can hold
 * two nodes in each other's way.
 */
export const separateFootprints = (
  nodes: SimNode[],
  footprintOf: (node: SimNode) => Footprint,
  keepInside: (node: SimNode) => void,
  rounds = 100
) => {
  const bodies = toBodies(nodes, footprintOf);
  const x: Position = (node) => node.x ?? 0;
  for (let round = 0; round < rounds; round++) {
    let moved = false;
    sweep(bodies, x, (a, b) => {
      const push = separation(
        a,
        a.node.x ?? 0,
        a.node.y ?? 0,
        b,
        b.node.x ?? 0,
        b.node.y ?? 0
      );
      if (!push) return;
      moved = true;
      a.node.x = (a.node.x ?? 0) + push[0];
      a.node.y = (a.node.y ?? 0) + push[1];
      b.node.x = (b.node.x ?? 0) + push[2];
      b.node.y = (b.node.y ?? 0) + push[3];
    });
    if (!moved) return;
    nodes.forEach(keepInside);
  }
};
