import { FD } from '../../../utils/fusedash-visual.js';

export interface TreemapGridTemplate {
  /** `grid-template-areas` value; cards claim `_1`… in order */
  areas: string;
  /** `grid-template-rows` value — always explicit, so every row gets space */
  rows: string;
}

/**
 * Mirrors client `Treemap/style.ts getGridArea` — the grouped treemap packs 1–5
 * cards into a fixed mosaic and falls back to a single column beyond that.
 * Column count is implied by the areas string, exactly as in the client.
 *
 * Two fixes on top of the client: rows are explicit fractions (the client's
 * `auto` rows collapse around the cards' zero-height plots), and the >5
 * fallback emits one row per card with a height floor instead of a fixed 18,
 * so a long list scrolls instead of being squashed into the top sliver.
 */
export function treemapGridTemplate(itemsCount: number): TreemapGridTemplate {
  const areas = gridAreas(itemsCount);
  if (itemsCount > 5) {
    return {
      areas,
      rows: `repeat(${itemsCount}, minmax(${FD.treemapCardMinHeight}px, 1fr))`,
    };
  }
  // Rows must be explicit fractions: the cards' plots have no intrinsic height,
  // so `auto` tracks collapse the bottom row of the mosaic to its header.
  return { areas, rows: `repeat(${areas.split('"').length >> 1}, 1fr)` };
}

function gridAreas(itemsCount: number): string {
  switch (itemsCount) {
    case 1:
      return '"_1"';
    case 2:
      return '"_1 _2"';
    case 3:
      return '"_1 _1 _2" "_1 _1 _3"';
    case 4:
      return '"_1 _2" "_1 _2" "_3 _4"';
    case 5:
      return '"_1 _1 _2" "_1 _1 _2" "_3 _4 _5"';
    default:
      return Array.from({ length: itemsCount }, (_, i) => `"_${i + 1}"`).join(' ');
  }
}
