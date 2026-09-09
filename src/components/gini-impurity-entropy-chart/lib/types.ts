import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';

/** One sample of an impurity curve: probability `p` → metric `value`. */
export interface GiniSeriesPoint {
  p: number;
  value: number;
}

export interface GiniSeries {
  /** Metric column name — `entropy`, `gini`, `mis`, … */
  id: string;
  /** Display name for legend / tooltip */
  name: string;
  color: string;
  /** SVG `stroke-dasharray`; undefined draws a solid curve */
  dash?: string;
  points: GiniSeriesPoint[];
}

/**
 * Decision-tree annotations the client reads from `widget.meta`. Each one is
 * off unless the host turns it on, matching the client `showPHat` / `showCI` /
 * `showSplit` props.
 */
export interface GiniOverlays {
  /** Observed class proportion — drawn as a vertical guide */
  pHat?: number;
  /** Confidence interval around `pHat` — drawn as a shaded band */
  ci?: [number, number];
  /** Candidate split; the annotation reports its Gini reduction */
  split?: { pLeft: number; nLeft?: number; pRight: number; nRight?: number };
  showPHat: boolean;
  showCI: boolean;
  showSplit: boolean;
}

export interface GiniImpurityEntropyModel {
  series: GiniSeries[];
  xLabel: string;
  yLabel: string;
  overlays: GiniOverlays;
}

/** Chat payload: one metric per series, x carried as a number. */
export interface GiniImpurityEntropyChartData {
  points?: Array<{ x: number | string; y: number }>;
  series?: Array<{
    id: string;
    name?: string;
    color?: string;
    dash?: string;
    points: Array<{ x: number | string; y: number }>;
  }>;
  xLabel?: string;
  yLabel?: string;
  meta?: Partial<GiniOverlays>;
}

/** FuseDash `DEFAULT_GINI_IMPUITY_ENTROPY` plus the fields this widget reads. */
export type GiniImpurityEntropyFusePayload = FuseWidgetLike & {
  name?: string;
  axisDetails?: Record<string, { label?: string }> | null;
  meta?: Partial<GiniOverlays> | null;
};

/** Client fallback when `yAxe` carries no metric columns. */
export const DEFAULT_SERIES_KEYS = ['entropy', 'gini', 'mis'];

/** Client `DEFAULT_SERIES_STYLE` — fixed look for the three known metrics. */
export const DEFAULT_SERIES_STYLE: Record<
  string,
  { color: string; dash?: string }
> = {
  entropy: { color: '#36C4A5' },
  gini: { color: '#473DD9', dash: '5,5' },
  mis: { color: '#56546D', dash: '5,5' },
};

/** Client `SERIES_LABELS`. */
export const SERIES_LABELS: Record<string, string> = {
  entropy: 'Entropy',
  gini: 'Gini Impurity',
  mis: 'Misclassification Error',
};

/** Client default when `axisDetails.value.label` is absent. */
export const DEFAULT_Y_LABEL = 'Impurity Index';
