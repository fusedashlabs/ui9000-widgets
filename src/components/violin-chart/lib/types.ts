export type ViolinOrientation = 'vertical' | 'horizontal';

/** One category violin: raw samples + optional resolved color. */
export interface ViolinGroup {
  id: string;
  samples: number[];
  color?: string;
}

export interface ViolinModel {
  orientation: ViolinOrientation;
  groups: ViolinGroup[];
  valueKey: string;
  categoryKey: string;
}

/** Chat / story shape: pre-grouped samples. */
export interface ViolinGroupsPayload {
  orientation?: ViolinOrientation;
  groups: Array<{
    id?: string;
    label?: string;
    samples: number[];
    color?: string;
  }>;
}

/** FuseDash widget-shaped payload (apps/charts defaultViolin). */
export interface FuseDashViolinPayload {
  orientation?: ViolinOrientation | string | null;
  xAxe?: string | string[] | null;
  yAxe?: string | string[] | null;
  uniqueValues?: Record<string, string[]> | null;
  formatting?: Array<{ key?: string; color?: string | number }> | null;
  data: Array<Record<string, string | number | null | undefined>>;
  name?: string;
  chartType?: string;
}

export type ViolinChartData =
  | ViolinGroup[]
  | ViolinGroupsPayload
  | FuseDashViolinPayload;
