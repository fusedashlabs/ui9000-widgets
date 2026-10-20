/**
 * Reasoning orchestration graph (AM-1): reasoning stages, candidate paths,
 * models and refinement steps, with the active path highlighted.
 *
 * `*Input` types are what a payload may send; the rest is the normalized
 * model the layout and the renderer read.
 */

export type Id = string | number;

/** Pruned and failed nodes are drawn as dropped; the others take their model's colour. */
export type NodeState = 'candidate' | 'refined' | 'verified' | 'pruned' | 'failed';

export type LinkKind = 'expand' | 'refine' | 'verify' | 'resample';

export type StageStatus = 'done' | 'active' | 'pending' | 'failed';

export interface ModelInput {
  id?: Id;
  name?: string;
  label?: string;
  /** What the model does in the orchestration: Explore, Repair, Critic… */
  role?: string;
  /** Short readout beside the name: "Breadth T=0.8". */
  detail?: string;
  temperature?: number | string;
  color?: string;
}

export interface StageInput {
  id?: Id;
  label?: string;
  name?: string;
  /** One depth, or the inclusive `[from, to]` depths the stage spans. */
  depth?: number | string | [number | string, number | string];
  status?: string;
  /** Model whose nodes fill this stage, by id or name. */
  model?: Id;
  /** High-level metrics compared across stages in the top chart. */
  metrics?: Record<string, number | string>;
}

export interface NodeInput {
  id: Id;
  label?: string;
  /** Stage id or label. */
  stage?: Id;
  depth?: number | string;
  /** Model id or name. */
  model?: Id;
  state?: string;
  /** Confidence or reward, 0–1. Sets the node size. */
  score?: number | string;
  /** Spanning-tree parent; otherwise the first incoming link. */
  parent?: Id;
}

export interface LinkInput {
  id?: Id;
  source: Id;
  target: Id;
  kind?: string;
  model?: Id;
}

export interface PathInput {
  id?: Id;
  label?: string;
  model?: Id;
  /** Node ids from the root outward. */
  nodes: Id[];
  score?: number | string;
}

export interface AnnotationInput {
  /** Node the note hangs from. Defaults to the last node of `path`. */
  node?: Id;
  path?: Id;
  title: string;
  lines?: string | string[];
  detail?: string | string[];
  model?: Id;
}

export interface MetricInput {
  label: string;
  value: number | string;
  delta?: number | string;
  unit?: string;
}

export interface EntropySeriesInput {
  label?: string;
  model?: Id;
  values: (number | string)[];
}

export interface EntropyInput {
  /** Caption over the strip: "Reasoning step recovery · Δ accuracy gain". */
  title?: string;
  /** Caption of the panel under it. Defaults to "Step entropy". */
  label?: string;
  /** At most two series: the first ticks up, the second down. */
  series?: EntropySeriesInput[];
  /** Shorthand for one series. */
  values?: (number | string)[];
  /** Step ranges to call out, inclusive. */
  highlight?: ({ from: number; to: number; label?: string } | [number, number])[];
}

export interface PipelineStageInput {
  label?: string;
  name?: string;
  status?: string;
  detail?: string;
}

export interface PipelineInput {
  label?: string;
  stages: PipelineStageInput[];
}

export interface ScalingPointInput {
  x?: number | string;
  y?: number | string;
  compute?: number | string;
  accuracy?: number | string;
}

export interface ScalingSeriesInput {
  id?: Id;
  label?: string;
  model?: Id;
  points: (ScalingPointInput | [number, number])[];
}

export interface ScalingInput {
  label?: string;
  xLabel?: string;
  yLabel?: string;
  /** `%` prints y as a percentage (0–1 values are scaled). */
  yUnit?: string;
  series: ScalingSeriesInput[];
}

