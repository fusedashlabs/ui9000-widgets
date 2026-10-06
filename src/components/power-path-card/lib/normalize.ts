import { formatPowerPathMeasure } from './format.js';
import type {
  PowerPathFault,
  PowerPathHealth,
  PowerPathHealthInput,
  PowerPathLevel,
  PowerPathMetric,
  PowerPathMetricInput,
  PowerPathModel,
  PowerPathPayload,
  PowerPathStatus,
  PowerPathThresholds,
} from './types.js';

const LEVELS = new Set<PowerPathLevel>(['ok', 'warning', 'critical', 'neutral']);
const SEVERITY: Record<PowerPathLevel, number> = { neutral: 0, ok: 1, warning: 2, critical: 3 };

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

function explicitLevel(value: unknown): PowerPathLevel | undefined {
  const level = text(value).toLowerCase();
  return LEVELS.has(level as PowerPathLevel) ? (level as PowerPathLevel) : undefined;
}

function levelFromText(status: string): PowerPathLevel {
  const lower = status.toLowerCase();
  if (/(crit|fail|fault|error|danger|down|alarm)/.test(lower)) return 'critical';
  if (/(warn|high|low|elevat|degrad|caution|attention)/.test(lower)) return 'warning';
  if (/(stable|ok|good|healthy|normal|nominal|pass)/.test(lower)) return 'ok';
  return 'neutral';
}

function defaultLabel(level: PowerPathLevel, direction: PowerPathThresholds['direction']): string {
  if (level === 'critical') return 'Critical';
  if (level === 'warning') return direction === 'below' ? 'Low' : 'High';
  if (level === 'ok') return 'Stable';
  return '';
}

function levelFromThresholds(value: number, limits: PowerPathThresholds): PowerPathLevel | undefined {
  const warning = num(limits.warning);
  const critical = num(limits.critical);
  if (warning === undefined && critical === undefined) return undefined;
  const past = (limit: number | undefined) =>
    limit !== undefined && (limits.direction === 'below' ? value <= limit : value >= limit);
  if (past(critical)) return 'critical';
  if (past(warning)) return 'warning';
  return 'ok';
}

/** Explicit level or status first; thresholds only when neither is given. */
function readStatus(row: PowerPathMetricInput, value: number | undefined): PowerPathStatus | null {
  const label = text(row.status);
  const level = explicitLevel(row.level) ?? (label ? levelFromText(label) : undefined);
  const direction = row.thresholds?.direction;
  if (level) {
    const shown = label || defaultLabel(level, direction);
    return shown ? { label: shown, level } : null;
  }
  if (value === undefined || !isRecord(row.thresholds)) return null;
  const derived = levelFromThresholds(value, row.thresholds);
  return derived ? { label: defaultLabel(derived, direction), level: derived } : null;
}

function toMetric(row: PowerPathMetricInput, index: number): PowerPathMetric | null {
  const label = text(row.label) || text(row.name) || text(row.key);
  const value = num(row.value);
  const raw = text(row.value);
  if (!label || !raw) return null;
  return {
    key: text(row.key) || `${index}:${label}`,
    label,
    display: value === undefined ? raw : formatPowerPathMeasure(value, text(row.unit)),
    status: readStatus(row, value),
  };
}

function readPoints(points: PowerPathHealthInput['points']): number[] {
  if (!Array.isArray(points)) return [];
  const out: number[] = [];
  for (const point of points) {
    const value = isRecord(point) ? num(point.value ?? point.y) : num(point);
    if (value !== undefined) out.push(value);
  }
  return out;
}

function worstLevel(metrics: PowerPathMetric[]): PowerPathLevel {
  let worst: PowerPathLevel = 'neutral';
  for (const metric of metrics) {
    const level = metric.status?.level;
    if (level && SEVERITY[level] > SEVERITY[worst]) worst = level;
  }
  return worst;
}

/** The score is shown only when the payload carries one — never computed here. */
function readHealth(input: unknown, metrics: PowerPathMetric[]): PowerPathHealth | null {
  if (!isRecord(input)) return null;
  const health = input as PowerPathHealthInput;
  const value = num(health.value);
  if (value === undefined) return null;
  const status = text(health.status);
  const unit = health.unit === undefined ? '%' : text(health.unit);
  return {
    label: text(health.label) || 'Health',
    value,
    display: formatPowerPathMeasure(value, unit),
    level:
      explicitLevel(health.level) ??
      (status ? levelFromText(status) : undefined) ??
      worstLevel(metrics),
    points: readPoints(health.points),
  };
}

function readFault(input: unknown): PowerPathFault | null {
  if (typeof input === 'string') {
    const message = input.trim();
    return message ? { level: 'critical', text: message } : null;
  }
  if (!isRecord(input) || input.active === false) return null;
  const details = Array.isArray(input.details) ? input.details.map(text) : [];
  const line = [text(input.message), ...details].filter(Boolean).join(' · ');
  if (!line) return null;
  const level = explicitLevel(input.level) ?? levelFromText(line);
  return { level: level === 'warning' ? 'warning' : 'critical', text: line };
}

function readBadge(input: unknown): string {
  if (isRecord(input)) return text(input.label);
  return text(input);
}

/** Power-path payload → card model. Invalid input yields an empty model, never a throw. */
export function normalizePowerPath(input: unknown): PowerPathModel {
  const payload: PowerPathPayload = isRecord(input) ? (input as PowerPathPayload) : {};
  const rows = Array.isArray(payload.data) ? payload.data.filter(isRecord) : [];
  const metrics: PowerPathMetric[] = [];
  rows.forEach((row, index) => {
    const metric = toMetric(row as PowerPathMetricInput, index);
    if (metric) metrics.push(metric);
  });
  const health = readHealth(payload.health, metrics);

  return {
    title: text(payload.name) || text(payload.title),
    badge: readBadge(payload.badge),
    health,
    fault: readFault(payload.fault),
    metrics,
    empty: !health && metrics.length === 0,
  };
}
