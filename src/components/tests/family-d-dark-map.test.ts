import { describe, expect, it } from 'vitest';

import { mapChartStyles } from '../map-chart/element/styles.js';
import { themeSpikeLayer } from '../map-chart/lib/join.js';
import { choroplethSelectionPaint } from '../map-chart/render/draw.js';
import type { MapLayerModel } from '../map-chart/lib/types.js';

const spike = {
  visualisationType: 'spike',
  layerId: 'temp',
  fillColor: '#473DD9',
  colorRanges: [],
  features: [
    {
      type: 'Feature',
      properties: { value: 10, label: 'FR' },
      geometry: { type: 'Point', coordinates: [0, 0] },
    },
  ],
} as unknown as MapLayerModel;

describe('family D dark map ink', () => {
  it('paints spike labels from the host theme', () => {
    const dark = themeSpikeLayer(spike, 'dark').features[0].properties?.svgContent;
    const light = themeSpikeLayer(spike, 'light').features[0].properties?.svgContent;
    expect(String(dark)).toContain('fill="#EFF0F1"');
    expect(String(dark)).toContain('stroke="#13161D"');
    expect(String(dark)).not.toContain('fill="black"');
    expect(String(light)).toContain('fill="#000000"');
    expect(String(light)).toContain('stroke="#ffffff"');
  });

  it('strokes a hovered region with the dark ink', () => {
    expect(choroplethSelectionPaint('dark')['line-color']).toBe('#EFF0F1');
    expect(choroplethSelectionPaint('light')['line-color']).toBe('#000000');
    expect(choroplethSelectionPaint()['line-color']).toBe('#000000');
  });

  it('keeps the legend on the surface token and the tooltip ink inverted', () => {
    const css = mapChartStyles.cssText;
    expect(css).toContain('background: var(--ui9000-color-surface, #ffffff)');
    expect(css).toContain('color: var(--ui9000-color-surface, #ffffff)');
    expect(css).not.toContain('color: #fff');
  });
});
