import { describe, expect, it } from 'vitest';

import { CHART_STYLE_IDS, qualitativePalette, sequentialPalette } from '../../../utils/chart-theme.js';
import { scenePalette } from '../render/index.js';

const luminance = ([r, g, b]: number[]) => 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
const hex = (value: string) => {
  const n = Number.parseInt(value.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

describe('scene palette', () => {
  it('lights the scene from the page style’s sequential ramp, at the brightness the scene was lit with', () => {
    for (const style of CHART_STYLE_IDS) {
      const palette = scenePalette(style);
      const ramp = sequentialPalette(style);
      // the arc's glow, the glint and the grid are steps of the ramp
      expect(palette.arcGlow).toBe(`rgb(${hex(ramp[2]!).replace(/,/g, ' ')} / 0.6)`);
      expect(palette.glint).toBe(`rgb(${hex(ramp[1]!).replace(/,/g, ' ')} / 0.9)`);
      expect(palette.motes[0]).toBe(hex(ramp[1]!));
      // every style lights the scene about as brightly as the original cool blue
      expect(luminance(palette.light)).toBeGreaterThan(0.3);
      expect(luminance(palette.light)).toBeLessThanOrEqual(0.46);
      expect(Math.max(...palette.glass)).toBeCloseTo(1);
    }
  });

  it('runs the traffic in the page style’s secondary colour', () => {
    expect(qualitativePalette('default', 2)[1]).toBe('#36C4A5');
    const { traffic, trafficCss } = scenePalette('default');
    // teal: green and blue over red
    expect(traffic[1]).toBeGreaterThan(traffic[0]);
    expect(traffic[2]).toBeGreaterThan(traffic[0]);
    expect(trafficCss).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    expect(scenePalette('palette1').trafficCss).not.toBe(trafficCss);
  });

  it('keeps the instruments near white, with a breath of the ramp', () => {
    expect(scenePalette('default').line).toBe('rgb(229,229,251)');
    expect(scenePalette('palette4').line).not.toBe(scenePalette('default').line);
  });

  it('draws a light page in ink: deep hairlines, a slate ink, the deep ramp for the floor', () => {
    const light = scenePalette('default', 'light');
    const dark = scenePalette('default', 'dark');
    expect(light.mode).toBe('light');
    expect(light.line).toBe('rgb(54,60,119)');
    expect(light.grid).toBe('rgb(71,61,217)');
    // the ink is dark, and the picture's own light is the same as by night (the last pass turns it to ink)
    expect(Math.max(...light.ink)).toBeLessThan(0.45);
    expect(light.light).toEqual(dark.light);
    expect(dark.glintStroke).toBe('#ffffff');
    expect(light.glintStroke).toBe('rgb(71,61,217)');
  });
});
