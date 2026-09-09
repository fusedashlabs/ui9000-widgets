import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

export function formatRadarTick(value: number): string {
  return formatCompactNumber(value, 2);
}

export function formatRadarValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

export function axisLabel(
  field: string,
  axisDetails?: Record<string, { label?: string; measure_unit_symbol?: string }>,
): string {
  return axisDetails?.[field]?.label ?? field;
}
