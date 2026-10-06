const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** Below 10,000 the count prints whole (`1,204`); above, compact (`12.4K`) so columns keep their width. */
export function formatIncidentCount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.abs(value) < 10_000 ? GROUPED.format(value) : COMPACT.format(value);
}

/** Every digit, for the tooltip and assistive text. */
export function formatIncidentCountFull(value: number): string {
  return Number.isFinite(value) ? GROUPED.format(value) : '—';
}

const DISTANCE = /^\d+(?:[.,]\d+)?\s*(?:m|km|mi|ft|yd|nm)$/i;

/** `5 km`, `500 m`, `3mi` — a radius the scale mark can stand for. */
export function isDistanceLabel(label: string): boolean {
  return DISTANCE.test(label.trim());
}