export interface ReasoningOrchestrationPayload {
  chartType?: string;
  name?: string;
  title?: string;
  /** Experiment metadata beside the title. Aliases: metadata, meta. */
  subtitle?: string;
  metadata?: string | string[];
  meta?: string | string[];
  models?: ModelInput[];
  stages?: StageInput[];
  nodes?: NodeInput[];
  links?: LinkInput[];
  /** Alias of links. */
  edges?: LinkInput[];
  paths?: PathInput[];
  /** Path id, or the node ids of the path. Alias: activePathId. */
  activePath?: Id | Id[];
  activePathId?: Id;
  annotations?: AnnotationInput[];
  /** Readouts over the top chart. A plain string is printed as is. */
  summary?: string | MetricInput[];
  /** Lead word of the summary line. Defaults to "Search topology". */
  summaryLabel?: string;
  /** The right-hand readout over the top chart. */
  criterion?: string;
  /** Stage metric the top chart compares. Defaults to the first one stages share. */
  stageMetric?: string;
  benchmarks?: MetricInput[];
  entropy?: EntropyInput | (number | string)[];
  pipeline?: PipelineInput | PipelineStageInput[];
  computeScaling?: ScalingInput;
  /** Alias of computeScaling. */
  scaling?: ScalingInput;
}

export interface ReasoningModel {
  id: string;
  name: string;
  role: string;
  detail: string;
  /** Explicit colour, or null for the palette slot at `index`. */
  color: string | null;
  index: number;
}

export interface ReasoningStage {
  id: string;
  label: string;
  index: number;
  depthFrom: number;
  depthTo: number;
  status: StageStatus | null;
  modelId: string | null;
  metrics: Record<string, number>;
}

export interface ReasoningNode {
  id: string;
  label: string;
  depth: number;
  stageIndex: number | null;
  modelId: string | null;
  state: NodeState;
  score: number | null;
  /** Spanning-tree parent used for the layout, or null for a root. */
  parent: string | null;
}

export interface ReasoningLink {
  id: string;
  source: string;
  target: string;
  kind: LinkKind;
  modelId: string | null;
}

export interface ReasoningPath {
  id: string;
  label: string;
  modelId: string | null;
  nodes: string[];
  score: number | null;
}

export interface ReasoningAnnotation {
  nodeId: string;
  title: string;
  lines: string[];
  modelId: string | null;
}

export interface Metric {
  label: string;
  value: string;
  delta: string;
  /** Sign of the delta, for colour. */
  trend: 'up' | 'down' | 'flat' | null;
}

export interface EntropySeries {
  label: string;
  modelId: string | null;
  values: number[];
}

export interface EntropyStrip {
  title: string;
  label: string;
  series: EntropySeries[];
  highlight: { from: number; to: number; label: string }[];
  steps: number;
}

export interface PipelineStage {
  label: string;
  status: StageStatus;
  detail: string;
}

export interface Pipeline {
  label: string;
  stages: PipelineStage[];
}

export interface ScalingSeries {
  id: string;
  label: string;
  modelId: string | null;
  points: { x: number; y: number }[];
}

export interface ComputeScaling {
  label: string;
  xLabel: string;
  yLabel: string;
  yUnit: string;
  series: ScalingSeries[];
}

export interface StageMetric {
  key: string;
  label: string;
  /** True when every value is a 0–1 share, printed as a percentage. */
  share: boolean;
}

export interface ReasoningOrchestrationModel {
  empty: boolean;
  title: string;
  subtitle: string;
  models: ReasoningModel[];
  stages: ReasoningStage[];
  nodes: ReasoningNode[];
  links: ReasoningLink[];
  paths: ReasoningPath[];
  /** The highlighted path: one of `paths`, or null when none was named. */
  activePathId: string | null;
  annotations: ReasoningAnnotation[];
  maxDepth: number;
  summaryLabel: string;
  summary: Metric[];
  summaryText: string;
  criterion: string;
  stageMetric: StageMetric | null;
  benchmarks: Metric[];
  entropy: EntropyStrip | null;
  pipeline: Pipeline | null;
  scaling: ComputeScaling | null;
  /** Nodes and links left out past the caps, lowest priority first. */
  dropped: { nodes: number; links: number };
}
