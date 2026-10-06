import type { LossBand, LossIndicatorInput, LossIndicatorModel, LossLevel } from './types.js';

const LEVELS = new Set<LossLevel>(['ok', 'warning', 'severe', 'critical']);

const LEVEL_ALIAS: Record<string, LossLevel> = {
  ok: 'ok',
  normal: 'ok',
  green: 'ok',
  warning: 'warning',
  warn: 'warning',
  yellow: 'warning',
  severe: 'severe',
  orange: 'severe',
  critical: 'critical',
  crit: 'critical',
  red: 'critical',
};

export const LOSS_COLORS: Record<LossLevel | 'rest', string> = {
  ok: '#3ad07c',
  warning: '#f5c451',
  severe: '#ff9a3c',
  critical: '#ef3b4a',
  rest: '#d5d8de',
};

const COLOR_LEVEL: Record<string, LossLevel> = {
  '#3ad07c': 'ok',
  '#f5c451': 'warning',
  '#ff9a3c': 'severe',
  '#ef3b4a': 'critical',
};

/** Columns that describe the reading, not a second metric. */
const ROW_RESERVED =
  /^(trend|min|max|unit|ticks|decimals|label|name|key|status|role|bands|thresholds)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function formatLossNumber(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) return '—';
  if (decimals !== undefined) return value.toFixed(decimals);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(6).replace(/\.?0+$/, '');
}

function decimalsOf(value: unknown): number | undefined {
  const parsed = num(value);
  if (parsed === undefined || !Number.isInteger(parsed) || parsed < 0 || parsed > 8) return undefined;
  return parsed;
}

/** Keep a payload string such as "24.30" instead of reformatting the parsed number. */
function textFromRaw(value: number, raw: unknown, decimals?: number): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed && num(trimmed) === value && !/e/i.test(trimmed)) return trimmed;
  }
  return formatLossNumber(value, decimals);
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function readColor(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return HEX.test(text) ? text : undefined;
}

function withUnit(text: string, unit: string): string {
  if (!unit) return text;
  if (unit === '%') return `${text}%`;
  return `${text} ${unit}`;
}

function readLevel(value: unknown): LossLevel | undefined {
  const text = String(value ?? '').trim().toLowerCase();
  return LEVEL_ALIAS[text];
}

function parseBands(value: unknown): LossBand[] {
  let raw: unknown = value;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const bands: LossBand[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const from = num(item.from);
    const to = num(item.to);
    const level = readLevel(item.level);
    if (from === undefined || to === undefined || !level || !(to > from)) continue;
    if (!LEVELS.has(level)) continue;
    const color = readColor(item.color);
    bands.push(color ? { from, to, level, color } : { from, to, level });
  }
  return bands.sort((a, b) => a.from - b.from);
}

function parseTicks(value: unknown, min: number, max: number, bands: LossBand[]): number[] {
  let raw: unknown = value;
  if (typeof raw === 'string' && raw.trim()) {
    raw = raw.split(/[, ]+/).filter(Boolean);
  }
  const ticks = Array.isArray(raw)
    ? raw.map((item) => num(item)).filter((item): item is number => item !== undefined)
    : [];
  const span = max - min;
  const usable = ticks.filter((tick) => tick >= min - span * 0.001 && tick <= max + span * 0.001);
  if (usable.length >= 2) return [...new Set(usable)].sort((a, b) => a - b);
  const edges = [min, max, ...bands.flatMap((band) => [band.from, band.to])];
  return [...new Set(edges.filter((tick) => tick >= min && tick <= max))].sort((a, b) => a - b);
}

function levelAt(bands: LossBand[], value: number): LossLevel {
  const hit = bands.find((band) => value >= band.from && value <= band.to);
  if (hit) return hit.level;
  const after = bands.find((band) => value < band.from);
  if (after) return after.level;
  return bands[bands.length - 1]?.level ?? 'critical';
}

function readTrend(value: unknown): 'up' | 'down' | 'flat' | undefined {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'up' || text === 'down' || text === 'flat') return text;
  return undefined;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim());
}

function labelFromKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function levelFor(index: number, count: number, color: string | undefined, key: unknown): LossLevel {
  const named = readLevel(key);
  if (named) return named;
  if (color) {
    const known = COLOR_LEVEL[color.toLowerCase()];
    if (known) return known;
  }
  if (count <= 1) return 'critical';
  if (count === 2) return index === 0 ? 'ok' : 'critical';
  if (count === 3) return (['ok', 'warning', 'critical'] as const)[index] ?? 'critical';
  const order: LossLevel[] = ['ok', 'warning', 'severe', 'critical'];
  return order[Math.min(index, order.length - 1)] ?? 'critical';
}

type Paint = { color?: string; key?: unknown };

function paintsOf(widget: Record<string, unknown>): Paint[] {
  const colors = Array.isArray(widget.colors) ? widget.colors : [];
  const formatting = Array.isArray(widget.formatting) ? widget.formatting : [];
  const count = Math.max(colors.length, formatting.length);
  const paints: Paint[] = [];
  for (let index = 0; index < count; index += 1) {
    const entry = isRecord(formatting[index]) ? formatting[index] : undefined;
    paints.push({
      color: readColor(colors[index]) ?? readColor(entry?.color),
      key: entry?.key,
    });
  }
  return paints;
}

function finishBands(
  ranges: Array<{ from: number; to: number; color?: string; key?: unknown }>,
  paints: Paint[],
): LossBand[] {
  return ranges
    .map((range, index) => {
      const paint = paints[index];
      const color = range.color ?? paint?.color;
      const level = levelFor(index, ranges.length, color, range.key ?? paint?.key);
      return color ? { from: range.from, to: range.to, level, color } : { from: range.from, to: range.to, level };
    })
    .sort((a, b) => a.from - b.from);
}

/** `domainsLimits` entries with two values are the coloured operating bands. */
function bandsFromDomains(widget: Record<string, unknown>, paints: Paint[]): LossBand[] {
  if (!Array.isArray(widget.domainsLimits)) return [];
  const ranges: Array<{ from: number; to: number; color?: string; key?: unknown }> = [];
  for (const item of widget.domainsLimits) {
    if (!isRecord(item) || !Array.isArray(item.values)) continue;
    const left = num(item.values[0]);
    const right = num(item.values[1]);
    if (left === undefined || right === undefined || left === right) continue;
    const named = readLevel(item.level) ?? readLevel(item.color);
    ranges.push({
      from: Math.min(left, right),
      to: Math.max(left, right),
      color: readColor(item.color),
      key: named ?? item.key,
    });
  }
  return finishBands(ranges, paints);
}

function domainPairs(widget: Record<string, unknown>): Array<[number, number]> {
  if (!Array.isArray(widget.limitsDomains)) return [];
  const pairs: Array<[number, number]> = [];
  for (const item of widget.limitsDomains) {
    if (!Array.isArray(item)) continue;
    const left = num(item[0]);
    const right = num(item[1]);
    if (left === undefined || right === undefined || left === right) continue;
    pairs.push([Math.min(left, right), Math.max(left, right)]);
  }
  return pairs;
}

/** Several `limitsDomains` pairs are bands when `domainsLimits` did not supply any. */
function bandsFromLimits(pairs: Array<[number, number]>, paints: Paint[]): LossBand[] {
  if (pairs.length < 2) return [];
  return finishBands(
    pairs.map(([from, to]) => ({ from, to })),
    paints,
  );
}

function isWidgetItem(input: Record<string, unknown>): boolean {
  return (
    Array.isArray(input.data) ||
    Array.isArray(input.domainsLimits) ||
    Array.isArray(input.limitsDomains) ||
    Array.isArray(input.yAxe) ||
    Array.isArray(input.kpis) ||
    isRecord(input.axisDetails) ||
    isRecord(input.uniqueValues)
  );
}

function widgetRows(
  widget: Record<string, unknown>,
  field: string | undefined,
): {
  rows: Record<string, unknown>[];
  kpi?: Record<string, unknown>;
} {
  if (Array.isArray(widget.data)) {
    const rows = widget.data.filter(isRecord);
    if (rows.length) return { rows };
  }
  if (Array.isArray(widget.kpis) && widget.kpis.length === 1 && isRecord(widget.kpis[0])) {
    const kpi = widget.kpis[0];
    if (Array.isArray(kpi.data)) {
      const rows = kpi.data.filter(isRecord);
      if (rows.length) return { rows, kpi };
    }
    const score = num(kpi.score);
    if (score !== undefined) {
      const column = typeof kpi.column === 'string' ? kpi.column.trim() : '';
      const key = field || column || 'value';
      return { rows: [{ [key]: score, trend: kpi.trend }], kpi };
    }
  }
  return { rows: [] };
}

