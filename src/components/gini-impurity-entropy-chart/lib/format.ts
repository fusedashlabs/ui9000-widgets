import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

/**
 * Client Y ticks use `d3-format(".1f")`. Impurity indices live in [0, 1], so a
 * single decimal is right; anything larger falls back to compact notation.
 */
export function formatImpurityTick(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) >= 1000) return formatCompactNumber(value, 1);
  return value.toFixed(1);
}

/** X ticks / tooltip probabilities — trims the trailing zeros `.1f` would add. */
export function formatProbability(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(4)));
}

/** Tooltip readout for a metric value. */
export function formatImpurityValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) >= 1000) return formatCompactNumber(value, 2);
  return value.toFixed(3);
}
