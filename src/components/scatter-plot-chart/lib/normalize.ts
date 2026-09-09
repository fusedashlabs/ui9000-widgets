import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  resolveWidgetFormatting,
  resolveWidgetMarkers,
} from '../../../utils/chart-formatting/index.js';
import type { ChartMarkerShape } from '../../../utils/chart-formatting/types.js';
import {
  firstField,
  filterTruthyValues,
  isFuseWidgetPayload,
  resolveGroupByKey,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type {
  ScatterChartData,
  ScatterGroup,
  ScatterModel,
  ScatterPoint,
} from './types.js';

const EMPTY: ScatterModel = { points: [], xField: '', yField: '', groups: [] };

function isNumericField(rows: Record<string, unknown>[], field: string): boolean {
  return Boolean(field) && rows.some((row) => Number.isFinite(Number(row[field])));
}

function resolveNumericField(
  rows: Record<string, unknown>[],
  preferred: string | undefined,
  exclude: string,
  groupField?: string,
): string {
  if (preferred && isNumericField(rows, preferred)) return preferred;
  if (!rows.length) return preferred ?? '';
  for (const key of Object.keys(rows[0] ?? {})) {
    if (key === exclude || key === groupField) continue;
    if (isNumericField(rows, key)) return key;
  }
  return preferred ?? '';
}

function markerForGroup(
  markers: Array<{ key: string; shape: ChartMarkerShape }>,
  groupKey: string,
): ChartMarkerShape {
  return markers.find((m) => m.key === groupKey)?.shape ?? 'circle';
}

function fromChatPoints(
  rows: Array<{ x: number; y: number; group?: string; color?: string }>,
): ScatterModel {
  const points = rows
    .map((row) => {
      const x = Number(row.x);
      const y = Number(row.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const groupKey = row.group != null ? String(row.group) : 'default';
      const point: ScatterPoint = {
        x,
        y,
        groupKey,
        color: row.color ?? resolveFormattingColor(undefined, groupKey, rows.length),
        markerShape: 'circle',
        row: { x, y, group: groupKey },
      };
      return point;
    })
    .filter((p): p is ScatterPoint => p != null);

  const groupKeys = [...new Set(points.map((p) => p.groupKey))];
  const groups: ScatterGroup[] = groupKeys.map((key) => ({
    key,
    label: key,
    color: points.find((p) => p.groupKey === key)?.color ?? resolveFormattingColor(undefined, key, groupKeys.length),
    shape: 'circle',
  }));

  return {
    points,
    xField: 'x',
    yField: 'y',
    groupField: points.some((p) => p.groupKey !== 'default') ? 'group' : undefined,
    groups,
  };
}

function fromFuseWidget(widget: FuseWidgetLike): ScatterModel {
  const rows = rowsOf(widget);
  const configuredX = firstField(widget.xAxe);
  const configuredY = firstField(widget.yAxe);
  const groupField = resolveGroupByKey(widget);

  const xField = resolveNumericField(rows, configuredX, configuredY ?? '', groupField);
  const yField = resolveNumericField(rows, configuredY, xField, groupField);
  if (!xField || !yField) return EMPTY;

  const formatting = resolveWidgetFormatting(widget);
  const markers = resolveWidgetMarkers(widget);

  const groupKeys = groupField
    ? resolveUniqueValuesOrder(
        rows.map((row) => String(row[groupField] ?? '')).filter(Boolean),
        widget.uniqueValues,
        groupField,
      )
    : ['default'];

  const cleanGroups = groupField
    ? filterTruthyValues(groupKeys)
    : ['default'];

  const groups: ScatterGroup[] = cleanGroups.map((key) => ({
    key,
    label: key,
    color: resolveFormattingColor(formatting, key, cleanGroups.length),
    shape: markerForGroup(markers, key),
  }));

  const colorByGroup = new Map(groups.map((g) => [g.key, g.color]));
  const shapeByGroup = new Map(groups.map((g) => [g.key, g.shape]));

  const points: ScatterPoint[] = [];
  for (const row of rows) {
    const x = Number(row[xField]);
    const y = Number(row[yField]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const groupKey = groupField ? String(row[groupField] ?? 'default') : 'default';
    points.push({
      x,
      y,
      groupKey,
      color: colorByGroup.get(groupKey) ?? resolveFormattingColor(formatting, groupKey, groups.length),
      markerShape: shapeByGroup.get(groupKey) ?? 'circle',
      row,
    });
  }

  return {
    points,
    xField,
    yField,
    groupField: groupField ?? undefined,
    groups,
    axisDetails: (widget as FuseWidgetLike & {
      axisDetails?: ScatterModel['axisDetails'];
    }).axisDetails,
  };
}

/** Normalize chat / FuseDash WidgetItem payloads into scatter points. */
export function normalizeScatterData(input: ScatterChartData): ScatterModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length) return EMPTY;
    if ('x' in input[0] && 'y' in input[0]) {
      return fromChatPoints(input as Array<{ x: number; y: number; group?: string; color?: string }>);
    }
    return EMPTY;
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  if (typeof input === 'object' && Array.isArray((input as ScatterModel).points)) {
    return input as ScatterModel;
  }

  return EMPTY;
}
