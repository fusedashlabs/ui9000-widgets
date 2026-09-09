/** One point on a tradeoff curve — both axes are continuous. */
export interface BiasVariancePoint {
  x: number;
  y: number;
}

export interface BiasVarianceSeries {
  id: string;
  name?: string;
  color?: string;
  /** Sorted ascending by `x` */
  points: BiasVariancePoint[];
}

/** FuseDash `domainsLimits` entry — a reference line, or a band when it carries two values. */
export interface BiasVarianceDomainLimit {
  values: number[];
  color?: string;
  orientation: 'vertical' | 'horizontal';
}

export interface BiasVarianceAxisDetail {
  label?: string;
  measure_unit_symbol?: string;
}

/** One row of the crosshair tooltip. */
export interface BiasVarianceHoverEntry {
  seriesId: string;
  seriesName: string;
  color: string;
  value: number;
  /** The curve nearest the cursor — siblings are dimmed while it is hovered. */
  focused: boolean;
}

export interface BiasVarianceModel {
  series: BiasVarianceSeries[];
  domainsLimits: BiasVarianceDomainLimit[];
  xField?: string;
  yField?: string;
  groupField?: string;
  axisDetails?: Record<string, BiasVarianceAxisDetail>;
}

/** Chat shape: `{ series: [...] }` or `{ points: [...] }` for a single curve. */
export interface BiasVarianceChartData {
  series?: BiasVarianceSeries[];
  points?: BiasVariancePoint[];
  domainsLimits?: BiasVarianceDomainLimit[];
}

export type BiasVarianceChartInput =
  | BiasVarianceChartData
  | BiasVarianceSeries[]
  | Record<string, unknown>
  | null
  | undefined;
