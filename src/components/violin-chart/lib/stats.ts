/** Linear interpolation quantile — port of client ViolinChart/utils/stats.ts. */
export function quantile(values: number[], p: number): number {
  if (!values?.length) return 0;
  const v = values.slice().sort((a, b) => a - b);
  const i = (v.length - 1) * p;
  const i0 = Math.floor(i);
  const i1 = Math.min(v.length - 1, i0 + 1);
  const t = i - i0;
  return v[i0]! * (1 - t) + v[i1]! * t;
}

export function gaussianKernel(u: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
}

/** Silverman KDE density along `grid` (Gaussian kernel). */
export function kde(
  samples: number[],
  bandwidth: number,
  grid: number[],
): Array<{ x: number; y: number }> {
  const n = samples.length || 1;
  return grid.map((g) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += gaussianKernel((g - samples[i]!) / bandwidth);
    }
    return { x: g, y: (1 / (n * bandwidth)) * sum };
  });
}

/** Silverman rule-of-thumb bandwidth (client Vertical/Horizontal violin). */
export function silvermanBandwidth(samples: number[], lo: number, hi: number): number {
  const n = samples.length || 1;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(
    samples.reduce((s, v) => s + (v - mean) ** 2, 0) / n,
  );
  if (sd > 0) return 1.06 * sd * Math.pow(n, -1 / 5);
  return (hi - lo) / 20 || 1;
}

/** 40-point evaluation grid from sample extent (client parity). */
export function densityGrid(lo: number, hi: number, points = 40): number[] {
  if (points <= 1) return [lo];
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    out.push(lo + ((hi - lo) * i) / (points - 1));
  }
  return out;
}
