/** Node size buckets, smallest → largest (client `SIZE_KEYS`). */
export type NetworkSizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/** Link stroke palette key (client `LINK_COLORS`). */
export type NetworkLinkKind = 'primary' | 'neutral' | 'secondary';

export interface NetworkNode {
  id: string;
  /** Drawn as the label title; falls back to the id. */
  label: string;
  /** Drives the size bucket and the label's value row. */
  value?: number;
  /** Category key resolved through `NODE_TYPE_COLORS`. */
  type: string;
  /** Explicit colour — wins over `type`. */
  color?: string;
  /** Avatar URL, clipped to the node circle. */
  img?: string;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  /** Label text and, while the link is active, its stroke width. */
  value: number;
  type: NetworkLinkKind;
}

export interface NetworkGraphModel {
  nodes: NetworkNode[];
  links: NetworkLink[];
  /** Seven quantile breaks over node values — size buckets and legend rows. */
  breakpoints: number[];
  /** Largest link value; active links scale their width against it. */
  maxLinkValue: number;
}

/** Legend bucket: a value range and the node radius it stands for. */
export interface NetworkLegendRange {
  start: number;
  end: number;
  radius: number;
}

/** Inclusive-left, exclusive-right bucket window from the legend slider. */
export interface NetworkRange {
  leftSlider: number;
  rightSlider: number;
}

/** Chat payload that already describes the graph. */
export interface NetworkGraphPayload {
  nodes?: unknown[];
  links?: unknown[];
}

/** FuseDash widget payload — the graph lives in `data[0]`. */
export interface NetworkGraphFusePayload {
  data?: unknown;
  name?: string;
}

export type NetworkGraphInput =
  | NetworkGraphPayload
  | NetworkGraphFusePayload
  | unknown[];
