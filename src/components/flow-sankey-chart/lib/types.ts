/** Legend order, and the key every node / link severity resolves to. */
export const SEVERITY_KEYS = ['high', 'medium', 'low', 'info'] as const;

export type SeverityKey = (typeof SEVERITY_KEYS)[number];

/** A node in one stage column. */
export interface FlowNodeDatum {
  id: string;
  /** Text drawn next to the node bar. */
  label: string;
  /** 0-based stage column. */
  stage: number;
  value: number;
  /** Share of its own stage total, 0–1. Derived, never read from the payload. */
  share: number;
  severity: SeverityKey | null;
  /** Single glyph drawn in the chip left of the label. */
  icon: string;
}

export interface FlowLinkDatum {
  source: string;
  target: string;
  value: number;
  severity: SeverityKey | null;
}

/** A header card above the plot (`Total Events 685`, `Time range …`). */
export interface FlowSummaryCard {
  label: string;
  value: string;
  caption: string;
  icon: string;
}

export interface FlowSankeyModel {
  nodes: FlowNodeDatum[];
  links: FlowLinkDatum[];
  /** One header per stage column, e.g. `ROOT CAUSE CATEGORY`. */
  stages: string[];
  summary: FlowSummaryCard[];
  /** Tooltip row label for the measure. */
  valueLabel: string;
  /** Line under the chart title — what the flow is tracing. */
  subtitle: string;
  /** Names what the legend swatches encode, e.g. `Severity`. */
  legendLabel: string;
  /** Severity keys actually present, in legend order. */
  severities: SeverityKey[];
  /** Set when the payload described a cycle — flow charts cannot draw one. */
  circular: boolean;
  /** Smallest links left out to stay under `MAX_FLOW_LINKS`; 0 when none were. */
  droppedLinks: number;
}

/** Chat payload that already describes the graph. */
export interface FlowGraphPayload {
  nodes?: Array<{
    id: string;
    label?: string;
    stage?: number;
    value?: number;
    severity?: string | null;
    icon?: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
    severity?: string | null;
  }>;
  stages?: string[];
  subtitle?: string;
  legendLabel?: string;
  summary?: Array<{
    label?: string;
    value?: string | number;
    caption?: string;
    icon?: string;
  }>;
  valueLabel?: string;
}

/**
 * FuseDash widget payload. `arrangeBy` holds the ordered stage fields (two or
 * more), `display` the measure — the same contract the two-column Sankey uses,
 * extended past a single source/target pair.
 */
export interface FlowSankeyFusePayload {
  data: Array<Record<string, unknown>>;
  arrangeBy?: string[] | null;
  display?: string[] | null;
  xAxe?: string | string[] | null;
  yAxe?: string | string[] | null;
  groupBy?: string | string[] | null;
  /** Field carrying the severity key, when the rows classify their flows. */
  severityBy?: string | null;
  axisDetails?: Record<string, { label?: string }> | null;
}

export type FlowSankeyInput =
  | FlowGraphPayload
  | FlowSankeyFusePayload
  | FlowLinkDatum[];
