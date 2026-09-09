import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

export function formatCompact(value: number): string {
  return formatCompactNumber(value);
}

/** Compact label with leading `+` for positive diffs (client parity). */
export function formatSignedDiff(difference: number, vector: 'positive' | 'negative'): string {
  const body = formatCompactNumber(difference);
  return vector === 'positive' ? `+${body}` : body;
}
