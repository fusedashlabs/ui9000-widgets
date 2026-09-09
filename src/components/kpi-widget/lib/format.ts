/** Port of FuseDash `formatKpiValue` (client/libs/shared/utils/kpi.ts). */
export function formatKpiValue(value: number | string, decimals = 2): string {
  const numericValue = Number(value);
  if (
    Number.isNaN(numericValue) ||
    numericValue === null ||
    !Number.isFinite(numericValue)
  ) {
    return '—';
  }

  const absValue = Math.abs(numericValue);

  if (absValue === 0) {
    return '0';
  }

  if (absValue >= 0.1) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: decimals,
    }).format(numericValue);
  }

  const power = Math.ceil(Math.abs(Math.log10(absValue) / 3)) * 3;
  const modifiedValue = numericValue * 10 ** power;
  const formattedModifiedValue = parseFloat(modifiedValue.toFixed(decimals)).toString();

  return `${formattedModifiedValue}×10⁻${power}`;
}

/** Split compact scientific notation so the exponent can render as a suffix. */
export function splitFormattedKpiValue(formatted: string): {
  value: string;
  suffix: string;
} {
  if (!formatted.includes('×10⁻')) return { value: formatted, suffix: '' };
  const [valuePart, suffixPart] = formatted.split('×10⁻');
  return {
    value: valuePart ?? formatted,
    suffix: suffixPart != null ? `×10⁻${suffixPart}` : '',
  };
}
