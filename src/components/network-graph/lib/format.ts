/** Client `toK` — link label text. */
export function formatLinkValue(value: number | undefined): string {
  const n = Number(value ?? 0);
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k.toString() : k.toFixed(1)}K`;
  }
  return n.toString();
}

const NODE_NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const NODE_INTEGER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Node values are counts or measures, not money: a plain number, at most two decimals. */
export function formatNodeValue(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? NODE_NUMBER_FORMAT.format(value)
    : '';
}

/** Legend bucket boundary: a plain number, compact only from 10,000. */
export function formatLegendValue(value: number, integersOnly = false): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 10_000) {
    const units: Array<[number, string]> = [
      [1e9, 'B'],
      [1e6, 'M'],
      [1e3, 'K'],
    ];
    for (const [unit, suffix] of units) {
      if (Math.abs(value) >= unit) return `${Number((value / unit).toFixed(1))} ${suffix}`;
    }
  }
  return (integersOnly ? NODE_INTEGER_FORMAT : NODE_NUMBER_FORMAT).format(value);
}
