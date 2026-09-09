import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { FD } from '../../../utils/fusedash-visual.js';
import type {
  BiasVarianceChartInput,
  BiasVarianceDomainLimit,
  BiasVarianceModel,
  BiasVariancePoint,
  BiasVarianceSeries,
} from './types.js';

const EMPTY: BiasVarianceModel = { series: [], domainsLimits: [] };

/**
 * Client widget palette — the FuseDash BiasVarianceTradeoffChart carries its own
 * `colors` array instead of going through `formatting`, so that stays the
 * default. An explicit `formatting` block on the payload still wins.
 */
function colorForSeries(
  formatting: FuseWidgetLike['formatting'],
  key: string,
  index: number,
  seriesCount: number,
): string {
  const hasKey = formatting?.some((entry) => String(entry.key) === key);
  if (hasKey) return resolveFormattingColor(formatting, key, seriesCount);
  return FD.biasVarianceSeries[index % FD.biasVarianceSeries.length];
}

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function sortPoints(points: BiasVariancePoint[]): BiasVariancePoint[] {
  return points.sort((a, b) => a.x - b.x);
}

/** `domainsLimits` is optional on the widget and hand-authored — keep only usable entries. */
function normalizeDomainLimits(raw: unknown): BiasVarianceDomainLimit[] {
  if (!Array.isArray(raw)) return [];
  const limits: BiasVarianceDomainLimit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as { values?: unknown; color?: unknown; orientation?: unknown };
    if (!Array.isArray(entry.values)) continue;
    const values = entry.values
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v))
      .slice(0, 2);
    if (!values.length) continue;
    limits.push({
      values,
      color: typeof entry.color === 'string' ? entry.color : undefined,
      orientation: entry.orientation === 'vertical' ? 'vertical' : 'horizontal',
    });
  }
  return limits;
}

function fromFuseWidget(widget: FuseWidgetLike): BiasVarianceModel {
  const rows = rowsOf(widget);
  const xKey = firstField(widget.xAxe ?? undefined) ?? 'x';
  const yKey = firstField(widget.yAxe ?? undefined) ?? 'y';
  const seriesKey = firstField(widget.groupBy ?? undefined) ?? 'series';

  const byGroup = new Map<string, BiasVariancePoint[]>();
  for (const row of rows) {
    const x = toNumber(row[xKey]);
    const y = toNumber(row[yKey]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const id = String(row[seriesKey] ?? '');
    const points = byGroup.get(id) ?? [];
    points.push({ x, y });
    byGroup.set(id, points);
  }

  const ids = resolveUniqueValuesOrder(byGroup.keys(), widget.uniqueValues, seriesKey);
  const series = ids
    .filter((id) => byGroup.has(id))
    .map((id, index) => ({
      id,
      name: id,
      color: colorForSeries(widget.formatting, id, index, ids.length),
      points: sortPoints(byGroup.get(id) ?? []),
    }))
    .filter((s) => s.points.length > 0);

  return {
    series,
    domainsLimits: normalizeDomainLimits(
      (widget as { domainsLimits?: unknown }).domainsLimits,
    ),
    xField: firstField(widget.xAxe ?? undefined),
    yField: firstField(widget.yAxe ?? undefined),
    groupField: firstField(widget.groupBy ?? undefined),
    axisDetails: widget.axisDetails as BiasVarianceModel['axisDetails'],
  };
}

function fromSeriesList(list: BiasVarianceSeries[]): BiasVarianceSeries[] {
  return list
    .map((s, index) => ({
      id: s.id,
      name: s.name ?? s.id,
      color: s.color ?? FD.biasVarianceSeries[index % FD.biasVarianceSeries.length],
      points: sortPoints(
        (s.points ?? [])
          .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      ),
    }))
    .filter((s) => s.points.length > 0);
}

/** `[{ label, value }]` — labels are the complexity steps, index when not numeric. */
function fromLabelValues(rows: Array<{ label?: unknown; value?: unknown }>): BiasVarianceSeries[] {
  const points: BiasVariancePoint[] = [];
  rows.forEach((row, index) => {
    const parsed = Number(row.label);
    const x = Number.isFinite(parsed) ? parsed : index;
    const y = Number(row.value);
    if (!Number.isFinite(y)) return;
    points.push({ x, y });
  });
  if (!points.length) return [];
  return [
    {
      id: 'default',
      name: 'Series',
      color: FD.biasVarianceSeries[0],
      points: sortPoints(points),
    },
  ];
}

/** Normalize FuseDash widget / chat payloads into tradeoff curves. */
export function normalizeBiasVarianceData(
  input: BiasVarianceChartInput,
): BiasVarianceModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length) return EMPTY;
    const first = input[0] as unknown as Record<string, unknown>;
    if ('points' in first) {
      return { ...EMPTY, series: fromSeriesList(input as BiasVarianceSeries[]) };
    }
    if ('label' in first && 'value' in first) {
      return {
        ...EMPTY,
        series: fromLabelValues(input as unknown as Array<{ label: unknown; value: unknown }>),
      };
    }
    return EMPTY;
  }

  if (isFuseWidgetPayload(input)) return fromFuseWidget(input);

  if (typeof input === 'object') {
    const chart = input as { series?: unknown; points?: unknown; domainsLimits?: unknown };
    const domainsLimits = normalizeDomainLimits(chart.domainsLimits);
    if (Array.isArray(chart.series)) {
      return {
        series: fromSeriesList(chart.series as BiasVarianceSeries[]),
        domainsLimits,
      };
    }
    if (Array.isArray(chart.points)) {
      return {
        series: fromSeriesList([
          { id: 'default', name: 'Series', points: chart.points as BiasVariancePoint[] },
        ]),
        domainsLimits,
      };
    }
  }

  return EMPTY;
}
