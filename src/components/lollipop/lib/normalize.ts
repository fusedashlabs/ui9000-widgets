import type { DataPoint } from '../../../types/index.js';
import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { LollipopChartData, LollipopPoint, LollipopSeries } from './types.js';

function toPoint(d: DataPoint | LollipopPoint): LollipopPoint {
  if ('label' in d && 'value' in d) {
    return {
      label: String(d.label),
      value: Number(d.value),
      color: 'color' in d ? d.color : undefined,
    };
  }
  return { label: '', value: NaN };
}

function fromFuseWidget(widget: FuseWidgetLike): LollipopSeries[] {
  const rows = rowsOf(widget);
  const xKey = firstField(widget.xAxe) ?? 'label';
  const yKey = firstField(widget.yAxe) ?? 'value';
  const groupKey = firstField(widget.groupBy);
  const formatting = widget.formatting;

  if (groupKey) {
    const byGroup = new Map<string, LollipopPoint[]>();
    for (const row of rows) {
      const label = row[xKey];
      const value = Number(row[yKey]);
      if (label == null || !Number.isFinite(value)) continue;
      const g = String(row[groupKey] ?? 'default');
      const pts = byGroup.get(g) ?? [];
      pts.push({ label: String(label), value });
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

  // Client colors each category via formatting[key=label]
  const points: LollipopPoint[] = [];
  for (const row of rows) {
    const label = row[xKey];
    const value = Number(row[yKey]);
    if (label == null || !Number.isFinite(value)) continue;
    const labelStr = String(label);
    points.push({
      label: labelStr,
      value,
      color: resolveFormattingColor(formatting, labelStr, rows.length),
    });
  }
  return points.length ? [{ id: 'default', name: 'Series', points }] : [];
}

/** Normalize chat / FuseDash WidgetItem payloads into series list. */
export function normalizeLollipopData(
  input:
    | DataPoint[]
    | LollipopChartData
    | LollipopSeries[]
    | FuseWidgetLike
    | null
    | undefined,
): LollipopSeries[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    const first = input[0] as DataPoint | LollipopSeries;
    if ('points' in first && Array.isArray((first as LollipopSeries).points)) {
      return (input as LollipopSeries[]).map((s, i) => ({
        id: s.id || `series-${i}`,
        name: s.name ?? s.id ?? `Series ${i + 1}`,
        color: s.color,
        points: s.points
          .map(toPoint)
          .filter((p) => p.label !== '' && Number.isFinite(p.value)),
      }));
    }
    return [
      {
        id: 'default',
        name: 'Series',
        points: (input as DataPoint[])
          .map(toPoint)
          .filter((p) => p.label !== '' && Number.isFinite(p.value)),
      },
    ];
  }

  if (isFuseWidgetPayload(input) && !('series' in input) && !('points' in input)) {
    return fromFuseWidget(input);
  }

  const chart = input as LollipopChartData;
  if (chart.series?.length) {
    return chart.series.map((s, i) => ({
      id: s.id || `series-${i}`,
      name: s.name ?? s.id ?? `Series ${i + 1}`,
      color: s.color,
      points: s.points
        .map(toPoint)
        .filter((p) => p.label !== '' && Number.isFinite(p.value)),
    }));
  }

  if (chart.points?.length) {
    return [
      {
        id: 'default',
        name: 'Series',
        points: chart.points
          .map(toPoint)
          .filter((p) => p.label !== '' && Number.isFinite(p.value)),
      },
    ];
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  return [];
}
