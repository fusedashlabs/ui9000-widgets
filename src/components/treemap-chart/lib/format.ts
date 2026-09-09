import { formatCompactNumber } from '../../../utils/fusedash-visual.js';
import type { TreemapMode } from './types.js';

/**
 * Tile and tooltip value. FuseDash formats the single treemap with
 * `formatCompactNumber(value, 2)` and each grouped card with `toFixed(2)`.
 */
export function formatTreemapValue(value: number, mode: TreemapMode): string {
  if (!Number.isFinite(value)) return '';
  return mode === 'grouped' ? value.toFixed(2) : formatCompactNumber(value, 2);
}
