import type { ChartKind } from '../../../lazy/index.js';

export type ChartTargetAttrs = Record<string, string | boolean | number>;

export interface ChartTarget {
  kind: ChartKind;
  tag: string;
  attrs?: ChartTargetAttrs;
}

export interface ChartMetadataLike {
  id: string;
  tag: string;
  chartTypeKeys?: string[];
  chartTypeMap?: Record<string, Record<string, unknown>>;
  /** When `hostReady` is false, `canRenderChartType` stays closed (hosts keep iframe / empty). */
  usageConditions?: {
    hostReady?: boolean;
    [key: string]: unknown;
  };
}
