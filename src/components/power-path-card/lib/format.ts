/** Up to two decimals, trailing zeros dropped: 48.1, 63, 24.35. */
export function formatPowerPathNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return String(Math.round(value * 100) / 100);
}

/** `48.1 V`, but `24.3%` and `63°C` stay tight, as in the design. */
export function formatPowerPathMeasure(value: number, unit: string): string {
  const reading = formatPowerPathNumber(value);
  if (!unit) return reading;
  return unit === '%' || unit.startsWith('°') ? `${reading}${unit}` : `${reading} ${unit}`;
}
