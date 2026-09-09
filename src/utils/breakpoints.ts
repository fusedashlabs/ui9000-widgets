/**
 * Mirrors client `generateBreakPoints` (`client/libs/shared/helpers`) — quantile
 * break points over a set of values. Shared by the charts that bucket a measure
 * (Sankey ribbon colours, NetworkGraph node sizes).
 */
export function generateBreakPoints(values: number[], numBreaks = 7): number[] {
  const sorted = values
    .filter((v) => Number.isFinite(v))
    .slice()
    .sort((a, b) => a - b);
  if (!sorted.length || numBreaks < 2) return [];

  const breaks: number[] = [];
  for (let i = 0; i < numBreaks; i++) {
    const position = (i / (numBreaks - 1)) * (sorted.length - 1);
    const lower = Math.max(0, Math.floor(position));
    const upper = Math.min(sorted.length - 1, Math.ceil(position));
    const weight = position - lower;
    breaks.push(sorted[lower] * (1 - weight) + sorted[upper] * weight);
  }
  return breaks;
}
