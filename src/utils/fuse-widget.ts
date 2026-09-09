/**
 * Shared helpers for FuseDash WidgetItem-shaped payloads from
 * `client/apps/charts/src/app/constants/default*.ts`.
 */

import type { AxisDetail } from './axis-units.js';
import type { FuseFormattingEntry } from './fuse-palette.js';
import type { FuseAxisDetail } from './format-text.js';

export type { FuseAxisDetail };

export type FuseWidgetLike = {
  chartType?: string;
  stacked?: boolean;
  xAxe?: string | string[] | null;
  yAxe?: string | string[] | null;
  groupBy?: string | string[] | null;
  /** Treemap nests this second dimension inside each `groupBy` card */
  subgroup?: string | null;
  /** Treemap / KPI measured column — takes precedence over `yAxe` */
  metric?: string | string[] | null;
  uniqueValues?: Record<string, string[]> | null;
  orientation?: string | null;
  formatting?: FuseFormattingEntry[] | null;
  markers?: Array<{ key?: string; shape?: string }> | null;
  axisDetails?: Record<string, AxisDetail> | null;
  /** Widget palette overrides — `range` pins the treemap color break points */
  palette?: { paletteId?: string; range?: number[] } | null;
  data?: unknown;
};

export function firstField(
  value: string | string[] | null | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    const v = value[0];
    return v != null && String(v) !== '' ? String(v) : undefined;
  }
  if (value == null || value === '') return undefined;
  return String(value);
}

/** True when payload looks like a FuseDash widget (`data` rows + axes). */
export function isFuseWidgetPayload(input: unknown): input is FuseWidgetLike {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const o = input as FuseWidgetLike;
  return Array.isArray(o.data);
}

/**
 * Categorical key for punchcard Y / grouping — mirrors client PunchcardChart:
 * `groupBy?.[0] ?? Object.keys(uniqueValues)[0]`.
 */
export function resolveGroupByKey(widget: FuseWidgetLike): string | undefined {
  const fromGroup = firstField(widget.groupBy ?? undefined);
  if (fromGroup) return fromGroup;
  const keys = widget.uniqueValues ? Object.keys(widget.uniqueValues) : [];
  return keys[0];
}

export function rowsOf(widget: FuseWidgetLike): Record<string, unknown>[] {
  if (!Array.isArray(widget.data)) return [];
  return widget.data.filter(
    (r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r),
  );
}

export function filterTruthyValues(values: string[]): string[] {
  return values.filter(
    (v) => v != null && v !== '' && v !== 'null' && v !== 'undefined',
  );
}

/**
 * Order categorical keys by FuseDash `uniqueValues[fieldKey]`, keeping any
 * extra data keys at the end in first-seen order.
 */
export function resolveUniqueValuesOrder(
  dataKeys: Iterable<string>,
  uniqueValues: Record<string, string[]> | null | undefined,
  fieldKey: string | undefined,
): string[] {
  const dataSet = new Set(dataKeys);
  const fromUv =
    fieldKey && uniqueValues?.[fieldKey]?.length
      ? filterTruthyValues(uniqueValues[fieldKey].map(String))
      : null;
  if (fromUv?.length) {
    const ordered = fromUv.filter((k) => dataSet.has(k));
    for (const k of dataSet) {
      if (!ordered.includes(k)) ordered.push(k);
    }
    return ordered;
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of dataKeys) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** Categorical x-axis order from a FuseDash widget mock. */
export function xDomainHintFromWidget(
  widget: FuseWidgetLike,
): string[] | undefined {
  const xKey = firstField(widget.xAxe ?? undefined);
  if (!xKey || !widget.uniqueValues?.[xKey]?.length) return undefined;
  return filterTruthyValues(widget.uniqueValues[xKey].map(String));
}
