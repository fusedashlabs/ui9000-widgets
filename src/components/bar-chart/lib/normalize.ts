import type { DataPoint } from '../../../types/index.js';
import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { BarChartData, BarSeries } from './types.js';

function cleanPoints(points: { x: unknown; y: unknown }[]): BarSeries['points'] {
  return points
    .filter((p) => p.x != null && p.y != null && Number.isFinite(Number(p.y)))
    .map((p) => ({ x: String(p.x), y: Number(p.y) }));
}

function toSeries(list: BarSeries[]): BarSeries[] {
  return list.map((s, i) => ({
    id: s.id || `series-${i}`,
    name: s.name ?? s.id ?? `Series ${i + 1}`,
    color: s.color,
    points: cleanPoints(s.points ?? []),
  }));
}

function sortPointsByCategoryOrder(
  points: BarSeries['points'],
  order: string[],
): BarSeries['points'] {
  if (!order.length) return points;
  const orderMap = new Map(order.map((c, i) => [c, i]));
  return [...points].sort(
    (a, b) =>
      (orderMap.get(a.x) ?? Number.MAX_SAFE_INTEGER) -
      (orderMap.get(b.x) ?? Number.MAX_SAFE_INTEGER),
  );
}

function categoryAndValueKeys(widget: FuseWidgetLike): {
  categoryKey: string;
  valueKey: string;
} {
  const horizontal = widget.orientation === 'horizontal';
  const categoryKey =
    (horizontal ? firstField(widget.yAxe) : firstField(widget.xAxe)) ?? 'label';
  const valueKey =
    (horizontal ? firstField(widget.xAxe) : firstField(widget.yAxe)) ?? 'value';
  return { categoryKey, valueKey };
}

function fromFuseWidget(widget: FuseWidgetLike): BarSeries[] {
  const rows = rowsOf(widget);
  const { categoryKey, valueKey } = categoryAndValueKeys(widget);
  const groupKey = firstField(widget.groupBy);
  const formatting = widget.formatting;

  if (groupKey) {
    const byGroup = new Map<string, BarSeries['points']>();
    for (const row of rows) {
      const category = row[categoryKey];
      const value = Number(row[valueKey]);
      if (category == null || !Number.isFinite(value)) continue;
      const g = String(row[groupKey] ?? 'default');
      const pts = byGroup.get(g) ?? [];
      pts.push({ x: String(category), y: value });
      byGroup.set(g, pts);
    }
    const categoryKeys = new Set<string>();
    for (const row of rows) {
      const category = row[categoryKey];
      if (category != null) categoryKeys.add(String(category));
    }
    const categoryOrder = resolveUniqueValuesOrder(
      categoryKeys,
      widget.uniqueValues,
      categoryKey,
    );
    const keys = resolveUniqueValuesOrder(
      byGroup.keys(),
      widget.uniqueValues,
      groupKey,
    );
    return keys.map((id) => ({
      id,
      name: id,
      color: resolveFormattingColor(formatting, id, keys.length),
      points: sortPointsByCategoryOrder(byGroup.get(id) ?? [], categoryOrder),
    }));
  }

  const points: BarSeries['points'] = [];
  for (const row of rows) {
    const category = row[categoryKey];
    const value = Number(row[valueKey]);
    if (category == null || !Number.isFinite(value)) continue;
    points.push({ x: String(category), y: value });
  }

  const categoryOrder = resolveUniqueValuesOrder(
    points.map((p) => p.x),
    widget.uniqueValues,
    categoryKey,
  );
  const sortedPoints = sortPointsByCategoryOrder(points, categoryOrder);

  return sortedPoints.length
    ? [
        {
          id: 'default',
          name: 'Series',
          color: resolveFormattingColor(formatting, 'default', 1),
          points: sortedPoints,
        },
      ]
    : [];
}

/**
 * Normalize legacy `[{label,value}]`, chat payloads, and FuseDash widget rows.
 */
export function normalizeBarData(
  input:
    | DataPoint[]
    | BarChartData
    | BarSeries[]
    | FuseWidgetLike
    | null
    | undefined,
): BarSeries[] {
  if (!input) return [];

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    const first = input[0] as DataPoint | BarSeries;
    if ('points' in first && Array.isArray((first as BarSeries).points)) {
      return toSeries(input as BarSeries[]);
    }
    return [
      {
        id: 'default',
        name: 'Series',
        points: cleanPoints((input as DataPoint[]).map((d) => ({ x: d.label, y: d.value }))),
      },
    ];
  }

  if (input.series?.length) return toSeries(input.series);

  if (input.points?.length) {
    return [{ id: 'default', name: 'Series', points: cleanPoints(input.points) }];
  }

  return [];
}
