import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

/** Longest axis title before it is truncated with an ellipsis. */
export const AXIS_TITLE_MAX = 25;

/**
 * Axis tick text. The client uses d3-format `.2s`, which renders sub-unit
 * values as SI milli ("200m"); `formatCompactNumber` is the shared FD token and
 * keeps the same K/M/B shortening without that. Its fixed 2 decimals are
 * trimmed here so a dense axis reads "4.6" / "5" like the client, not "4.60".
 */
export function formatAxisTick(value: number): string {
  return formatCompactNumber(value).replace(
    /\.(\d*?)0+(?=[KMB]?$)/,
    (_match, keep: string) => (keep ? `.${keep}` : ''),
  );
}

/** Tooltip row value — plain numbers, no SI shortening. */
export function formatTooltipValue(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}
