import {
  formatCapitalizedWords,
  formatFuseNumber,
  formatValueWithUnit,
  type FuseAxisDetail,
} from '../../../utils/format-text.js';

/** Client tooltip category row: capitalized words, then the axis unit. */
export function formatRadialBarCategory(
  label: string,
  detail?: FuseAxisDetail,
): string {
  return formatValueWithUnit(formatCapitalizedWords(label), detail);
}

/** Client tooltip value row: `formatNumber(value)` plus the axis unit. */
export function formatRadialBarValue(
  value: number,
  detail?: FuseAxisDetail,
): string {
  return formatValueWithUnit(formatFuseNumber(value), detail);
}
