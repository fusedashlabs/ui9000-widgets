import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveGroupByKey,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { computeAverageSeries, toNumber } from './series.js';
import type {
  IcePoint,
  IceSeries,
  PartialDependenceChartData,
  PartialDependenceModel,
} from './types.js';

const EMPTY: PartialDependenceModel = {
  iceSeries: [],
  averageSeries: [],
  xField: '',
  yField: '',
  color: resolveFormattingColor(undefined, 'default', 1),
};

/** The chart always recomputes the average, so a supplied one is dropped. */
const AVERAGE_KEY = /average/i;

function buildModel(
  curves: Map<string, IcePoint[]>,
  order: string[],
  fields: {
    xField: string;
    yField: string;
    groupField?: string;
    color: string;
    axisDetails?: PartialDependenceModel['axisDetails'];
  },
): PartialDependenceModel {
  for (const [key, points] of curves) {
    if (AVERAGE_KEY.test(key)) {
      curves.delete(key);
      continue;
    }
    points.sort((a, b) => a.x - b.x);
  }

  const iceSeries: IceSeries[] = order
    .filter((key) => curves.has(key))
    .map((key) => ({ key, points: curves.get(key) as IcePoint[] }));

  if (!iceSeries.length) return { ...EMPTY, ...fields };

  return {
    iceSeries,
    averageSeries: computeAverageSeries(iceSeries.map((s) => s.points)),
    ...fields,
  };
}

function fromRows(
  rows: Array<{ x: unknown; y: unknown; group?: unknown }>,
): PartialDependenceModel {
  const curves = new Map<string, IcePoint[]>();
  const order: string[] = [];
  for (const row of rows) {
    const x = toNumber(row.x);
    const y = toNumber(row.y);
    if (x == null || y == null) continue;
    const key = row.group != null ? String(row.group) : 'default';
    let points = curves.get(key);
    if (!points) {
      points = [];
      curves.set(key, points);
      order.push(key);
    }
    points.push({ x, y });
  }
  return buildModel(curves, order, {
    xField: 'x',
    yField: 'y',
    groupField: order.length > 1 || order[0] !== 'default' ? 'group' : undefined,
    color: resolveFormattingColor(undefined, 'default', 1),
  });
}

function fromIceSeries(
  series: Array<{ key?: unknown; points?: Array<{ x: unknown; y: unknown }> }>,
  fields: {
    xField?: string;
    yField?: string;
    groupField?: string;
    color?: string;
    axisDetails?: PartialDependenceModel['axisDetails'];
  },
): PartialDependenceModel {
  const curves = new Map<string, IcePoint[]>();
  const order: string[] = [];
  series.forEach((entry, index) => {
    const key = String(entry.key ?? index);
    const points: IcePoint[] = [];
    for (const p of entry.points ?? []) {
      const x = toNumber(p.x);
      const y = toNumber(p.y);
      if (x == null || y == null) continue;
      points.push({ x, y });
    }
    if (!points.length) return;
    curves.set(key, points);
    order.push(key);
  });
  return buildModel(curves, order, {
    xField: fields.xField ?? 'x',
    yField: fields.yField ?? 'y',
    groupField: fields.groupField,
    color: fields.color ?? resolveFormattingColor(undefined, 'default', 1),
    axisDetails: fields.axisDetails,
  });
}

function fromSeries(
  series: Array<{ id?: string; name?: string; points?: Array<{ x: unknown; y: unknown }> }>,
): PartialDependenceModel {
  const curves = new Map<string, IcePoint[]>();
  const order: string[] = [];
  series.forEach((entry, index) => {
    const key = String(entry.name ?? entry.id ?? index);
    const points: IcePoint[] = [];
    for (const p of entry.points ?? []) {
      const x = toNumber(p.x);
      const y = toNumber(p.y);
      if (x == null || y == null) continue;
      points.push({ x, y });
    }
    if (!points.length) return;
    curves.set(key, points);
    order.push(key);
  });
  return buildModel(curves, order, {
    xField: 'x',
    yField: 'y',
    groupField: 'series',
    color: resolveFormattingColor(undefined, 'default', 1),
  });
}

function fromFuseWidget(widget: FuseWidgetLike): PartialDependenceModel {
  const rows = rowsOf(widget);
  const xField = firstField(widget.xAxe ?? undefined) ?? 'x';
  const yField = firstField(widget.yAxe ?? undefined) ?? 'y';
  const groupField = resolveGroupByKey(widget) ?? 'series';

  const curves = new Map<string, IcePoint[]>();
  for (const row of rows) {
    const x = toNumber(row[xField]);
    const y = toNumber(row[yField]);
    if (x == null || y == null) continue;
    const key = String(row[groupField] ?? 'default');
    let points = curves.get(key);
    if (!points) {
      points = [];
      curves.set(key, points);
    }
    points.push({ x, y });
  }

  const order = resolveUniqueValuesOrder([...curves.keys()], widget.uniqueValues, groupField);

  return buildModel(curves, order, {
    xField,
    yField,
    groupField,
    // The client paints every ICE curve and the average in one brand color, so
    // the widget's formatting is read once instead of per group.
    color: resolveFormattingColor(widget.formatting, 'default', 1),
    axisDetails: widget.axisDetails ?? undefined,
  });
}

/** Normalize chat / FuseDash WidgetItem payloads into ICE curves plus the average. */
export function normalizePartialDependenceData(
  input: PartialDependenceChartData,
): PartialDependenceModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length) return EMPTY;
    const first = input[0] as Record<string, unknown>;
    if ('x' in first && 'y' in first) {
      return fromRows(input as Array<{ x: unknown; y: unknown; group?: unknown }>);
    }
    if ('label' in first && 'value' in first) {
      return fromRows(
        (input as Array<{ label: string | number; value: number }>).map((d) => ({
          x: d.label,
          y: d.value,
        })),
      );
    }
    return EMPTY;
  }

  if (isFuseWidgetPayload(input)) return fromFuseWidget(input);

  if (typeof input === 'object') {
    const candidate = input as Partial<PartialDependenceModel> & {
      points?: Array<{ x: unknown; y: unknown }>;
      series?: Array<{ id?: string; name?: string; points?: Array<{ x: unknown; y: unknown }> }>;
    };
    if (Array.isArray(candidate.iceSeries)) {
      return fromIceSeries(candidate.iceSeries, {
        xField: candidate.xField,
        yField: candidate.yField,
        groupField: candidate.groupField,
        color: candidate.color,
        axisDetails: candidate.axisDetails,
      });
    }
    if (Array.isArray(candidate.series)) return fromSeries(candidate.series);
    if (Array.isArray(candidate.points)) {
      return fromRows(candidate.points.map((p) => ({ x: p.x, y: p.y })));
    }
  }

  return EMPTY;
}
