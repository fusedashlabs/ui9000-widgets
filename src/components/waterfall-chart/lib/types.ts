export type WaterfallOrientation = 'horizontal' | 'vertical';

export type WaterfallVector = 'positive' | 'negative';

/** Semantic step kind — used when delta flags / chat `steps` are present. */
export type WaterfallKind = 'total' | 'increase' | 'decrease';

/**
 * How cumulative levels were derived.
 * - `delta-flags`: FuseDash mock rows with `isTotal` / `isPositive` / `isNegative`
 *   (signed deltas → cumulative levels; totals anchor at 0).
 * - `client-levels`: raw metric values treated as cumulative levels (client formula).
 * - `steps-payload`: chat `{ steps: [{ label, value, kind }] }`.
 * - `label-value`: simple `[{ label, value }]` as cumulative levels.
 */
export type WaterfallSourcePath =
  | 'delta-flags'
  | 'client-levels'
  | 'steps-payload'
  | 'label-value';

export interface WaterfallStep {
  label: string;
  start: number;
  end: number;
  difference: number;
  vector: WaterfallVector;
  kind: WaterfallKind;
  /** Running cumulative level after this step */
  level: number;
  index: number;
}

export interface WaterfallColors {
  positive: string;
  negative: string;
  /** First / total bar fill (flat gray in client) */
  total: string;
}

export interface WaterfallModel {
  steps: WaterfallStep[];
  orientation: WaterfallOrientation;
  colors: WaterfallColors;
  sourcePath: WaterfallSourcePath;
}

/** Chat shape: explicit waterfall steps. */
export interface WaterfallStepInput {
  label: string;
  value: number;
  kind?: WaterfallKind;
}

export interface WaterfallStepsPayload {
  steps: WaterfallStepInput[];
  orientation?: WaterfallOrientation;
}

export type WaterfallChartData =
  | WaterfallStepInput[]
  | Array<{ label: string; value: number }>
  | WaterfallStepsPayload
  | Record<string, unknown>;
