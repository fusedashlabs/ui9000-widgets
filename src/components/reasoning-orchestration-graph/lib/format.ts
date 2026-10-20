import type { Metric, NodeState, StageMetric, StageStatus } from './types.js';

/** `1.5` → "1.5", `12` → "12", `1234` → "1,234". */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '–';
  const digits = Math.abs(value) >= 100 || Number.isInteger(value) ? 0 : 1;
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** A 0–1 share as a percentage with one decimal: `0.588` → "58.8%". */
export function formatShare(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Signed delta: `28` → "+28", `-0.4` → "−0.4". */
export function formatDelta(value: number, unit = ''): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  const magnitude = unit === '%' && Math.abs(value) <= 1 ? Math.abs(value) * 100 : Math.abs(value);
  return `${sign}${formatNumber(magnitude)}${unit}`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const n = Number(value.trim().replace(/,/g, '').replace(/%$/, ''));
  return value.trim() && Number.isFinite(n) ? n : null;
}

/**
 * A readout. Strings are printed as sent; a number takes its unit, and a
 * `%` value at or under 1 is read as a share.
 */
export function formatMetric(
  label: string,
  value: number | string,
  delta?: number | string,
  unit = '',
): Metric {
  let text: string;
  if (typeof value === 'number') {
    const scaled = unit === '%' && Math.abs(value) <= 1 ? value * 100 : value;
    text = `${formatNumber(scaled)}${unit}`;
  } else {
    text = String(value).trim();
  }
  let deltaText = '';
  let trend: Metric['trend'] = null;
  if (delta !== undefined && delta !== null && String(delta).trim()) {
    const n = toNumber(delta);
    if (typeof delta === 'number' && n !== null) {
      deltaText = formatDelta(n, unit);
    } else {
      deltaText = String(delta).trim();
    }
    const signed = n ?? (deltaText.startsWith('−') || deltaText.startsWith('-') ? -1 : 1);
    trend = signed > 0 ? 'up' : signed < 0 ? 'down' : 'flat';
  }
  return { label: label.trim(), value: text, delta: deltaText, trend };
}

/** "MATH500 58.8% (+28.0)". */
export function metricText(metric: Metric): string {
  const head = metric.label ? `${metric.label} ${metric.value}` : metric.value;
  return metric.delta ? `${head} (${metric.delta})` : head;
}

/** A stage metric value as the top chart prints it. */
export function formatStageMetric(metric: StageMetric, value: number): string {
  return metric.share ? formatShare(value) : formatNumber(value);
}

export const STATE_NAME: Record<NodeState, string> = {
  candidate: 'Candidate',
  refined: 'Refined',
  verified: 'Verified',
  pruned: 'Pruned',
  failed: 'Failed',
};

export const STATUS_NAME: Record<StageStatus, string> = {
  done: 'Done',
  active: 'Running',
  pending: 'Pending',
  failed: 'Failed',
};

/** "metric_name" or "metricName" → "Metric name". */
export function humanize(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export { toNumber };
