import type { ReasoningNode, ReasoningOrchestrationModel } from './types.js';

/**
 * Radial fan with the root at the bottom centre and depth growing outward.
 *
 * The horizontal reach stops growing at the widest stage (the exploration
 * frontier), so that stage spans the plot as an arc and deeper stages climb
 * toward the top instead of running off the sides. Other roots (independent
 * resamples) grow as small fans along the baseline.
 */

/** Half the fan's opening: the frontier meets the baseline just above the corners. */
export const THETA_MAX = (84 * Math.PI) / 180;
/** Half the opening of a resample fan. */
export const FAN_THETA = (52 * Math.PI) / 180;
/**
 * Radial jitter, in depth steps. Turns a dense stage into a jagged band rather
 * than a line. Nodes on a path take less, so a path never doubles back.
 */
export const JITTER = 1.3;
export const PATH_JITTER = 0.5;
/** Angular jitter, in radians either way. Lets a long single chain weave instead of standing straight. */
export const ANGLE_JITTER = 0.03;
export const PAD_X = 18;
export const PAD_TOP = 26;
export const PAD_BOTTOM = 14;
/** Baseline slots for resample fans, as a share of the width, nearest the centre last. */
const FAN_SLOTS = [0.17, 0.83, 0.33, 0.67, 0.08, 0.92, 0.25, 0.75];

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  /** Angle from vertical, negative to the left. */
  angle: number;
  /** 0 at the root, 1 at the deepest node of the main fan. */
  rho: number;
  /** -1 for the main fan, else the resample fan it grows in. */
  fan: number;
}

export interface ResampleFan {
  root: string;
  x: number;
  radius: number;
}

export interface OrchestrationLayout {
  width: number;
  height: number;
  cx: number;
  base: number;
  rx: number;
  ry: number;
  /** Radius at which the horizontal reach stops growing. */
  rhoWide: number;
  primaryRoot: string | null;
  nodes: Map<string, PlacedNode>;
  fans: ResampleFan[];
  /** Plot point for a main-fan radius and angle. */
  point(rho: number, angle: number): { x: number; y: number };
  /** Main-fan radius of a depth. */
  rhoOf(depth: number): number;
}

/** Stable 0–1 value per id, so the jitter does not move between draws. */
export function hash01(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function childrenOf(nodes: ReasoningNode[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent) continue;
    if (!out.has(node.parent)) out.set(node.parent, []);
    out.get(node.parent)!.push(node.id);
  }
  return out;
}

/**
 * Cluster angles: leaves share the opening evenly in depth-first order, each
 * parent sits between its first and last child.
 */
function clusterAngles(root: string, children: Map<string, string[]>, span: number): Map<string, number> {
  const leaves: string[] = [];
  const order: string[] = [];
  const stack = [root];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    const kids = (children.get(id) ?? []).filter((kid) => !seen.has(kid));
    if (!kids.length) leaves.push(id);
    for (let i = kids.length - 1; i >= 0; i -= 1) stack.push(kids[i]!);
  }
  const angle = new Map<string, number>();
  leaves.forEach((id, i) => angle.set(id, -span + ((i + 0.5) / leaves.length) * 2 * span));
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const id = order[i]!;
    if (angle.has(id)) continue;
    const kids = (children.get(id) ?? []).filter((kid) => angle.has(kid));
    angle.set(id, kids.length ? (angle.get(kids[0]!)! + angle.get(kids[kids.length - 1]!)!) / 2 : 0);
  }
  angle.set(root, 0);
  return angle;
}

function descendants(root: string, children: Map<string, string[]>): string[] {
  const out: string[] = [];
  const stack = [root];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const kid of children.get(id) ?? []) stack.push(kid);
  }
  return out;
}

/** The main root: the one the active path starts from, else the largest tree. */
function primaryRootOf(
  model: ReasoningOrchestrationModel,
  roots: string[],
  children: Map<string, string[]>,
  parentOf: Map<string, string | null>,
): string | null {
  const active = model.paths.find((path) => path.id === model.activePathId);
  if (active) {
    let cursor: string | null | undefined = active.nodes[0];
    for (let guard = 0; cursor && guard <= model.nodes.length; guard += 1) {
      const up = parentOf.get(cursor);
      if (!up) return cursor;
      cursor = up;
    }
  }
  let best: string | null = null;
  let size = -1;
  for (const root of roots) {
    const count = descendants(root, children).length;
    if (count > size) {
      size = count;
      best = root;
    }
  }
  return best;
}

