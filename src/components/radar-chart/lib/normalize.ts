import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import { resolveWidgetMarkers } from '../../../utils/chart-formatting/index.js';
import type { ChartMarkerShape } from '../../../utils/chart-formatting/types.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { RadarChartData, RadarModel, RadarPoint, RadarSeries } from './types.js';

type GroupedRows = Record<string, Array<{ x: string | number | undefined; y: number }>>;

function markerForKey(
  markers: ReturnType<typeof resolveWidgetMarkers>,
  key: string,
): ChartMarkerShape {
  return (markers.find((m) => m.key === key)?.shape ?? 'circle') as ChartMarkerShape;
}

function categoriesFromWidget(widget: FuseWidgetLike, xKey: string): string[] {
  const rows = rowsOf(widget);
  const fromUnique = widget.uniqueValues?.[xKey]?.map(String);
  if (fromUnique?.length) {
    return fromUnique.filter(
      (v) => v != null && v !== '' && v !== 'null' && v !== 'undefined',
    );
  }
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of rows) {
    const x = String(row[xKey] ?? '');
    if (!x || seen.has(x)) continue;
    seen.add(x);
    ordered.push(x);
  }
  return ordered;
}

/** Mirrors client `RadarChartGroupedData`. */
function groupRadarRows(widget: FuseWidgetLike): GroupedRows {
  const data = rowsOf(widget);
  const groupBy = firstField(widget.groupBy);
  const xKey = firstField(widget.xAxe);
  const yKey = firstField(widget.yAxe);
  if (!xKey || !yKey) return {};

  const xAxes = categoriesFromWidget(widget, xKey);
  let unsorted: GroupedRows = {};

  if (groupBy) {
    unsorted = data.reduce<GroupedRows>((acc, obj) => {
      const groupKey = String(obj[groupBy] ?? 'default');
      if (!acc[groupKey]) acc[groupKey] = [];
      const y = Number(obj[yKey]);
      if (!Number.isFinite(y)) return acc;
      acc[groupKey].push({
        x: (obj[xKey] as string | number | undefined) ?? undefined,
        y,
      });
      return acc;
    }, {});
  } else {
    unsorted = {
      default: data
        .map((l) => ({
          x: (l[xKey] as string | number | undefined) ?? undefined,
          y: Number(l[yKey]),
        }))
        .filter((d) => Number.isFinite(d.y)),
    };
  }

  return Object.keys(unsorted).reduce<GroupedRows>((acc, curr) => {
    const dataMap = new Map(unsorted[curr].map((d) => [String(d.x ?? ''), d]));
    acc[curr] = xAxes
      .map((key) => dataMap.get(String(key)))
      .filter((d): d is { x: string | number | undefined; y: number } => !!d);
    return acc;
  }, {});
}

function toSeriesPoint(
  category: string,
  value: number,
): RadarPoint | null {
  if (!Number.isFinite(value)) return null;
  return { category, value };
}

function fromFuseWidget(widget: FuseWidgetLike): RadarModel {
  const xKey = firstField(widget.xAxe) ?? 'x';
  const yKey = firstField(widget.yAxe) ?? 'y';
  const groupBy = firstField(widget.groupBy);
  const categories = categoriesFromWidget(widget, xKey);
  const grouped = groupRadarRows(widget);
  const markers = resolveWidgetMarkers(widget);
  const formatting = widget.formatting;

  const groupKeys = groupBy
    ? resolveUniqueValuesOrder(Object.keys(grouped), widget.uniqueValues, groupBy)
    : ['default'];

  const series: RadarSeries[] = [...groupKeys].reverse().flatMap((key, _index, arr) => {
    const rows = grouped[key] ?? [];
    if (!rows.length) return [];
    const points = categories.flatMap((cat, i) => {
      const row = rows[i];
      if (!row) return [];
      const pt = toSeriesPoint(cat, row.y);
      return pt ? [pt] : [];
    });
    if (!points.length) return [];
    const colorKey = groupBy ? key : 'default';
    return [
      {
        id: key,
        name: key === 'default' ? 'Series' : key,
        color: resolveFormattingColor(formatting, colorKey, arr.length),
        marker: markerForKey(markers, colorKey),
        points,
      },
    ];
  });

  return {
    series,
    categories,
    xField: xKey,
    yField: yKey,
    groupBy,
    axisDetails: widget.axisDetails ?? undefined,
  };
}

function pointCategory(
  p: { category?: string; label?: string; x?: string | number },
): string {
  if (p.category != null) return String(p.category);
  if (p.label != null) return String(p.label);
  if (p.x != null) return String(p.x);
  return '';
}

function pointValue(p: { value?: number; y?: number }): number {
  if (p.value != null) return Number(p.value);
  if (p.y != null) return Number(p.y);
  return NaN;
}

function fromChartData(input: RadarChartData): RadarModel {
  if (input.series?.length) {
    const categories =
      input.categories ??
      Array.from(
        new Set(
          input.series.flatMap((s) =>
            s.points.map((p) => pointCategory(p)).filter(Boolean),
          ),
        ),
      );
    const series: RadarSeries[] = input.series.map((s, i) => ({
      id: s.id || `series-${i}`,
      name: s.name ?? s.id ?? `Series ${i + 1}`,
      color: s.color,
      marker: s.marker ?? 'circle',
      points: categories.flatMap((cat) => {
        const match = s.points.find((p) => pointCategory(p) === cat);
        if (!match) return [];
        const pt = toSeriesPoint(cat, pointValue(match));
        return pt ? [pt] : [];
      }),
    }));
    return {
      series: series.filter((s) => s.points.length > 0),
      categories,
      xField: 'category',
      yField: 'value',
    };
  }

  if (input.points?.length) {
    const categories =
      input.categories ??
      input.points.map((p) => pointCategory(p)).filter(Boolean);
    const points = categories.flatMap((cat) => {
      const match = input.points!.find((p) => pointCategory(p) === cat);
      if (!match) return [];
      const pt = toSeriesPoint(cat, pointValue(match));
      return pt ? [pt] : [];
    });
    return {
      series: points.length
        ? [{ id: 'default', name: 'Series', marker: 'circle', points }]
        : [],
      categories,
      xField: 'category',
      yField: 'value',
    };
  }

  return { series: [], categories: [], xField: 'category', yField: 'value' };
}

/** Normalize chat / FuseDash WidgetItem payloads into radar model. */
export function normalizeRadarData(
  input:
    | RadarChartData
    | FuseWidgetLike
    | Array<{ label: string; value: number }>
    | null
    | undefined,
): RadarModel {
  if (!input) {
    return { series: [], categories: [], xField: 'category', yField: 'value' };
  }

  if (Array.isArray(input)) {
    const points = input
      .map((d) => toSeriesPoint(String(d.label), Number(d.value)))
      .filter((p): p is RadarPoint => p != null);
    const categories = points.map((p) => p.category);
    return {
      series: points.length
        ? [{ id: 'default', name: 'Series', marker: 'circle', points }]
        : [],
      categories,
      xField: 'category',
      yField: 'value',
    };
  }

  if (isFuseWidgetPayload(input) && !('series' in input) && !('points' in input)) {
    return fromFuseWidget(input);
  }

  return fromChartData(input as RadarChartData);
}
