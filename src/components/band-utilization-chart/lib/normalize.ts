import type { AxisDetail } from '../../../utils/axis-units.js';
import { resolveFormattingColor, type FuseFormattingEntry } from '../../../utils/fuse-palette.js';
import { seriesColor } from '../../../utils/fusedash-visual.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { BAND_WHOLE, placeOnWhole } from './layout.js';
import { formatShare, unitCaption } from './format.js';
import type { BandModel, BandRow, BandSeries } from './types.js';

const EMPTY: BandModel = {
  title: '',
  unit: '',
  legend: true,
  tooltip: true,
  series: [],
  rows: [],
  empty: true,
};

const SUM_EPSILON = 0.001;

type ShareDetail = AxisDetail & { subtype?: string };

type Widget = FuseWidgetLike & {
  name?: string;
  legend?: boolean;
  tooltip?: boolean;
  colors?: string[];
  axisLabels?: Array<{ key?: string; suffix?: string }>;
};

function finite(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function fieldList(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter((item) => item !== '');
  if (value == null || value === '') return [];
  return [String(value)];
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function labelSuffix(widget: Widget, field: string): string {
  const match = widget.axisLabels?.find((item) => String(item?.key ?? '') === field);
  return String(match?.suffix ?? '').trim();
}

function detailFor(widget: Widget, field: string): ShareDetail | undefined {
  const raw = widget.axisDetails?.[field];
  const detail: ShareDetail | undefined =
    raw && typeof raw === 'object' ? { ...raw } : undefined;
  const mark = (detail?.measure_unit_symbol ?? detail?.measure_unit ?? '').trim();
  if (mark) return detail;
  const suffix = labelSuffix(widget, field);
  if (!suffix) return detail;
  return { ...detail, measure_unit: suffix };
}

function segmentColor(
  formatting: FuseFormattingEntry[] | null | undefined,
  key: string,
  index: number,
  count: number,
  colors?: string[],
): string {
  const entry = formatting?.find((item) => String(item.key) === key);
  if (entry) return resolveFormattingColor(formatting, key, count);
  const hex = colors?.[index];
  if (typeof hex === 'string' && hex.trim()) return seriesColor(index, hex.trim());
  return seriesColor(index);
}

function paint(keys: string[], widget: Widget): BandSeries[] {
  return keys.map((key, index) => ({
    id: key,
    name: key,
    color: segmentColor(widget.formatting, key, index, keys.length, widget.colors),
  }));
}

function rowsFromMatrix(
  order: string[],
  groups: BandSeries[],
  valueAt: (row: string, group: string) => number,
  detailAt: (groupId: string) => ShareDetail | undefined,
): BandRow[] {
  return order.map((label) => {
    const values = groups.map((group) => valueAt(label, group.id));
    const placed = placeOnWhole(values);
    const sum = values.reduce((acc, value) => acc + value, 0);
    return {
      label,
      sum,
      complete: Math.abs(sum - BAND_WHOLE) <= SUM_EPSILON,
      segments: groups.map((group, index) => ({
        seriesId: group.id,
        name: group.name,
        value: values[index] ?? 0,
        text: formatShare(values[index] ?? 0, detailAt(group.id)),
        color: group.color,
        start: placed[index]?.start ?? 0,
        span: placed[index]?.span ?? 0,
      })),
    };
  });
}

/** Caption prefers the first column that actually carries a unit. */
function captionDetail(widget: Widget, fields: string[]): ShareDetail | undefined {
  let fallback: ShareDetail | undefined;
  for (const field of fields) {
    const detail = detailFor(widget, field);
    if (!detail) continue;
    fallback ??= detail;
    if (unitCaption(detail)) return detail;
  }
  return fallback;
}

/**
 * Long widget rows: `yAxe` is the entity, `xAxe` is the share, `groupBy` is the segment.
 * Same fields as a horizontal stacked bar. Values stay as written — a short row is not rescaled.
 */
function fromGrouped(widget: Widget, rowKey: string, valueKey: string, groupKey: string): BandModel {
  const totals = new Map<string, Map<string, number>>();
  const rowSeen: string[] = [];
  const groupSeen: string[] = [];

  for (const record of rowsOf(widget)) {
    const entity = record[rowKey];
    const group = record[groupKey];
    const value = finite(record[valueKey]);
    if (entity == null || entity === '' || group == null || group === '') continue;
    if (value === undefined) continue;
    const rowLabel = String(entity);
    const groupLabel = String(group);
    if (!totals.has(rowLabel)) {
      totals.set(rowLabel, new Map());
      rowSeen.push(rowLabel);
    }
    if (!groupSeen.includes(groupLabel)) groupSeen.push(groupLabel);
    const bucket = totals.get(rowLabel)!;
    bucket.set(groupLabel, (bucket.get(groupLabel) ?? 0) + value);
  }

  const rowOrder = resolveUniqueValuesOrder(rowSeen, widget.uniqueValues, rowKey);
  const groupOrder = resolveUniqueValuesOrder(groupSeen, widget.uniqueValues, groupKey);
  const series = paint(groupOrder, widget);
  const detail = detailFor(widget, valueKey);
  const rows = rowsFromMatrix(
    rowOrder,
    series,
    (row, group) => totals.get(row)?.get(group) ?? 0,
    () => detail,
  );
  return finish(widget, series, rows, detail);
}

/**
 * Wide widget rows: `xAxe` is the entity and each `yAxe` column is one share.
 * Used when the dataset has no `groupBy`.
 */
function fromWide(widget: Widget, rowKey: string, shareKeys: string[]): BandModel {
  const rowSeen: string[] = [];
  const byRow = new Map<string, Record<string, number>>();

  for (const record of rowsOf(widget)) {
    const entity = record[rowKey];
    if (entity == null || entity === '') continue;
    const rowLabel = String(entity);
    if (!byRow.has(rowLabel)) {
      byRow.set(rowLabel, {});
      rowSeen.push(rowLabel);
    }
    const bucket = byRow.get(rowLabel)!;
    for (const key of shareKeys) {
      const value = finite(record[key]);
      if (value === undefined) continue;
      bucket[key] = (bucket[key] ?? 0) + value;
    }
  }

  const present = shareKeys.filter((key) =>
    [...byRow.values()].some((bucket) => bucket[key] !== undefined),
  );
  const rowOrder = resolveUniqueValuesOrder(rowSeen, widget.uniqueValues, rowKey);
  const series = paint(present, widget);
  const rows = rowsFromMatrix(
    rowOrder,
    series,
    (row, group) => byRow.get(row)?.[group] ?? 0,
    (group) => detailFor(widget, group),
  );
  return finish(widget, series, rows, captionDetail(widget, present));
}

function finish(
  widget: Widget,
  series: BandSeries[],
  rows: BandRow[],
  detail: ShareDetail | undefined,
): BandModel {
  const title = widget.name?.trim() ?? '';
  const legend = flag(widget.legend, true);
  const tooltip = flag(widget.tooltip, true);
  if (!series.length || !rows.length) {
    return { ...EMPTY, title, legend, tooltip, unit: unitCaption(detail) };
  }
  return {
    title,
    unit: unitCaption(detail),
    legend,
    tooltip,
    series,
    rows,
    empty: false,
  };
}

/**
 * WidgetItem only. Row, share, and segment come from `yAxe` / `xAxe` / `groupBy`
 * (or from `xAxe` + several `yAxe` columns). Nothing is invented beside those fields.
 */
export function normalizeBandUtilization(input: unknown): BandModel {
  if (!isFuseWidgetPayload(input)) return EMPTY;
  const widget = input as Widget;
  const groupKey = firstField(widget.groupBy);
  const yFields = fieldList(widget.yAxe);
  const xKey = firstField(widget.xAxe);

  if (groupKey && yFields[0] && xKey) {
    return fromGrouped(widget, yFields[0], xKey, groupKey);
  }
  if (!groupKey && xKey && yFields.length > 1) {
    return fromWide(widget, xKey, yFields);
  }
  return { ...EMPTY, title: widget.name?.trim() ?? '' };
}
