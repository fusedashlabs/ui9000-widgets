import { calculateScaleLinearDomain } from '../../../utils/fusedash-visual.js';
import type { AreaGroupedBarModel } from './types.js';

/** Shared Y domain over line + bar metrics (client `calculateScaleLinearDomain`). */
export function areaGroupedBarYDomain(model: AreaGroupedBarModel): [number, number] {
  const values: number[] = [];
  for (const pt of model.linePoints) {
    if (Number.isFinite(pt.y)) values.push(pt.y);
  }
  for (const cat of model.categories) {
    const row = model.barsByCategory[cat] ?? {};
    for (const g of model.groups) {
      const v = row[g.key];
      if (Number.isFinite(v)) values.push(v);
    }
  }
  return calculateScaleLinearDomain(values);
}
