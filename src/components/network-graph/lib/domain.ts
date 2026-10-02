import type { ResolvedMode } from '../../../context/resolve-mode.js';
import { seriesInk } from '../../../utils/fuse-palette.js';
import type {
  NetworkGraphModel,
  NetworkLegendRange,
  NetworkNode,
  NetworkRange,
  NetworkSizeKey,
} from './types.js';

/** Client `NODE_SIZES` — bucket → circle radius in px. */
export const NODE_SIZES: Record<NetworkSizeKey, number> = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
};

/** Client `SIZE_KEYS` — one per break point, smallest first. */
export const SIZE_KEYS: NetworkSizeKey[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
];

/** Buckets above `md` keep their label on screen at rest (client rule). */
export const LABEL_ALWAYS_ABOVE = NODE_SIZES.md;

export const NODE_BORDER_WIDTH = 1;
export const SHADOW_RADIUS_RATIO = 1.5;
export const MIN_LINK_WIDTH = 0.8;
export const MAX_LINK_WIDTH = 20;
/** Resting stroke width for every link (client). */
export const LINK_WIDTH = 2;
export const MIN_LINK_DISTANCE = 20;
export const MAX_LINK_DISTANCE = 100;

/** Client `LINK_COLORS`. */
export const LINK_COLORS = {
  neutral: 'rgba(207, 210, 214, 1)',
  primary: 'rgba(71, 176, 255, 0.5)',
  secondary: 'rgba(255, 140, 71, 0.5)',
} as const;

/** Client `DEFAULT_NODE_COLOR`. */
export const DEFAULT_NODE_COLOR = '#64748B';

/** Client `NODE_TYPE_COLORS` — category key → fill for a node without an image. */
export const NODE_TYPE_COLORS: Record<string, string> = {
  bank: '#2563EB',
  invest: '#10B981',
  regional: '#F59E0B',
  vc: '#8B5CF6',
  crypto: '#F97316',
  exchange: '#06B6D4',
  blockchain: '#6366F1',
  defi: '#EC4899',
  company: '#3B82F6',
  startup: '#14B8A6',
  platform: '#A855F7',
  service: '#0EA5E9',
  person: '#EF4444',
  organization: '#64748B',
  community: '#84CC16',
  university: '#1E40AF',
  institute: '#7C3AED',
  program: '#059669',
  studio: '#DC2626',
  streaming: '#BE185D',
  producer: '#B91C1C',
  network: '#1F2937',
  tech: '#3B82F6',
  gaming: '#8B5CF6',
  lifestyle: '#EC4899',
  accelerator: '#10B981',
  manufacturer: '#6366F1',
  distributor: '#F59E0B',
  retailer: '#06B6D4',
  supplier: '#14B8A6',
  cloud: '#0EA5E9',
  saas: '#3B82F6',
  integration: '#8B5CF6',
  framework: '#10B981',
  foundation: '#64748B',
  sponsor: '#F59E0B',
  ai: '#6366F1',
  physics: '#8B5CF6',
  biology: '#10B981',
  corporate: '#3B82F6',
  global: '#1E40AF',
  financial: '#059669',
  ivy: '#7C3AED',
  domain: '#EC4899',
  research: '#14B8A6',
  developer: '#F97316',
  mission: '#4338CA',
  goal: '#A78BFA',
  insight: '#34D399',
  event: '#93C5FD',
  blocker: '#F43F5E',
  entity: '#4B5563',
  source: '#CBD5E1',
};

/** Full bucket window — no filtering (client `DEFAULT_SLIDER_RANGE`). */
export const FULL_RANGE: NetworkRange = { leftSlider: 0, rightSlider: 7 };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Client `getNodeSizeFromBreakpoints`. */
export function nodeSizeKey(
  value: number | undefined,
  breakpoints: number[],
): NetworkSizeKey {
  if (!value || !breakpoints.length) return 'sm';
  for (let i = 0; i < breakpoints.length; i++) {
    if (value <= breakpoints[i]) return SIZE_KEYS[i] ?? 'sm';
  }
  return SIZE_KEYS[SIZE_KEYS.length - 1];
}

export function nodeRadius(node: NetworkNode, breakpoints: number[]): number {
  return NODE_SIZES[nodeSizeKey(node.value, breakpoints)];
}

export function shadowRadius(node: NetworkNode, breakpoints: number[]): number {
  return nodeRadius(node, breakpoints) * SHADOW_RADIUS_RATIO;
}

/** Client `getNodeColor` — explicit colour, then category, then the slate default. */
export function nodeColor(node: NetworkNode, mode: ResolvedMode = 'light'): string {
  if (node.color) return node.color;
  return seriesInk(NODE_TYPE_COLORS[node.type] || DEFAULT_NODE_COLOR, mode);
}

