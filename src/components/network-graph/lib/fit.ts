import { MAX_CHARGE, MAX_ZOOM, MIN_CHARGE, MIN_ZOOM } from './graph-constants.js';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FitTransform {
  x: number;
  y: number;
  k: number;
}

/** Zoom that fits the layout circle into the view box, centred. */
export function getCircleFitTransform(
  centerX: number,
  centerY: number,
  radius: number,
  view: ViewBox,
): FitTransform {
  const scale = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, Math.min(view.width, view.height) / (radius * 2)),
  );
  return {
    x: view.x + view.width / 2 - centerX * scale,
    y: view.y + view.height / 2 - centerY * scale,
    k: scale,
  };
}

/** Many-body strength that spreads `count` nodes over a circle of `radius`. */
export function getCharge(radius: number, count: number): number {
  const areaPerNode = (Math.PI * radius * radius) / Math.max(count, 1);
  return -Math.min(MAX_CHARGE, Math.max(MIN_CHARGE, areaPerNode / 12));
}

/** Radius of the circle the graph fills; it grows once the nodes need more than `maxFill` of it. */
export function getLayoutRadius(
  base: number,
  areas: number[],
  edgeGap: number,
  maxFill: number,
): number {
  const taken = areas.reduce((sum, area) => sum + area, 0);
  return Math.max(base, Math.sqrt(taken / (Math.PI * maxFill)) + edgeGap);
}

/** Stable number in [0, 1) for a link id (djb2), so a link keeps its length. */
export function linkJitter(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i += 1) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

/** Link length as a share of the layout radius; it depends on the link id only. */
export function getLinkLength(
  link: { id: string },
  radius: number,
  minShare: number,
  maxShare: number,
): number {
  return radius * (minShare + linkJitter(String(link.id)) * (maxShare - minShare));
}

/** The point where a line to a target leaves the circle of a node. */
export function getLinkPoint(
  nodeX: number,
  nodeY: number,
  targetX: number,
  targetY: number,
  nodeRadius: number,
): { x: number; y: number } {
  const dx = targetX - nodeX;
  const dy = targetY - nodeY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x: nodeX, y: nodeY };
  return { x: nodeX + (dx / distance) * nodeRadius, y: nodeY + (dy / distance) * nodeRadius };
}

/** Neighbour ids of `nodeId` with the summed weight of their links. */
export function getNodeConnections(
  nodeId: string | null,
  links: Array<{ source: string; target: string; value: number }>,
): Map<string, number> {
  const connections = new Map<string, number>();
  if (!nodeId) return connections;
  for (const { source, target, value } of links) {
    const weight = Number(value) || 0;
    if (source === nodeId && target !== nodeId) {
      connections.set(target, (connections.get(target) ?? 0) + weight);
    } else if (target === nodeId && source !== nodeId) {
      connections.set(source, (connections.get(source) ?? 0) + weight);
    }
  }
  return connections;
}
