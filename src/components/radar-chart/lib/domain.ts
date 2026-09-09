import { scaleLinear } from 'd3-scale';

import { calculateScaleLinearDomain, FD } from '../../../utils/fusedash-visual.js';
import type { RadarSeries } from './types.js';

export function integerRange(start: number, stop: number): number[] {
  const out: number[] = [];
  for (let i = start; i < stop; i += 1) out.push(i);
  return out;
}

export function collectRadarValues(series: RadarSeries[]): number[] {
  const values: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (Number.isFinite(p.value)) values.push(p.value);
    }
  }
  return values;
}

/** FuseDash radar radial domain: raw extent × 1.1 then `.nice()`. */
export function radialScale(
  series: RadarSeries[],
  outerRadius: number,
): {
  scale: ReturnType<typeof scaleLinear<number, number>>;
  minValue: number;
  maxValue: number;
  domainMin: number;
  domainMax: number;
} {
  const [minRaw, maxRaw] = calculateScaleLinearDomain(collectRadarValues(series));
  const minValue = minRaw * FD.radarDomainPadFactor;
  const maxValue = maxRaw * FD.radarDomainPadFactor;
  const scale = scaleLinear<number, number>()
    .rangeRound([0, outerRadius])
    .domain([minValue, maxValue])
    .nice();
  return {
    scale,
    minValue,
    maxValue,
    domainMin: scale.domain()[0] ?? minValue,
    domainMax: scale.domain()[1] ?? maxValue,
  };
}

export function hasRoomForRadialTicks(
  innerHeight: number,
  steps: number,
  minValue: number,
): boolean {
  const measuredRectHeight = 21;
  return innerHeight / 2 >= (steps - (minValue < 0 ? 2 : 1)) * measuredRectHeight;
}
