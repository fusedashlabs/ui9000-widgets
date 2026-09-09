import { DEFAULT_SPIKE_SIZES, LAYER_ORDER, type MapVisualisation } from './constants.js';
import { numericValue } from './format.js';
import type { ColorRange, GeoJsonFeature } from './types.js';

/** Inclusive-left, exclusive-right bucket window — FuseDash MapLegend RangeInput. */
export type LayerSlider = {
  leftSlider: number;
  rightSlider: number;
};

export const MUTED_LEGEND_FILL = '#6C758429';

export function defaultLayerSlider(rangeCount: number): LayerSlider {
  return { leftSlider: 0, rightSlider: Math.max(rangeCount, 1) };
}

/**
 * FuseDash RangeInput: left stays strictly below right, right strictly above
 * left — thumbs never share a slot.
 */
export function slideThumb(
  current: LayerSlider,
  edge: 'leftSlider' | 'rightSlider',
  raw: number,
  rangeCount: number,
): LayerSlider {
  const max = Math.max(rangeCount, 1);
  if (edge === 'leftSlider') {
    return {
      leftSlider: Math.max(0, Math.min(current.rightSlider - 1, raw)),
      rightSlider: current.rightSlider,
    };
  }
  return {
    leftSlider: current.leftSlider,
    rightSlider: Math.max(current.leftSlider + 1, Math.min(max, raw)),
  };
}

export function clampLayerSlider(next: LayerSlider, rangeCount: number): LayerSlider | null {
  const max = Math.max(rangeCount, 1);
  const left = Math.max(0, Math.min(max, next.leftSlider));
  const right = Math.max(0, Math.min(max, next.rightSlider));
  if (left >= right) return null;
  return { leftSlider: left, rightSlider: right };
}

export function sliderIndexFromPointer(
  clientX: number,
  track: { left: number; width: number },
  rangeCount: number,
): number {
  const max = Math.max(rangeCount, 1);
  if (track.width <= 0) return 0;
  const ratio = (clientX - track.left) / track.width;
  return Math.max(0, Math.min(max, Math.round(ratio * max)));
}

/** FuseDash RangeInput `getThumbPosition` — percent along that thumb's track. */
export function thumbTrackPercent(value: number, rangeCount: number): string {
  const max = Math.max(rangeCount, 1);
  return `${(value / max) * 100}%`;
}

/** FuseDash RangeInput track shift: 7px when a thumb sits on 0 or MAX. */
export function rangeTrackOffset(edge: 'left' | 'right', value: number, rangeCount: number): string {
  const max = Math.max(rangeCount, 1);
  if (edge === 'left') return value === 0 ? '7px' : '0px';
  return value === max ? '7px' : '0px';
}

export function sliderValueWindow(
  ranges: ColorRange[],
  slider: LayerSlider,
): { start: number; end: number } {
  const start = ranges[slider.leftSlider]?.start ?? 0;
  const end = ranges[Math.max(0, slider.rightSlider - 1)]?.end ?? 0;
  return { start, end };
}

/** FuseDash year filter — rows without the selected year drop out. */
export function featuresForYear(
  features: GeoJsonFeature[],
  year: string | undefined,
  yearKey: string,
): GeoJsonFeature[] {
  if (!year) return features;
  return features.filter((feature) => String(feature.properties?.[yearKey] ?? '') === year);
}

/** Keep marks whose value sits inside the legend thumb window. */
export function featuresInSliderRange(
  features: GeoJsonFeature[],
  ranges: ColorRange[],
  slider: LayerSlider,
): GeoJsonFeature[] {
  if (!ranges.length) return features;
  const { start, end } = sliderValueWindow(ranges, slider);
  return features.filter((feature) => {
    const value = numericValue(feature.properties?.value);
    return value >= start && value <= end;
  });
}

/** FuseDash MapLegend lists markers → spikes → bubbles → choropleth. */
export function legendLayerOrder<T extends { visualisationType: MapVisualisation }>(layers: T[]): T[] {
  return [...layers].sort(
    (a, b) => (LAYER_ORDER[a.visualisationType] ?? 99) - (LAYER_ORDER[b.visualisationType] ?? 99),
  ).reverse();
}

export function layerAverage(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Client MapLegendItem `renderValue`. */
export function formatAverage(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const decimals = value % 1 !== 0 ? 2 : 0;
  return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Client `formatCapitalizedText` — first word capped, `_`/`-` → spaces. */
export function formatFieldLabel(text: string): string {
  if (!text) return '';
  if (!Number.isNaN(Number(text))) return text;
  const formatted = text.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

/** Client MapLegendItem `formatValue` — abbreviated bucket edge. */
export function formatLegendBucket(value: number, toFixed = 2): string {
  if (!Number.isFinite(value) || value === Infinity || value === -Infinity) return '0';
  if (Math.abs(value) < 1000) return value.toFixed(toFixed);
  const abbreviations = ['B', 'M', 'K'];
  for (let i = 0; i < abbreviations.length; i++) {
    const unit = Math.pow(1000, abbreviations.length - i);
    if (Math.abs(value) >= unit) return `${(value / unit).toFixed(1)} ${abbreviations[i]}`;
  }
  return value.toFixed(toFixed);
}

/** Legend spikes use DEFAULT_SPIKE_SIZES, not the map `range.height` (those go to 100px). */
export function legendSpikeHeight(index: number): number {
  const size = DEFAULT_SPIKE_SIZES[index] ?? 8;
  return Math.max(0, Math.round(size - size / 5));
}
