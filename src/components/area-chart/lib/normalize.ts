import { stack } from 'd3-shape';

import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import { resolveWidgetMarkers } from '../../../utils/chart-formatting/index.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  xDomainHintFromWidget,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { MarkerShape } from '../../../utils/fusedash-visual.js';
import type { AreaChartInput, AreaLayout, AreaModel, AreaPoint, AreaSeries } from './types.js';

const EMPTY: AreaModel = { layout: 'grouped', series: [] };

function markerForKey(
  markers: ReturnType<typeof resolveWidgetMarkers>,
  key: string,
): MarkerShape {
  return (markers.find((m) => m.key === key)?.shape ?? 'donut') as MarkerShape;
}

function groupKeysFromData(
  rows: Array<Record<string, unknown>>,
  groupByKey: string,
): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const g = String(row[groupByKey] ?? '');
    if (g) keys.add(g);
  }
  return [...keys];
}

function xDomainFromWidget(widget: FuseWidgetLike, xKey: string): string[] {
  const rows = rowsOf(widget);
  const allX = Array.from(new Set(rows.map((r) => String(r[xKey] ?? '')))).filter(Boolean);
  const hint = widget.uniqueValues?.[xKey]?.map(String);
  if (hint?.length) {
    const filtered = hint.filter((x) => allX.includes(x));
    return filtered.length ? filtered : hint;
  }
  return resolveUniqueValuesOrder(allX, widget.uniqueValues, xKey);
}

function normalizeGrouped(widget: FuseWidgetLike): AreaSeries[] {
  const rows = rowsOf(widget);
  const xKey = firstField(widget.xAxe) ?? 'x';
  const yKey = firstField(widget.yAxe) ?? 'y';
  const groupKey = firstField(widget.groupBy);
  const xDomain = xDomainFromWidget(widget, xKey);
  const markers = resolveWidgetMarkers(widget);
  const formatting = widget.formatting;

  if (!groupKey) {
    const byX = new Map<string, number>();
    for (const row of rows) {
      const x = String(row[xKey] ?? '');
      const y = Number(row[yKey]);
      if (!x || !Number.isFinite(y)) continue;
      byX.set(x, y);
    }
    const points: AreaPoint[] = xDomain.map((x) => {
      const y = byX.get(x) ?? 0;
      return { x, y, y0: 0, y1: y };
    });
    if (!points.some((p) => p.y !== 0)) return [];
    return [
      {
        id: 'default',
        name: 'Series',
        color: resolveFormattingColor(formatting, 'default', 1),
        marker: markerForKey(markers, 'default'),
        points,
      },
    ];
  }

  const byGroup = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const x = String(row[xKey] ?? '');
    const y = Number(row[yKey]);
    const g = String(row[groupKey] ?? 'default');
    if (!x || !Number.isFinite(y)) continue;
    const map = byGroup.get(g) ?? new Map<string, number>();
    map.set(x, y);
    byGroup.set(g, map);
  }

  const groupIds = resolveUniqueValuesOrder(
    byGroup.keys(),
    widget.uniqueValues,
    groupKey,
  );

  return groupIds.map((id) => {
    const map = byGroup.get(id) ?? new Map<string, number>();
    const points: AreaPoint[] = xDomain.map((x) => {
      const y = map.get(x) ?? 0;
      return { x, y, y0: 0, y1: y };
    });
    return {
      id,
      name: id,
      color: resolveFormattingColor(formatting, id, groupIds.length),
      marker: markerForKey(markers, id),
      points,
    };
  });
}

function normalizeStacked(widget: FuseWidgetLike): AreaSeries[] {
  const rows = rowsOf(widget);
  const xKey = firstField(widget.xAxe) ?? 'x';
  const yKey = firstField(widget.yAxe) ?? 'y';
  const groupKey = firstField(widget.groupBy);
  if (!groupKey) return normalizeGrouped(widget);

  const xDomain = xDomainFromWidget(widget, xKey);
  const groupIds =
    widget.uniqueValues?.[groupKey]?.length
      ? (widget.uniqueValues[groupKey] as string[])
      : groupKeysFromData(rows, groupKey);

  const indexed = new Map<string, Map<string, Record<string, unknown>>>();
  for (const row of rows) {
    const x = String(row[xKey] ?? '');
    const g = String(row[groupKey] ?? '');
    if (!x || !g) continue;
    let groupMap = indexed.get(x);
    if (!groupMap) {
      groupMap = new Map();
      indexed.set(x, groupMap);
    }
    groupMap.set(g, row);
  }

  type StackRow = [string, Map<string, Record<string, unknown>>];
  const stackRows: StackRow[] = xDomain.map((x) => [x, indexed.get(x) ?? new Map()]);

  const stacked = stack<StackRow, string>()
    .keys(groupIds)
    .value(([, groupMap], key) => {
      const entry = groupMap.get(key);
      return entry ? Number(entry[yKey]) || 0 : 0;
    })(stackRows)
    .reverse();

  const markers = resolveWidgetMarkers(widget);
  const formatting = widget.formatting;

  return stacked.map((layer) => {
    const id = layer.key;
    const pointByX = new Map(layer.map((d) => [d.data[0], d]));
    const points: AreaPoint[] = xDomain
      .map((x) => {
        const d = pointByX.get(x);
        if (!d) return null;
        const y0 = Number(d[0]);
        const y1 = Number(d[1]);
        return { x, y: y1 - y0, y0, y1 };
      })
      .filter((p): p is AreaPoint => p != null);

    return {
      id,
      name: id,
      color: resolveFormattingColor(formatting, id, groupIds.length),
      marker: markerForKey(markers, id),
      points,
    };
  });
}

function isStackedWidget(widget: FuseWidgetLike): boolean {
  if ((widget as { chartType?: string }).chartType === 'areaStackedChart') return true;
  return Boolean(widget.stacked && firstField(widget.groupBy));
}

function fromFuseWidget(widget: FuseWidgetLike): AreaModel {
  const layout: AreaLayout = isStackedWidget(widget) ? 'stacked' : 'grouped';
  const series = layout === 'stacked' ? normalizeStacked(widget) : normalizeGrouped(widget);
  return {
    layout,
    series,
    xField: firstField(widget.xAxe),
    yField: firstField(widget.yAxe),
    groupField: firstField(widget.groupBy),
    axisDetails: widget.axisDetails as AreaModel['axisDetails'],
    uniqueValuesHint: xDomainHintFromWidget(widget),
  };
}

/** Normalize chat / FuseDash payloads into area series. */
export function normalizeAreaData(input: AreaChartInput): AreaModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length) return EMPTY;
    if ('points' in (input[0] as object)) {
      return { layout: 'grouped', series: input as AreaSeries[] };
    }
    return EMPTY;
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  if (typeof input === 'object') {
    const chart = input as AreaModel & AreaChartInput;
    if (Array.isArray(chart.series)) {
      return {
        layout: chart.layout ?? 'grouped',
        series: chart.series,
        xField: chart.xField,
        yField: chart.yField,
        groupField: chart.groupField,
        axisDetails: chart.axisDetails,
        uniqueValuesHint: chart.uniqueValuesHint,
      };
    }
  }

  return EMPTY;
}

export { collectXDomain } from '../../line-chart/lib/domain.js';