function axisDetail(
  widget: Record<string, unknown>,
  field: string,
  kpi?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const details = isRecord(widget.axisDetails)
    ? widget.axisDetails
    : isRecord(kpi?.axisDetails)
      ? kpi.axisDetails
      : undefined;
  const detail = details?.[field];
  return isRecord(detail) ? detail : undefined;
}

function unitOf(
  widget: Record<string, unknown>,
  field: string,
  row: Record<string, unknown>,
  detail: Record<string, unknown> | undefined,
): string {
  const fromDetail = String(detail?.measure_unit ?? detail?.measure_unit_symbol ?? '').trim();
  if (fromDetail) return fromDetail;
  if (Array.isArray(widget.axisLabels)) {
    const match = widget.axisLabels.find(
      (item) => isRecord(item) && String(item.key) === field && String(item.suffix ?? '').trim(),
    );
    if (isRecord(match)) return String(match.suffix).trim();
  }
  const subtype = String(detail?.subtype ?? '').trim().toLowerCase();
  if (subtype === 'percent' || subtype === 'percentage') return '%';
  return String(row.unit ?? '').trim();
}

/** Axis labels are an explicit tick list, otherwise the band edges. `uniqueValues` is the column domain, not the scale. */
function tickSource(widget: Record<string, unknown>, row: Record<string, unknown>): unknown {
  return row.ticks ?? widget.ticks;
}

function numericKeys(row: Record<string, unknown>): string[] {
  return Object.keys(row).filter((key) => !ROW_RESERVED.test(key) && num(row[key]) !== undefined);
}

/**
 * WidgetItemDto → one reading.
 * `name` is the title, `yAxe` picks the metric, `data` holds the value,
 * `limitsDomains` is the scale, `domainsLimits` is the coloured bands.
 */
function fromWidget(widget: Record<string, unknown>, empty: LossIndicatorModel): LossIndicatorModel {
  const yAxes = stringList(widget.yAxe);
  const metrics = stringList(widget.metric);
  if (yAxes.length > 1 || metrics.length > 1) return empty;
  if (yAxes[0] && metrics[0] && yAxes[0] !== metrics[0]) return empty;

  const hinted = yAxes[0] ?? metrics[0];
  const { rows, kpi } = widgetRows(widget, hinted);
  if (!rows.length) return empty;

  const groupField = stringList(widget.groupBy)[0];
  if (groupField) {
    const groups = new Set(rows.map((row) => String(row[groupField] ?? '')));
    if (groups.size > 1) return empty;
  }

  const forced = yAxes[0] ?? metrics[0] ?? (typeof kpi?.column === 'string' ? kpi.column : undefined);
  const field = forced ?? (numericKeys(rows[rows.length - 1] ?? {})[0]);
  if (!field) return empty;
  if (!forced && numericKeys(rows[rows.length - 1] ?? {}).length !== 1) return empty;

  let value: number | undefined;
  let raw: unknown;
  let row: Record<string, unknown> = rows[rows.length - 1] ?? {};
  let previous: number | undefined;
  for (const current of rows) {
    const next = num(current[field]);
    if (next === undefined) continue;
    previous = value;
    value = next;
    raw = current[field];
    row = current;
  }
  if (value === undefined) return empty;

  const paints = paintsOf(widget);
  const pairs = domainPairs(widget);
  const bands = bandsFromDomains(widget, paints);
  const resolved = bands.length > 0 ? bands : bandsFromLimits(pairs, paints);
  const fallback = resolved.length > 0 ? resolved : parseBands(row.bands ?? widget.bands);
  if (fallback.length === 0) return empty;

  const rowMin = num(row.min);
  const rowMax = num(row.max);
  const extent = fallback.flatMap((band) => [band.from, band.to]);
  let min: number | undefined;
  let max: number | undefined;
  if (pairs.length === 1) {
    [min, max] = pairs[0];
  } else if (rowMin !== undefined && rowMax !== undefined && rowMin !== rowMax) {
    min = Math.min(rowMin, rowMax);
    max = Math.max(rowMin, rowMax);
  } else if (pairs.length > 1) {
    const ends = pairs.flat();
    min = Math.min(...ends);
    max = Math.max(...ends);
  } else if (extent.length >= 2) {
    min = Math.min(...extent);
    max = Math.max(...extent);
  }
  if (min === undefined || max === undefined || !(max > min)) return empty;

  const detail = axisDetail(widget, field, kpi);
  const unit = unitOf(widget, field, row, detail);
  const widgetName = String(widget.name ?? kpi?.name ?? '').trim();
  const label = widgetName || String(detail?.label ?? row.label ?? '').trim() || labelFromKey(field);
  const decimals = decimalsOf(row.decimals ?? widget.decimals);
  const span = max - min;
  const ratio = Math.min(1, Math.max(0, (value - min) / span));
  const stated = readTrend(row.trend);
  const derived =
    stated === undefined && previous !== undefined
      ? value > previous
        ? 'up'
        : value < previous
          ? 'down'
          : undefined
      : undefined;
  const trend = stated === 'flat' ? undefined : stated ?? derived ?? (readTrend(kpi?.trend) === 'flat' ? undefined : readTrend(kpi?.trend));

  return {
    label,
    value,
    valueText: withUnit(textFromRaw(value, raw, decimals), unit),
    unit,
    min,
    max,
    ticks: parseTicks(tickSource(widget, row), min, max, fallback).map((tick) => ({
      value: tick,
      label: withUnit(formatLossNumber(tick), unit),
      position: Math.min(1, Math.max(0, (tick - min) / span)),
    })),
    bands: fallback,
    ratio,
    level: levelAt(fallback, value),
    trend: trend === 'flat' ? undefined : trend,
    empty: false,
  };
}