export function layoutOrchestration(
  model: ReasoningOrchestrationModel,
  width: number,
  height: number,
): OrchestrationLayout {
  const children = childrenOf(model.nodes);
  const parentOf = new Map(model.nodes.map((node) => [node.id, node.parent]));
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const roots = model.nodes.filter((node) => !node.parent).map((node) => node.id);
  const primaryRoot = primaryRootOf(model, roots, children, parentOf);

  const cx = width / 2;
  const base = height - PAD_BOTTOM;
  const ry = Math.max(1, base - PAD_TOP);

  const main = primaryRoot ? descendants(primaryRoot, children) : [];
  const mainSet = new Set(main);
  const rootDepth = primaryRoot ? byId.get(primaryRoot)!.depth : 0;
  const span = Math.max(1, model.maxDepth - rootDepth);
  const rhoOf = (depth: number) => Math.max(0, Math.min(1, (depth - rootDepth) / span));

  // The widest stage: the depth with the most nodes in the main fan.
  const perDepth = new Map<number, number>();
  for (const id of main) {
    const d = Math.round(byId.get(id)!.depth);
    perDepth.set(d, (perDepth.get(d) ?? 0) + 1);
  }
  let wideDepth = rootDepth + span;
  let wideCount = 0;
  for (const [d, count] of perDepth) {
    if (d === rootDepth) continue;
    if (count > wideCount || (count === wideCount && d < wideDepth)) {
      wideCount = count;
      wideDepth = d;
    }
  }
  const rhoWide = Math.max(0.25, Math.min(1, rhoOf(wideDepth)));
  const rx = Math.max(1, (width / 2 - PAD_X) / rhoWide);
  const point = (rho: number, angle: number) => ({
    x: cx + Math.min(rho, rhoWide) * rx * Math.sin(angle),
    y: base - rho * ry * Math.cos(angle),
  });

  const nodes = new Map<string, PlacedNode>();
  const onPath = new Set(model.paths.flatMap((path) => path.nodes));
  const jitter = (id: string) => (hash01(id) - 0.5) * (onPath.has(id) ? PATH_JITTER : JITTER);
  const turn = (id: string) => (hash01(`${id}~`) - 0.5) * 2 * ANGLE_JITTER;

  if (primaryRoot) {
    const angles = clusterAngles(primaryRoot, children, THETA_MAX);
    for (const id of main) {
      const node = byId.get(id)!;
      const isRoot = id === primaryRoot;
      const rho = isRoot ? 0 : Math.max(0.015, Math.min(1, rhoOf(node.depth + jitter(id))));
      const angle = isRoot ? 0 : Math.max(-THETA_MAX, Math.min(THETA_MAX, (angles.get(id) ?? 0) + turn(id)));
      nodes.set(id, { id, angle, rho, fan: -1, ...point(rho, angle) });
    }
  }

  // Resample fans: the other roots, along the baseline either side of the main root.
  const fans: ResampleFan[] = [];
  const fanRadius = Math.max(12, Math.min(ry * 0.2, width * 0.11));
  roots
    .filter((root) => root !== primaryRoot && !mainSet.has(root))
    .forEach((root, index) => {
      const x = width * FAN_SLOTS[index % FAN_SLOTS.length]!;
      fans.push({ root, x, radius: fanRadius });
      const members = descendants(root, children).filter((id) => !nodes.has(id));
      const angles = clusterAngles(root, children, FAN_THETA);
      const own = byId.get(root)!.depth;
      const depthSpan = Math.max(1, ...members.map((id) => byId.get(id)!.depth - own));
      for (const id of members) {
        const node = byId.get(id)!;
        const rho = id === root ? 0 : Math.max(0, Math.min(1, (node.depth - own + jitter(id) * 0.5) / depthSpan));
        const angle = angles.get(id) ?? 0;
        nodes.set(id, {
          id,
          angle,
          rho,
          fan: index,
          x: x + rho * fanRadius * Math.sin(angle),
          y: base - rho * fanRadius * 1.3 * Math.cos(angle),
        });
      }
    });

  // Anything a cycle cut off from every root: at its depth, straight up.
  for (const node of model.nodes) {
    if (nodes.has(node.id)) continue;
    const rho = rhoOf(node.depth);
    nodes.set(node.id, { id: node.id, angle: 0, rho, fan: -1, ...point(rho, 0) });
  }

  return { width, height, cx, base, rx, ry, rhoWide, primaryRoot, nodes, fans, point, rhoOf };
}

/** Root-to-node chain through the spanning tree, root first. */
export function pathToNode(model: ReasoningOrchestrationModel, nodeId: string): string[] {
  const parentOf = new Map(model.nodes.map((node) => [node.id, node.parent]));
  if (!parentOf.has(nodeId)) return [];
  const chain: string[] = [];
  let cursor: string | null | undefined = nodeId;
  for (let guard = 0; cursor && guard <= model.nodes.length; guard += 1) {
    chain.push(cursor);
    cursor = parentOf.get(cursor);
  }
  return chain.reverse();
}

/** Node count at each whole depth of the main fan: the breadth profile the top chart draws. */
export function breadthByDepth(model: ReasoningOrchestrationModel): number[] {
  const out = Array.from({ length: Math.ceil(model.maxDepth) + 1 }, () => 0);
  for (const node of model.nodes) {
    const d = Math.min(out.length - 1, Math.max(0, Math.round(node.depth)));
    out[d] = out[d]! + 1;
  }
  return out;
}
