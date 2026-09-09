import type { HistogramModel } from './types.js';

/** Max stacked height across bins (for y-domain). */
export function collectYMax(model: HistogramModel): number {
  let max = 0;
  for (const bin of model.bins) {
    const total =
      bin.stacks.length > 0 ? bin.stacks[bin.stacks.length - 1].end : 0;
    if (total > max) max = total;
  }
  return max;
}

/** Band domain keys (bin indices as strings). */
export function collectBinKeys(model: HistogramModel): string[] {
  return model.bins.map((b) => String(b.index));
}
