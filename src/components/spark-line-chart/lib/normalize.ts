import type { DataPoint } from '../../../types/index.js';
import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { SparkLineChartData, SparkLineSeries } from './types.js';

function cleanPoints(points: { x: unknown; y: unknown }[]): SparkLineSeries['points'] {
  return points
    .filter((p) => p.x != null && p.y != null && Number.isFinite(Number(p.y)))
    .map((p) => ({ x: String(p.x), y: Number(p.y) }));
}

function fromFuseWidget(widget: FuseWidgetLike): SparkLineSeries[] {
  const rows = rowsOf(widget);
  const xKey = firstField(widget.xAxe) ?? 'x';
  const yKey = firstField(widget.yAxe) ?? 'y';
  const groupKey = firstField(widget.groupBy);
  const formatting = widget.formatting;

  if (groupKey) {
    const byGroup = new Map<string, SparkLineSeries['points']>();
    for (const row of rows) {
      const x = row[xKey];
      const y = Number(row[yKey]);
      if (x == null || !Number.isFinite(y)) continue;
      const g = String(row[groupKey] ?? 'default');
      const pts = byGroup.get(g) ?? [];
      pts.push({ x: String(x), y });
      byGroup.set(g, pts);
    }
    const keys = resolveUniqueValuesOrder(
      byGroup.keys(),
      widget.uniqueValues,
      groupKey,
    );
    return keys.map((id) => ({
      id,
      name: id,
      color: resolveFormattingColor(formatting, id, keys.length),
      points: byGroup.get(id)!,
    }));
  }

  const points = cleanPoints(
    rows.map((row) => ({ x: row[xKey], y: row[yKey] })),
  );
  return points.length
    ? [
        {
          id: 'default',
          name: 'Series',
          color: resolveFormattingColor(formatting, 'default', 1),
          points,
        },
      ]
    : [];
}

/** Normalize chat / FuseDash WidgetItem payloads into a datetime series list. */
export function normalizeSparkLineData(
  input:
    | DataPoint[]
    | SparkLineChartData
    | SparkLineSeries[]
    | FuseWidgetLike
    | null
    | undefined,
): SparkLineSeries[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    const first = input[0] as DataPoint | SparkLineSeries;
    if ('points' in first && Array.isArray((first as SparkLineSeries).points)) {
      return (input as SparkLineSeries[]).map((s, i) => ({
        id: s.id || `series-${i}`,
        name: s.name ?? s.id ?? `Series ${i + 1}`,
        color: s.color,
        points: cleanPoints(s.points ?? []),
      }));
    }
    return [
      {
        id: 'default',
        name: 'Series',
        points: cleanPoints(
          (input as DataPoint[]).map((d) => ({ x: d.label, y: d.value })),
        ),
      },
    ];
  }

  if (isFuseWidgetPayload(input) && !('series' in input) && !('points' in input)) {
    return fromFuseWidget(input);
  }

  const chart = input as SparkLineChartData;
  if (chart.series?.length) {
    return chart.series.map((s, i) => ({
      id: s.id || `series-${i}`,
      name: s.name ?? s.id ?? `Series ${i + 1}`,
      color: s.color,
      points: cleanPoints(s.points ?? []),
    }));
  }

  if (chart.points?.length) {
    return [
      {
        id: 'default',
        name: 'Series',
        points: cleanPoints(chart.points),
      },
    ];
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  return [];
}
