import type { AxisDetail } from '../../../utils/axis-units.js';

type ShareDetail = AxisDetail & { subtype?: string };

/** Number drawn inside a segment. The unit mark comes from the value field. */
export function formatShare(value: number, detail?: ShareDetail): string {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  const mark = (detail?.measure_unit_symbol ?? detail?.measure_unit ?? '').trim();
  if (mark === '%') return `${text}%`;
  if (mark) return `${text} ${mark}`;
  const subtype = detail?.subtype?.trim().toLowerCase() ?? '';
  if (subtype === 'percent' || subtype === 'percentage') return `${text}%`;
  return text;
}

/** Caption beside the legend: axis label plus the unit mark, when the widget has both. */
export function unitCaption(detail?: ShareDetail): string {
  const label = detail?.label?.trim() ?? '';
  const mark = (detail?.measure_unit_symbol ?? detail?.measure_unit ?? '').trim();
  if (label && mark) return `${label} (${mark})`;
  return label || mark;
}