/** Client `scaleLinkWidthByMax` — resting links stay at `LINK_WIDTH`. */
export function scaleLinkWidthByMax(value: number, maxValue: number): number {
  if (maxValue <= 0) return MIN_LINK_WIDTH;
  const ratio = clamp(value / maxValue, 0, 1);
  return MIN_LINK_WIDTH + ratio * (MAX_LINK_WIDTH - MIN_LINK_WIDTH);
}

/** Client `getNodeRangeIndex` — which bucket a value falls into. */
export function rangeIndexOf(value: number, breakpoints: number[]): number {
  for (let i = 0; i < breakpoints.length; i++) {
    if (value <= breakpoints[i]) return i;
  }
  return breakpoints.length - 1;
}

export function isFullRange(range: NetworkRange): boolean {
  return (
    range.leftSlider === FULL_RANGE.leftSlider &&
    range.rightSlider === FULL_RANGE.rightSlider
  );
}

/**
 * Client `filterGraphDataBySliderRange`, reduced to the id set the draw layer
 * needs. Hidden nodes stay mounted so their zone is kept, but their edges leave
 * the force. `null` means "everything is visible".
 */
export function visibleNodeIds(
  model: NetworkGraphModel,
  range: NetworkRange,
): Set<string> | null {
  if (isFullRange(range) || !model.breakpoints.length) return null;

  const ids = new Set<string>();
  for (const node of model.nodes) {
    if (typeof node.value !== 'number') continue;
    const index = rangeIndexOf(node.value, model.breakpoints);
    if (range.leftSlider <= index && index < range.rightSlider) ids.add(node.id);
  }
  return ids;
}

/**
 * Client `Legends` ranges — one bubble per break point, the last stretched to
 * 3x so the largest node still lands in a bucket.
 */
export function legendRanges(breakpoints: number[]): NetworkLegendRange[] {
  return breakpoints.map((start, index) => ({
    start,
    end: index === breakpoints.length - 1 ? start * 3 : breakpoints[index + 1],
    radius: NODE_SIZES[SIZE_KEYS[index] ?? 'sm'],
  }));
}

/**
 * The client lays the simulation out on a fixed 2000x1375 canvas and zooms into
 * it. Chat gives the chart its container instead, so the spatial forces are
 * scaled against that canvas — same spacing relative to the room available.
 */
export const FORCE_CANVAS_REFERENCE = 1375;
/**
 * Slack between the largest node and its collision ring. The client gets this
 * for free from a flat 60px radius on a canvas where nodes cap at 32px; keeping
 * the same cushion is what stops the labels from stacking on top of each other.
 */
export const NODE_COLLIDE_PAD = 36;

export interface NetworkForces {
  charge: number;
  collide: number;
  linkDistance: number;
}

export function networkForces(
  width: number,
  height: number,
  maxNodeRadius: number,
): NetworkForces {
  const scale = clamp(Math.min(width, height) / FORCE_CANVAS_REFERENCE, 0.2, 1);
  return {
    charge: -1200 * scale,
    collide: Math.max(60 * scale, maxNodeRadius + NODE_COLLIDE_PAD),
    // The client re-rolls one random distance in [20, 100] per mount; a chat
    // chart has to be reproducible, so the midpoint is used and then scaled.
    linkDistance: clamp(
      ((MIN_LINK_DISTANCE + MAX_LINK_DISTANCE) / 2) * scale,
      MIN_LINK_DISTANCE,
      MAX_LINK_DISTANCE,
    ),
  };
}

/** Client `INITIAL_NODE_RADIUS_RATIO` — seed spread as a share of the canvas. */
export const INITIAL_NODE_RADIUS_RATIO = 0.2;

/** Node chrome (client `createNodeElements`). */
export const NODE_COLORS = {
  /** Blue bloom under every node. */
  glow: '#473DD9',
  /** Hairline ring drawn on the circle edge. */
  innerBorder: '#FFFFFF',
  /** Accent ring one pixel outside it. */
  outerBorder: '#473DD9',
  /** Fill of a selected node that carries no image. */
  activeFill: '#000000',
  shadowInner: '#141C2C',
  shadowOuter: '#5F6877',
} as const;

/** Node label chrome (client `createNodeLabel`). */
export const NODE_LABEL_COLORS = {
  text: 'rgba(33, 38, 46, 0.9)',
  textActive: '#FFFFFF',
  background: '#FFFFFF00',
  backgroundHover: '#FFFFFF',
  backgroundActive: '#000000',
} as const;

/** Link value pill (client `link-label`). */
export const LINK_LABEL_COLORS = {
  background: 'rgba(19, 22, 29, 1)',
  text: 'rgba(239, 240, 241, 1)',
} as const;
