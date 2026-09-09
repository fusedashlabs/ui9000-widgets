import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

/** Value tick / tooltip formatting — same rule as FuseDash `tickFormat`. */
export function formatCompact(value: number): string {
  const decimals = Number.isInteger(value) && Math.abs(value) < 1000 ? 0 : 2;
  return formatCompactNumber(value, decimals);
}

/**
 * Pick which category ticks to label so none collide — shared with step-line.
 * The chat host has no room for FuseDash `useVisxDynamicAxisLabel`.
 */
export function selectTickIndices(
  labels: string[],
  positions: number[],
  charWidth = 6.2,
  gap = 8,
): number[] {
  const n = labels.length;
  if (n <= 1) return n === 1 ? [0] : [];

  const extent = (i: number): [number, number] => {
    const w = labels[i].length * charWidth;
    const x = positions[i];
    if (i === 0) return [x, x + w];
    if (i === n - 1) return [x - w, x];
    return [x - w / 2, x + w / 2];
  };

  const kept: number[] = [];
  let prevRight = -Infinity;
  for (let i = 0; i < n - 1; i++) {
    if (!Number.isFinite(positions[i])) continue;
    const [left, right] = extent(i);
    if (left >= prevRight + gap) {
      kept.push(i);
      prevRight = right;
    }
  }

  if (!Number.isFinite(positions[n - 1])) return kept;

  const [lastLeft] = extent(n - 1);
  while (kept.length && extent(kept[kept.length - 1])[1] + gap > lastLeft) {
    kept.pop();
  }
  kept.push(n - 1);

  return kept;
}
