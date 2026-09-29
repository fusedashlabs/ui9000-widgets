import type {
  StatusGaugeItem,
  StatusGaugeModel,
  StatusGaugePayload,
  StatusGaugeRowInput,
  StatusLevel,
} from './types.js';

const LEVELS = new Set<StatusLevel>(['ok', 'warning', 'critical', 'neutral']);

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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function levelFromText(status: unknown): StatusLevel {
  const text = String(status ?? '').trim().toLowerCase();
  if (!text) return 'neutral';
  if (/(ok|good|healthy|normal|pass|success)/.test(text)) return 'ok';
  if (/(warn|degrad|caution|attention)/.test(text)) return 'warning';
  if (/(crit|bad|fail|error|danger|down)/.test(text)) return 'critical';
  return 'neutral';
}

function readLevel(row: StatusGaugeRowInput): StatusLevel {
  const explicit = String(row.level ?? '').trim().toLowerCase();
  if (LEVELS.has(explicit as StatusLevel)) return explicit as StatusLevel;
  return levelFromText(row.status);
}

function readRatio(row: StatusGaugeRowInput, value: number, min: number, max: number): number {
  const explicit = num(row.ratio);
  if (explicit !== undefined) {
    if (explicit > 1 && explicit <= 100) return clamp01(explicit / 100);
    return clamp01(explicit);
  }
  const span = max - min;
  if (!Number.isFinite(span) || span === 0) return 0;
  return clamp01((value - min) / span);
}

function rowsOf(input: unknown): StatusGaugeRowInput[] {
  if (Array.isArray(input)) return input.filter(isRecord) as StatusGaugeRowInput[];
  if (isRecord(input) && Array.isArray(input.data)) {
    return input.data.filter(isRecord) as StatusGaugeRowInput[];
  }
  return [];
}

function firstField(value: unknown, fallback: string): string {
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) return value[0];
  return fallback;
}

function toItem(
  row: StatusGaugeRowInput,
  role: 'gauge' | 'metric',
  xField: string,
  yField: string,
  axisDetails: StatusGaugePayload['axisDetails'],
): StatusGaugeItem | null {
  const key = String(row.key ?? row[xField] ?? '').trim();
  const value = num(row.value ?? row[yField]);
  if (!key || value === undefined) return null;

  const detail = axisDetails?.[key];
  const label = String(detail?.label ?? row.label ?? key).trim() || key;
  const unit = String(
    detail?.measure_unit ?? detail?.measure_unit_symbol ?? row.unit ?? '',
  ).trim();
  const min = num(row.min) ?? 0;
  const max = num(row.max) ?? (role === 'gauge' ? 100 : 100);
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const scaleMax = hi === lo ? lo + (role === 'gauge' ? 100 : 1) : hi;

  return {
    key,
    role,
    value,
    label,
    unit,
    status: String(row.status ?? '').trim(),
    level: readLevel(row),
    min: lo,
    max: scaleMax,
    ratio: readRatio(row, value, lo, scaleMax),
  };
}

/**
 * WidgetItem-shaped payload → one gauge and N metric cards.
 * The gauge is the row with `role: "gauge"`. When every row is `role: "metric"`, there is no dial.
 * When no role is set, the first valid row is the gauge.
 */
export function normalizeStatusGauge(input: unknown): StatusGaugeModel {
  const payload = isRecord(input) ? (input as StatusGaugePayload) : {};
  const xField = firstField(payload.xAxe, 'key');
  const yField = firstField(payload.yAxe, 'value');
  const rows = rowsOf(input);
  const gaugeIndex = rows.findIndex((row) => String(row.role ?? '').toLowerCase() === 'gauge');
  const metricsOnly =
    gaugeIndex < 0 && rows.some((row) => String(row.role ?? '').toLowerCase() === 'metric');
  const gaugeSource = gaugeIndex >= 0 ? rows[gaugeIndex] : metricsOnly ? undefined : rows[0];

  const gauge = gaugeSource
    ? toItem(gaugeSource, 'gauge', xField, yField, payload.axisDetails)
    : null;

  const metrics: StatusGaugeItem[] = [];
  rows.forEach((row, index) => {
    if (gaugeSource && row === gaugeSource) return;
    if (!metricsOnly && gaugeIndex < 0 && index === 0) return;
    const item = toItem(row, 'metric', xField, yField, payload.axisDetails);
    if (item) metrics.push(item);
  });

  const title = String(payload.name ?? payload.title ?? '').trim();
  const subtitle = String(payload.description ?? payload.subtitle ?? '').trim();

  return {
    title,
    subtitle,
    gauge,
    metrics,
    empty: !gauge && metrics.length === 0,
  };
}

export function formatStatusNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
