import type { SimNode } from './layout-types.js';

/** d3 force: the shape d3-force calls every tick and on `nodes(...)`. */
export interface CircleBoundsForce {
  (): void;
  initialize: (nodes: SimNode[]) => void;
}

/**
 * Keeps nodes inside the circle. A node being dragged (fixed by fx / fy) is
 * left alone, so it follows the pointer anywhere; once released it glides
 * back (`strength` = share of the gap closed per tick) and is then held
 * inside like the others. A node the dragged one pushed out (`wasPushed`)
 * glides back the same way, rather than jump onto the edge, and so back
 * onto the dragged node.
 */
export const forceCircleBounds = (
  centerX: number,
  centerY: number,
  limitOf: (node: SimNode) => number,
  strength: number,
  wasPushed: (node: SimNode) => boolean = () => false
): CircleBoundsForce => {
  let nodes: SimNode[] = [];
  const returning = new Set<string>();

  const apply = () => {
    nodes.forEach((node) => {
      if (node.fx != null || node.fy != null) {
        returning.add(node.id);
        return;
      }
      if (node.x == null || node.y == null) return;
      const dx = node.x - centerX;
      const dy = node.y - centerY;
      const distance = Math.hypot(dx, dy);
      const limit = limitOf(node);
      if (!distance) return;
      if (distance <= limit) {
        returning.delete(node.id);
        // A step that would cross the edge stops on it: the node then
        // slides along the edge. Stepping out and being put back on the
        // next tick made the nodes at the edge shake.
        const outward = ((node.vx ?? 0) * dx + (node.vy ?? 0) * dy) / distance;
        const room = limit - distance;
        if (outward > room) {
          const cut = (outward - room) / distance;
          node.vx = (node.vx ?? 0) - cut * dx;
          node.vy = (node.vy ?? 0) - cut * dy;
        }
        return;
      }
      if (wasPushed(node)) returning.add(node.id);
      if (returning.has(node.id)) {
        // Close a fixed share of the gap every tick, however cool the
        // simulation already is, so the node glides back in.
        const step = ((distance - limit) / distance) * strength;
        node.x -= dx * step;
        node.y -= dy * step;
        node.vx = 0;
        node.vy = 0;
        return;
      }
      const ux = dx / distance;
      const uy = dy / distance;
      node.x = centerX + ux * limit;
      node.y = centerY + uy * limit;
      // Drop only the outward motion: nodes held on the edge still slide
      // along it, so the collision force can move them apart.
      const outward = (node.vx ?? 0) * ux + (node.vy ?? 0) * uy;
      if (outward > 0) {
        node.vx = (node.vx ?? 0) - outward * ux;
        node.vy = (node.vy ?? 0) - outward * uy;
      }
    });
  };

  return Object.assign(apply, {
    initialize: (next: SimNode[]) => {
      nodes = next;
    },
  });
};
