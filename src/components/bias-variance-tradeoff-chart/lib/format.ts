/** Tooltip / reference-label numbers: trim trailing zeros, keep small floats readable. */
export function formatTradeoffValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(3)));
}
