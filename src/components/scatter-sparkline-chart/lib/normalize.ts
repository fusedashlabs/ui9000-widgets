import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  resolveWidgetFormatting,
  resolveWidgetMarkers,
} from '../../../utils/chart-formatting/index.js';
import type { ChartMarkerShape } from '../../../utils/chart-formatting/types.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { SparkLinePoint, SparkLineSeries } from '../../spark-line-chart/lib/types.js';
import type {
  ScatterSparklineChartData,
  ScatterSparklineModel,
  ScatterSparklineRawPoint,
} from './types.js';

const EMPTY: ScatterSparklineModel = {
  series: [],
  scatterPoints: [],
  xField: '',
  yField: '',
  lineColor: '#3b82f6',
  pointLegendColor: '#22c55e',
  lineLegendLabel: 'Line',
  pointLegendLabel: 'Points',
};

const DEFAULT_POINT_COLOR = '#22c55e';

function isFiniteNumber(v: unknown): boolean {
  return typeof v === 'number' ? Number.isFinite(v) : Number.isFinite(Number(v));
}

function markerForGroup(
  markers: Array<{ key: string; shape: ChartMarkerShape }>,
  groupKey: string,
): ChartMarkerShape {
  return markers.find((m) => m.key === groupKey)?.shape ?? 'circle';
}

function aggregateSeries(
  rows: Record<string, unknown>[],
  xKey: string,
  yKey: string,
  groupKey: string | undefined,
  isDatetimeX: boolean,
  formatting: ReturnType<typeof resolveWidgetFormatting>,
  uniqueValues: FuseWidgetLike['uniqueValues'],
): SparkLineSeries[] {
  const normalizedGroups = new Map<string, SparkLinePoint[]>();

  for (const item of rows) {
    const g = groupKey ? String(item[groupKey] ?? 'default') : 'default';
    const xRaw = item[xKey];
    const yRaw = item[yKey];
    if (xRaw == null || yRaw == null || !isFiniteNumber(yRaw)) continue;

    const xKeyNum = isDatetimeX
      ? new Date(String(xRaw)).getTime()
      : Number(xRaw);
    if (!Number.isFinite(xKeyNum)) continue;

    const pts = normalizedGroups.get(g) ?? [];
    pts.push({ x: String(xRaw), y: Number(yRaw) });
    normalizedGroups.set(g, pts);
  }

  const aggregated = new Map<string, SparkLinePoint[]>();

  for (const [g, pts] of normalizedGroups) {
    const byX = new Map<number, { sum: number; count: number; xStr: string }>();
    for (const row of pts) {
      const xNum = isDatetimeX
        ? new Date(row.x).getTime()
        : Number(row.x);
      if (!Number.isFinite(xNum) || !Number.isFinite(row.y)) continue;
      const prev = byX.get(xNum);
      if (!prev) {
        byX.set(xNum, { sum: row.y, count: 1, xStr: row.x });
      } else {
        prev.sum += row.y;
        prev.count += 1;
      }
    }

    const series = Array.from(byX.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, acc]) => ({
        x: acc.xStr,
        y: acc.count ? acc.sum / acc.count : 0,
      }));

    aggregated.set(g, series);
  }

  const keys = groupKey
    ? resolveUniqueValuesOrder(aggregated.keys(), uniqueValues, groupKey)
    : ['default'];

  return keys.map((id) => ({
    id,
    name: id === 'default' ? 'Series' : id,
    color: resolveFormattingColor(formatting, id, keys.length),
    points: aggregated.get(id) ?? [],
  }));
}

function fromFuseWidget(widget: FuseWidgetLike): ScatterSparklineModel {
  const rows = rowsOf(widget);
  const xKey = firstField(widget.xAxe) ?? 'x';
  const yKey = firstField(widget.yAxe) ?? 'y';
  const groupKey = firstField(widget.groupBy);
  const formatting = resolveWidgetFormatting(widget);
  const markers = resolveWidgetMarkers(widget);
  const hasFormatting = Boolean(widget.formatting?.length);

  const axisDetails = (widget as FuseWidgetLike & {
    axisDetails?: ScatterSparklineModel['axisDetails'];
  }).axisDetails;

  const isDatetimeX = axisDetails?.[xKey]?.type === 'datetime';

  const series = aggregateSeries(
    rows,
    xKey,
    yKey,
    groupKey,
    isDatetimeX,
    formatting,
    widget.uniqueValues,
  );

  const scatterPoints: ScatterSparklineRawPoint[] = [];
  for (const row of rows) {
    const xRaw = row[xKey];
    const yRaw = row[yKey];
    if (xRaw == null || !isFiniteNumber(yRaw)) continue;

    const g = groupKey ? String(row[groupKey] ?? 'default') : 'default';
    const groupColor = resolveFormattingColor(formatting, g, series.length || 1);
    const color = hasFormatting ? groupColor : DEFAULT_POINT_COLOR;

    scatterPoints.push({
      x: String(xRaw),
      y: Number(yRaw),
      groupKey: g,
      color,
      markerShape: markerForGroup(markers, g),
      row,
    });
  }

  const lineColor =
    resolveFormattingColor(formatting, 'default', 1) ?? EMPTY.lineColor;

  return {
    series,
    scatterPoints,
    xField: xKey,
    yField: yKey,
    groupField: groupKey,
    lineColor,
    pointLegendColor: DEFAULT_POINT_COLOR,
    lineLegendLabel: axisDetails?.[xKey]?.label ?? xKey,
    pointLegendLabel: axisDetails?.[yKey]?.label ?? yKey,
    axisDetails,
  };
}

/** Normalize chat / FuseDash WidgetItem payloads into scatter + aggregated line model. */
export function normalizeScatterSparklineData(
  input: ScatterSparklineChartData | FuseWidgetLike | null | undefined,
): ScatterSparklineModel {
  if (!input) return { ...EMPTY };

  if (isFuseWidgetPayload(input) && !('scatterPoints' in input)) {
    return fromFuseWidget(input);
  }

  const chart = input as ScatterSparklineChartData;
  if (chart.series?.length || chart.scatterPoints?.length) {
    return {
      ...EMPTY,
      series: chart.series ?? [],
      scatterPoints: chart.scatterPoints ?? [],
    };
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  return { ...EMPTY };
}
