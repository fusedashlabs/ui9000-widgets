import { getFormattingKeys } from './getFormattingKeys.js';
import type {
  ChartMarkerItem,
  ChartMarkerShape,
  UniversalFormattingInput,
} from './types.js';

/** Chart types that support markers. All others get empty array. */
const CHARTS_WITH_MARKERS = new Set([
  'lineChart',
  'areaChart',
  'lollipopChart',
  'radarChart',
  'scatterplotChart',
  'qqPlot',
]);

const MARKER_SHAPES: ChartMarkerShape[] = [
  'donut',
  'circle',
  'square',
  'rhombus',
  'triangle',
  'cross',
];

function defaultShapeForChartType(chartType: string): ChartMarkerShape {
  switch (chartType) {
    case 'scatterplotChart':
    case 'qqPlot':
      return 'circle';
    case 'lollipopChart':
      return 'rhombus';
    default:
      return 'donut';
  }
}

function isSameMarkers(existing: { key: string }[], keys: string[]): boolean {
  if (!Array.isArray(existing) || existing.length !== keys.length) {
    return false;
  }
  const existingKeys = new Set(existing.map((e) => e.key));
  return keys.every((k) => existingKeys.has(k));
}

/**
 * Returns markers (key + shape) for a chart.
 * Only lineChart, areaChart, lollipopChart, radarChart, scatterplotChart (and qqPlot)
 * support markers; all other chart types get empty array.
 */
export function getUniversalMarkers(
  input: UniversalFormattingInput,
): ChartMarkerItem[] {
  if (!CHARTS_WITH_MARKERS.has(input.chartType)) {
    return [];
  }

  const keys = getFormattingKeys(input);

  if (keys.length === 0) {
    const shape = defaultShapeForChartType(input.chartType);
    return [{ key: 'default', shape }];
  }

  const existing = input.existingMarkers as ChartMarkerItem[] | undefined;
  if (existing?.length && isSameMarkers(existing, keys)) {
    return existing;
  }

  return keys.map((key, index) => ({
    key,
    shape: MARKER_SHAPES[index % MARKER_SHAPES.length],
  }));
}
