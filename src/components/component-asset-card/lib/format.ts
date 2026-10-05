/** Up to two decimals, trailing zeros dropped: 1.02, 0.8, 63. */
export function formatAssetNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return String(Math.round(value * 100) / 100);
}

/** `48.1 V`, but `1.02%` and `63°C` stay tight, as in the design. */
export function formatAssetMeasure(value: number, unit: string): string {
  const reading = formatAssetNumber(value);
  if (!unit) return reading;
  return unit === '%' || unit.startsWith('°') ? `${reading}${unit}` : `${reading} ${unit}`;
}
