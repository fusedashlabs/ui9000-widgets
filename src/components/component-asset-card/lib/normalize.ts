import { formatAssetMeasure } from './format.js';
import type {
  ComponentAssetDelta,
  ComponentAssetDeltaInput,
  ComponentAssetImage,
  ComponentAssetLevel,
  ComponentAssetMetric,
  ComponentAssetMetricInput,
  ComponentAssetModel,
  ComponentAssetPayload,
  ComponentAssetStatus,
  ComponentAssetThresholds,
  ComponentAssetTrendPoint,
} from './types.js';

const LEVELS = new Set<ComponentAssetLevel>(['ok', 'warning', 'critical', 'neutral']);
const STATUS_LABEL: Record<ComponentAssetStatus['level'], string> = {
  ok: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
};

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

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function explicitLevel(value: unknown): ComponentAssetLevel | undefined {
  const level = text(value).toLowerCase();
  return LEVELS.has(level as ComponentAssetLevel) ? (level as ComponentAssetLevel) : undefined;
}

function readThresholds(input: unknown): ComponentAssetThresholds | null {
  if (!isRecord(input)) return null;
  const limits = input as ComponentAssetThresholds;
  return num(limits.warning) === undefined && num(limits.critical) === undefined ? null : limits;
}

function levelFromThresholds(value: number, limits: ComponentAssetThresholds): ComponentAssetLevel {
  const past = (limit: unknown) => {
    const bound = num(limit);
    return bound !== undefined && (limits.direction === 'below' ? value <= bound : value >= bound);
  };
  if (past(limits.critical)) return 'critical';
  if (past(limits.warning)) return 'warning';
  return 'ok';
}

/** An explicit level wins; thresholds only when none is given. Neutral → no status. */
function readStatus(
  metric: ComponentAssetMetricInput,
  value: number | undefined,
  limits: ComponentAssetThresholds | null,
): ComponentAssetStatus | null {
  const level =
    explicitLevel(metric.level) ??
    (value !== undefined && limits ? levelFromThresholds(value, limits) : undefined);
  return level && level !== 'neutral' ? { label: STATUS_LABEL[level], level } : null;
}

function readMetric(input: unknown, limits: ComponentAssetThresholds | null): ComponentAssetMetric | null {
  if (!isRecord(input)) return null;
  const metric = input as ComponentAssetMetricInput;
  const raw = text(metric.value);
  if (!raw) return null;
  const value = num(metric.value);
  return {
    label: text(metric.label) || text(metric.name),
    display: value === undefined ? raw : formatAssetMeasure(value, text(metric.unit)),
    status: readStatus(metric, value, limits),
  };
}

function readDelta(input: unknown): ComponentAssetDelta | null {
  const delta: ComponentAssetDeltaInput = isRecord(input)
    ? (input as ComponentAssetDeltaInput)
    : { value: input as number | string };
  const raw = text(delta.value);
  if (!raw) return null;
  const value = num(delta.value);
  const direction =
    delta.direction === 'up' || delta.direction === 'down' || delta.direction === 'flat'
      ? delta.direction
      : value === undefined || value === 0
        ? 'flat'
        : value > 0
          ? 'up'
          : 'down';
  const better = delta.better === 'down' ? 'down' : 'up';
  return {
    direction,
    display: value === undefined ? raw : formatAssetMeasure(Math.abs(value), text(delta.unit)),
    label: text(delta.label),
    tone: direction === 'flat' ? 'neutral' : direction === better ? 'ok' : 'critical',
  };
}

/** Each point takes its own level, else the metric thresholds, else neutral. */
function readTrend(input: unknown, limits: ComponentAssetThresholds | null): ComponentAssetTrendPoint[] | null {
  const raw = Array.isArray(input) ? input : isRecord(input) ? input.points : undefined;
  if (!Array.isArray(raw)) return null;
  const points: ComponentAssetTrendPoint[] = [];
  for (const entry of raw) {
    const value = isRecord(entry) ? num(entry.value ?? entry.y) : num(entry);
    if (value === undefined) continue;
    const level =
      (isRecord(entry) ? explicitLevel(entry.level) : undefined) ??
      (limits ? levelFromThresholds(value, limits) : 'neutral');
    points.push({ value, level });
  }
  return points.length >= 2 ? points : null;
}

/** Absolute http(s), data:image, blob or a relative path — nothing else reaches `<img src>`. */
function safeSrc(src: string): string {
  if (!src) return '';
  if (/^(https?:|blob:)/i.test(src) || /^data:image\//i.test(src)) return src;
  return /^[a-z][a-z0-9+.-]*:/i.test(src) ? '' : src;
}

function readImage(input: unknown): ComponentAssetImage | null {
  const image = isRecord(input) ? input : { src: input };
  const src = safeSrc(text(image.src) || text(image.url));
  return src ? { src, alt: text(image.alt) } : null;
}

/** Component-asset payload → card model. Invalid input yields an empty model, never a throw. */
export function normalizeComponentAsset(input: unknown): ComponentAssetModel {
  const payload: ComponentAssetPayload = isRecord(input) ? (input as ComponentAssetPayload) : {};
  const limits = isRecord(payload.metric) ? readThresholds(payload.metric.thresholds) : null;
  const title = text(payload.name) || text(payload.title);
  const assetId = text(payload.assetId) || text(payload.badge);
  const metric = readMetric(payload.metric, limits);

  return {
    title,
    assetId,
    image: readImage(payload.image),
    metric,
    delta: metric ? readDelta(payload.delta) : null,
    trend: metric ? readTrend(payload.trend, limits) : null,
    empty: !title && !assetId && !metric,
  };
}
