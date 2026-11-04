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
  /** Topics the node belongs to, besides its `type`. */
  topics?: string[];
  /** ISO date the node appears on the timeline. */
  date?: string;
  /** Events of the node, listed on the left of its focus view. */
  events?: string[];
  /** What the node is (e.g. "Influencer"), shown under its name. */
  role?: string;
  /** Statistics of the node card: tiles and a chart over time. */
  metrics?: TopicMetric[];
  /** Text of the "Bio" tab of the node card. */
  bio?: string;
  /** Title of the events list of the focus view, e.g. "Highest support". */
  eventsLabel?: string;
  /** What the linked nodes are, e.g. "Districts"; titles their lists. */
  linksLabel?: string;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  /** Label text and, while the link is active, its stroke width. */
  value: number;
  type: NetworkLinkKind;
  /** ISO date of the link; the timeline shows links up to its date. */
  date?: string;
}

/** One point of a metric over time. */
export interface MetricPoint {
  date: string;
  value: number;
}

/** A metric shown in the topic sidebar and the node card. */
export interface TopicMetric {
  label: string;
  value: number;
  /** Suffix of the value, e.g. "%". */
  unit?: string;
  change?: number;
  /** Suffix of the change, e.g. "%". */
  changeUnit?: string;
  /** What the value and its change are, shown under the metrics. */
  description?: string;
  series?: MetricPoint[];
}

/** One row of the ranking. */
export interface RankingEntry {
  name: string;
  value: number;
  unit?: string;
  /** Change in percent. */
  change?: number;
  /** Suffix of the change; "%" when missing. */
  changeUnit?: string;
  /** Connections of the entry; counted from the links when missing. */
  connections?: number;
}

/** One entry of the "Trends by Topics" list. */
export interface NetworkTopic {
  name: string;
  value: number;
  unit?: string;
  /** Change in percent; no trend is shown without it. */
  change?: number;
  changeUnit?: string;
  color?: string;
  /** Selected when the widget opens. */
  selected?: boolean;
  metrics?: TopicMetric[];
  ranking?: RankingEntry[];
}

/** Words of the panels for the data drawn; the design's words stay where one is missing. */
export interface NetworkLabels {
  /** What a link value counts, plural: "supporters". */
  linkValue?: string;
  /** What a node's size counts: "respondents". */
  nodeValue?: string;
  /** Heatmap corner: what the matrix is and what a cell holds. */
  heatmapTitle?: string;
  heatmapSubtitle?: string;
  /** What a topic is ("Issue") and the title of the topics list. */
  topic?: string;
  topics?: string;
  /** What the change of a topic compares, shown on hover. */
  topicChange?: string;
  /** Title of the ranking and the names of its columns. */
  ranking?: string;
  rankingName?: string;
  rankingValue?: string;
  rankingChange?: string;
  /** Tab of the node card that shows its `bio`. */
  bio?: string;
}

export interface NetworkGraphModel {
  nodes: NetworkNode[];
  links: NetworkLink[];
  /** Seven quantile breaks over node values — size buckets and legend rows. */
  breakpoints: number[];
  /** Largest link value; active links scale their width against it. */
  maxLinkValue: number;
  /** Topics with trends; node types are used when missing. */
  topics?: NetworkTopic[];
  /** Ranking shown when no topic has its own. */
  ranking?: RankingEntry[];
  labels?: NetworkLabels;
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
