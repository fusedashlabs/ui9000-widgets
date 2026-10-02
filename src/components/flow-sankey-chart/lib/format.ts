import { formatFuseNumber } from '../../../utils/format-text.js';

/** Mirrors client `formatNumber` (Intl, up to 3 decimals). */
export function formatFlowValue(value: number): string {
  return formatFuseNumber(value);
}

/** Share badge next to a node value — `(22.8%)` in the Figma frame. */
export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '';
  return `(${(share * 100).toFixed(1)}%)`;
}

/** Percentage gutter tick — `0%` … `100%`. */
export function formatAxisTick(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** Node labels wrap to two lines; past that the tail is cut. */
export const NODE_LABEL_MAX = 22;

export function truncateFlowLabel(text: string, max = NODE_LABEL_MAX): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}...`;
}

/**
 * Split a node label across at most two lines on word boundaries, matching the
 * two-line label blocks in the Figma frame.
 */
export function wrapFlowLabel(text: string, maxChars = 16): string[] {
  const clean = truncateFlowLabel(text);
  if (clean.length <= maxChars) return [clean];

  const words = clean.split(/\s+/);
  if (words.length === 1) return [clean];

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === 1 && current.length > maxChars) break;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  if (lines.length <= 2) return lines;
  return [lines[0], truncateFlowLabel(lines.slice(1).join(' '), maxChars)];
}
