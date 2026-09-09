import type { WidgetTheme } from '../types/index.js';
import type { ChartLegendEntry } from '../element/chart-legend-render.js';
import { seriesColor as fdSeriesColor } from './fusedash-visual.js';

type SeriesLike = {
  id: string;
  name?: string;
  color?: string;
};

export function resolveSeriesLegendColor(
  series: SeriesLike,
  index: number,
  theme: WidgetTheme,
): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

export function lineLegendEntries(
  series: SeriesLike[],
  theme: WidgetTheme,
): ChartLegendEntry[] {
  return series.map((s, i) => ({
    label: s.name ?? s.id,
    swatch: {
      kind: 'line',
      color: resolveSeriesLegendColor(s, i, theme),
    },
  }));
}

export function swatchLegendEntries(
  groups: string[],
  theme: WidgetTheme,
  colorForGroup?: (group: string, index: number) => string,
): ChartLegendEntry[] {
  return groups.map((group, i) => ({
    label: group,
    swatch: {
      kind: 'swatch',
      color: colorForGroup?.(group, i) ?? resolveSeriesLegendColor({ id: group }, i, theme),
      opacity: 0.8,
    },
  }));
}
