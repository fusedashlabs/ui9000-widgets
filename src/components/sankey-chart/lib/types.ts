/** A node in one of the two Sankey columns. */
export interface SankeyNodeDatum {
  /**
   * Layout id. Source ids keep a trailing space (FuseDash trick) so a value
   * present in both columns can never resolve to a self link.
   */
  name: string;
  /** Text drawn inside the node column. */
  label: string;
}

export interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
}

export interface SankeyModel {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
  /** Header above the left column (source dimension). */
  sourceLabel: string;
  /** Header above the right column (target dimension). */
  targetLabel: string;
  /** Tooltip row label for the measure. */
  valueLabel: string;
  /** Sequential palette, low → high. */
  colors: string[];
  /** FuseDash refuses to lay out a cyclic graph. */
  circular: boolean;
}

/** FuseDash widget payload (`WidgetItem`-shaped, chrome fields ignored). */
export interface SankeyFusePayload {
  data: Array<Record<string, unknown>>;
  xAxe?: string | string[] | null;
  yAxe?: string | string[] | null;
  groupBy?: string | string[] | null;
  /** Sankey widgets configured through the editor carry the two dimensions here. */
  arrangeBy?: string[] | null;
  /** …and the measure here. */
  display?: string[] | null;
  axisDetails?: Record<string, { label?: string }> | null;
  palette?: { customColors?: Array<{ hex: string }> | null } | null;
}

/** Chat payload that already describes the graph. */
export interface SankeyGraphPayload {
  nodes?: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
  sourceLabel?: string;
  targetLabel?: string;
  valueLabel?: string;
}

export type SankeyInput =
  | SankeyLinkDatum[]
  | SankeyGraphPayload
  | SankeyFusePayload;