/** One object, or a one-item list. Two readings are not this card. */
function oneReading(input: unknown): LossIndicatorInput | null {
  if (Array.isArray(input)) {
    if (input.length !== 1 || !isRecord(input[0])) return null;
    return input[0] as LossIndicatorInput;
  }
  if (!isRecord(input)) return null;
  if (Array.isArray(input.metrics) && input.metrics.length !== 1) return null;
  if (Array.isArray(input.data) && input.data.length > 1) return null;
  if (Array.isArray(input.data) && input.data.length === 1 && isRecord(input.data[0])) {
    return { ...(input as LossIndicatorInput), ...(input.data[0] as LossIndicatorInput) };
  }
  return input as LossIndicatorInput;
}

function fromFlat(input: unknown, empty: LossIndicatorModel): LossIndicatorModel {
  const source = oneReading(input);
  if (!source) return empty;

  const value = num(source.value);
  const min = num(source.min);
  const max = num(source.max);
  if (value === undefined || min === undefined || max === undefined || !(max > min)) return empty;

  const bands = parseBands(source.bands);
  if (bands.length === 0) return empty;

  const unit = String(source.unit ?? '').trim();
  const label = String(source.label ?? source.name ?? '').trim();
  const decimals = decimalsOf(source.decimals);
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const span = hi - lo;
  const ratio = Math.min(1, Math.max(0, (value - lo) / span));
  const stated = readTrend(source.trend);

  return {
    label,
    value,
    valueText: withUnit(textFromRaw(value, source.value, decimals), unit),
    unit,
    min: lo,
    max: hi,
    ticks: parseTicks(source.ticks, lo, hi, bands).map((tick) => ({
      value: tick,
      label: withUnit(formatLossNumber(tick), unit),
      position: Math.min(1, Math.max(0, (tick - lo) / span)),
    })),
    bands,
    ratio,
    level: levelAt(bands, value),
    trend: stated === 'up' || stated === 'down' ? stated : undefined,
    empty: false,
  };
}

export function normalizeLossIndicator(input: unknown): LossIndicatorModel {
  const empty: LossIndicatorModel = {
    label: '',
    value: 0,
    valueText: '',
    unit: '',
    min: 0,
    max: 0,
    ticks: [],
    bands: [],
    ratio: 0,
    level: 'critical',
    empty: true,
  };
  if (Array.isArray(input)) {
    if (input.length !== 1) return empty;
    return normalizeLossIndicator(input[0]);
  }
  if (!isRecord(input)) return empty;
  if (isWidgetItem(input)) return fromWidget(input, empty);
  return fromFlat(input, empty);
}
