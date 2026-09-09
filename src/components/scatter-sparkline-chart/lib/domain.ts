import { calculateScaleLinearDomain } from '../../../utils/fusedash-visual.js';
import type { SparkLineSeries } from '../../spark-line-chart/lib/types.js';
import type { ScatterSparklineRawPoint } from './types.js';

/** FuseDash ScatterSparklineChart y domain: extent × 1.1 before `.nice()`. */
export function collectScatterSparklineYDomain(
  series: SparkLineSeries[],
  scatterPoints: ScatterSparklineRawPoint[],
): [number, number] {
  const values: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (Number.isFinite(p.y)) values.push(p.y);
    }
  }
  for (const p of scatterPoints) {
    if (Number.isFinite(p.y)) values.push(p.y);
  }
  if (!values.length) return [0, 1];
  const [min, max] = calculateScaleLinearDomain(values);
  if (min === 0 && max === 0) return [0, 1];
  return [min * 1.1, max * 1.1];
}
