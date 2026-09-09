/** Client `toK` — link label text. */
export function formatLinkValue(value: number | undefined): string {
  const n = Number(value ?? 0);
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k.toString() : k.toFixed(1)}K`;
  }
  return n.toString();
}

/** Client node label value row. */
export function formatNodeValue(value: number | undefined): string {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : '';
}

/** Client `Legends.formatValue` — abbreviated bucket boundary. */
export function formatLegendValue(value: number, toFixed = 0): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) < 1000) return value.toFixed(toFixed);

  const abbreviations = ['B', 'M', 'K'];
  for (let i = 0; i < abbreviations.length; i++) {
    const unit = Math.pow(1000, abbreviations.length - i);
    if (Math.abs(value) >= unit) {
      return `${(value / unit).toFixed(1)} ${abbreviations[i]}`;
    }
  }
  return value.toFixed(toFixed);
}
