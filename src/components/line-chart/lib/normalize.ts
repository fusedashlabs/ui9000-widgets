import type { DataPoint } from '../../../types/index.js';
import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { LineChartData, LineSeries } from './types.js';

function fromFuseWidget(widget: FuseWidgetLike): LineSeries[] {
  const rows = rowsOf(widget);
  const xKey = firstField(widget.xAxe) ?? 'x';
  const yKey = firstField(widget.yAxe) ?? 'y';
  const groupKey = firstField(widget.groupBy);
  const formatting = widget.formatting;

  if (groupKey) {
    const byGroup = new Map<string, LineSeries['points']>();
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

  const points: LineSeries['points'] = [];
  for (const row of rows) {
    const x = row[xKey];
    const y = Number(row[yKey]);
    if (x == null || !Number.isFinite(y)) continue;
    points.push({ x: String(x), y });
  }
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

/** Normalize chat / FuseDash WidgetItem payloads into series list. */
export function normalizeLineData(
  input:
    | DataPoint[]
    | LineChartData
    | LineSeries[]
    | FuseWidgetLike
    | null
    | undefined,
): LineSeries[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    const first = input[0] as DataPoint | LineSeries;
    if ('points' in first && Array.isArray((first as LineSeries).points)) {
      return input as LineSeries[];
    }
    return [
      {
        id: 'default',
        name: 'Series',
        points: (input as DataPoint[]).map((d) => ({
          x: String(d.label),
          y: Number(d.value),
        })),
      },
    ];
  }

  if (isFuseWidgetPayload(input) && !('series' in input) && !('points' in input)) {
    return fromFuseWidget(input);
  }

  const chart = input as LineChartData;
  if (chart.series?.length) {
    return chart.series.map((s, i) => ({
      id: s.id || `series-${i}`,
      name: s.name ?? s.id ?? `Series ${i + 1}`,
      color: s.color,
      points: s.points
        .filter((p) => Number.isFinite(p.y))
        .map((p) => ({ x: String(p.x), y: Number(p.y) })),
    }));
  }

  if (chart.points?.length) {
    return [
      {
        id: 'default',
        name: 'Series',
        points: chart.points
          .filter((p) => Number.isFinite(p.y))
          .map((p) => ({ x: String(p.x), y: Number(p.y) })),
      },
    ];
  }

  // Widget with both series-like keys absent but data rows present
  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  return [];
}
