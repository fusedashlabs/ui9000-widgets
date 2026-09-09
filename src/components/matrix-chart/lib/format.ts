/** Mirrors client `formatNumber` — grouped, up to 3 decimals. */
export function formatMatrixValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(
    value,
  );
}

/** Mirrors client `formatCapitalizedWordsText` for the tooltip category. */
export function formatCategoryLabel(text: string): string {
  if (!text) return '';
  if (!Number.isNaN(Number(text))) return text;
  return text
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
