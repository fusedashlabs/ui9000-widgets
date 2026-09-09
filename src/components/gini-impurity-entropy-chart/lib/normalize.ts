import type { DataPoint } from '../../../types/index.js';
import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  isFuseWidgetPayload,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { resolveOverlays } from './overlays.js';
import { extractSeriesFromData } from './series.js';
import {
  DEFAULT_SERIES_KEYS,
  DEFAULT_SERIES_STYLE,
  DEFAULT_Y_LABEL,
  SERIES_LABELS,
  type GiniImpurityEntropyChartData,
  type GiniImpurityEntropyFusePayload,
  type GiniImpurityEntropyModel,
  type GiniOverlays,
  type GiniSeries,
  type GiniSeriesPoint,
} from './types.js';

/** Host-supplied overlay switches; each falls back to the widget `meta`. */
export type GiniOverlayFlags = Pick<
  Partial<GiniOverlays>,
  'showPHat' | 'showCI' | 'showSplit'
>;

function emptyModel(flags: GiniOverlayFlags): GiniImpurityEntropyModel {
  return {
    series: [],
    xLabel: '',
    yLabel: DEFAULT_Y_LABEL,
    overlays: resolveOverlays(null, flags),
  };
}

/**
 * Client rule: `yAxe` names the metric columns, except for the placeholder
 * `"value"` the editor writes before a metric is picked.
 */
function resolveSeriesKeys(yAxe: FuseWidgetLike['yAxe']): string[] {
  const keys = Array.isArray(yAxe) ? yAxe.map(String).filter(Boolean) : [];
  if (keys.length > 0 && keys[0] !== 'value') return keys;
  return DEFAULT_SERIES_KEYS;
}

/** Fixed metric style first (client `DEFAULT_SERIES_STYLE`), palette after. */
function styleFor(
  key: string,
  index: number,
  count: number,
  formatting: FuseWidgetLike['formatting'],
): { color: string; dash?: string } {
  const preset = DEFAULT_SERIES_STYLE[key];
  if (preset) return preset;
  return {
    color: resolveFormattingColor(formatting, key, count),
    dash: index > 0 ? '5,5' : undefined,
  };
}

function toSeries(
  points: GiniSeriesPoint[],
  key: string,
  index: number,
  count: number,
  formatting: FuseWidgetLike['formatting'],
): GiniSeries {
  const { color, dash } = styleFor(key, index, count, formatting);
  return {
    id: key,
    name: SERIES_LABELS[key] ?? key,
    color,
    dash,
    points,
  };
}

function fromFuseWidget(
  widget: GiniImpurityEntropyFusePayload,
  flags: GiniOverlayFlags,
): GiniImpurityEntropyModel {
  const xField = firstField(widget.xAxe) ?? 'p';
  const keys = resolveSeriesKeys(widget.yAxe);
  const extracted = extractSeriesFromData(widget.data, xField, keys);

  const series = keys
    .filter((key) => extracted[key]?.length)
    .map((key, index, kept) =>
      toSeries(extracted[key], key, index, kept.length, widget.formatting),
    );

  return {
    series,
    xLabel: widget.axisDetails?.[xField]?.label ?? xField,
    yLabel: widget.axisDetails?.value?.label ?? DEFAULT_Y_LABEL,
    overlays: resolveOverlays(widget.meta, flags),
  };
}

function toPoints(
  raw: Array<{ x: number | string; y: number }>,
): GiniSeriesPoint[] {
  const points: GiniSeriesPoint[] = [];
  for (const item of raw) {
    const p = Number(item?.x);
    const value = Number(item?.y);
    if (!Number.isFinite(p) || !Number.isFinite(value)) continue;
    points.push({ p, value });
  }
  return points.sort((a, b) => a.p - b.p);
}

function fromChatPayload(
  chart: GiniImpurityEntropyChartData,
  flags: GiniOverlayFlags,
): GiniImpurityEntropyModel {
  const base = {
    xLabel: chart.xLabel ?? '',
    yLabel: chart.yLabel ?? DEFAULT_Y_LABEL,
    overlays: resolveOverlays(chart.meta, flags),
  };

  const rawSeries = chart.series ?? [];
  if (rawSeries.length) {
    const series: GiniSeries[] = [];
    rawSeries.forEach((s, index) => {
      const points = toPoints(s.points ?? []);
      if (!points.length) return;
      const preset = DEFAULT_SERIES_STYLE[s.id];
      series.push({
        id: s.id || `series-${index}`,
        name: s.name ?? SERIES_LABELS[s.id] ?? s.id,
        color:
          s.color ??
          preset?.color ??
          resolveFormattingColor(null, s.id, rawSeries.length),
        dash: s.dash ?? preset?.dash,
        points,
      });
    });
    return { ...base, series };
  }

  const points = toPoints(chart.points ?? []);
  if (!points.length) return { ...base, series: [] };
  return {
    ...base,
    series: [toSeries(points, DEFAULT_SERIES_KEYS[1], 0, 1, null)],
  };
}

/** Normalize chat / FuseDash WidgetItem payloads into one impurity-curve model. */
export function normalizeGiniImpurityEntropyData(
  input:
    | DataPoint[]
    | GiniImpurityEntropyChartData
    | GiniImpurityEntropyFusePayload
    | null
    | undefined,
  flags: GiniOverlayFlags = {},
): GiniImpurityEntropyModel {
  if (!input) return emptyModel(flags);

  if (Array.isArray(input)) {
    const points = toPoints(
      input.map((d) => ({ x: d?.label, y: Number(d?.value) })),
    );
    if (!points.length) return emptyModel(flags);
    return {
      series: [toSeries(points, DEFAULT_SERIES_KEYS[1], 0, 1, null)],
      xLabel: '',
      yLabel: DEFAULT_Y_LABEL,
      overlays: resolveOverlays(null, flags),
    };
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input as GiniImpurityEntropyFusePayload, flags);
  }

  return fromChatPayload(input as GiniImpurityEntropyChartData, flags);
}
