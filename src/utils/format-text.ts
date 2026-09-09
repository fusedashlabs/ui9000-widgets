/** Text/number formatting shared with the client `Widgets/utils` helpers. */

/** Mirrors client `formatNumber` (Intl, up to 3 decimals). */
export function formatFuseNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);
}

/**
 * Mirrors client `formatCapitalizedWordsText` — group / series keys become
 * legend and tooltip labels (`bias_squared` → `Bias Squared`).
 */
export function formatCapitalizedWords(text?: string): string {
  if (!text) return '';
  if (!Number.isNaN(Number(text))) return text;
  return text
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Mirrors client `formatCapitalizedText` — only the first word is capitalized
 * (`County__created` → `County  created`), used for field-name captions.
 */
export function formatCapitalizedText(text?: string): string {
  if (!text) return '';
  if (!Number.isNaN(Number(text))) return text;
  const spaced = text.replace(/[_-]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export type FuseAxisDetail = {
  label?: string;
  measure_unit?: string;
  measure_unit_type?: string;
  measure_unit_symbol?: string;
};

/** Mirrors client `formatValueWithUnit` (currency prefix, percentage / plain suffix). */
export function formatValueWithUnit(
  value: string,
  detail?: FuseAxisDetail | null,
): string {
  if (!detail) return value;

  const { measure_unit_type: type, measure_unit_symbol: symbol, measure_unit: unit } = detail;

  if (type === 'currency') return `${symbol?.trim() ?? ''}${value}`;

  if (type === 'percentage') {
    const suffix = (symbol ?? unit ?? '').trim();
    return suffix ? `${value} ${suffix}` : value;
  }

  const suffix = unit?.trim() ?? '';
  return suffix ? `${value} ${suffix}` : value;
}
