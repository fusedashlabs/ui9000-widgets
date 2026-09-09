/** Mirrors client `AxisDetail` — the measure unit attached to a data field. */
export type AxisDetail = {
  label?: string;
  measure_unit_type?: string;
  measure_unit?: string;
  measure_unit_symbol?: string;
};

/**
 * Mirrors client `formatValueWithUnit`: currency symbols lead, percentages
 * scale a 0–1 decimal, everything else gets the unit appended.
 */
export function formatValueWithUnit(
  value: string | number | null | undefined,
  axisDetail?: AxisDetail,
): string {
  const formatted = String(value ?? '');
  if (!axisDetail) return formatted;

  const { measure_unit_type, measure_unit_symbol, measure_unit } = axisDetail;

  if (measure_unit_type === 'currency') {
    return `${measure_unit_symbol?.trim() ?? ''}${formatted}`;
  }

  if (measure_unit_type === 'percentage') {
    const unit = (measure_unit_symbol ?? measure_unit ?? '').trim();
    if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1) {
      const scaled = (value * 100).toFixed(2);
      return unit ? `${scaled} ${unit}` : scaled;
    }
    return unit ? `${formatted} ${unit}` : formatted;
  }

  const unit = measure_unit?.trim() ?? '';
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Client `axisDetails[field].label ?? field`. */
export function axisFieldLabel(
  field: string,
  axisDetails?: Record<string, AxisDetail> | null,
): string {
  return axisDetails?.[field]?.label ?? field;
}
