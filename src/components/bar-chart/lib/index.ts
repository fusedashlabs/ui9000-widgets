export {
  type BarChartData,
  type BarHoverEntry,
  type BarLayout,
  type BarOrientation,
  type BarPoint,
  type BarSeries,
} from './types.js';
export { normalizeBarData } from './normalize.js';
export {
  barPadFactor,
  collectBarCategories,
  collectBarValueDomain,
  cumulativeValues,
  groupedBarOffset,
  resolveBaseline,
  stackTotals,
  valueAt,
  type BarValueDomainOptions,
} from './domain.js';
export {
  BAR_GROUP_INNER_GAP,
  BAR_GROUP_PADDING,
  barGroupedBandPadding,
  barGroupedMinCategorySpan,
  barGroupSpan,
  barHorizontalMinSpan,
  barMinCategorySpan,
  barRowPitch,
} from './layout.js';
export {
  CATEGORY_LABEL_SLOT_GAP,
  formatCompact,
  labelsFitEverySlot,
  selectTickIndices,
} from './format.js';
