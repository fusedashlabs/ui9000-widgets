import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

/** Y-axis tick label — mirrors client AxisLeft tickFormat. */
export function formatAgbAxisTick(value: number): string {
  const decimals = Number.isInteger(value) && Math.abs(value) < 1000 ? 0 : 2;
  return formatCompactNumber(value, decimals);
}

/** Tooltip numeric values. */
export function formatAgbValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
