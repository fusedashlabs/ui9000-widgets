import { describe, expect, it } from 'vitest';
import { pickQualitativePalette, sequentialColors, seriesInk, useSeriesMode } from './fuse-palette.js';
import { seriesColor } from './fusedash-visual.js';

describe('dark series contrast', () => {
  it('keeps the light qualitative palette', () => {
    expect(seriesInk('#473DD9', 'light')).toBe('#473DD9');
    expect(seriesInk('#56546D', 'light')).toBe('#56546D');
    expect(pickQualitativePalette(0, 12)[0]).toBe('#473DD9');
    expect(pickQualitativePalette(0, 12)[5]).toBe('#56546D');
    expect(seriesColor(0)).toBe('#473DD9');
    expect(seriesColor(5)).toBe('#56546D');
  });

  it('lifts the two series colors that sit under 3:1 on #13161D', () => {
    expect(seriesInk('#473DD9', 'dark')).toBe('#584FDC');
    expect(seriesInk('#56546D', 'dark')).toBe('#636279');
    expect(seriesInk('#36C4A5', 'dark')).toBe('#36C4A5');
    expect(seriesColor(0, undefined, 'dark')).toBe('#584FDC');
    expect(seriesColor(5, undefined, 'dark')).toBe('#636279');
    expect(seriesColor(0, '#473DD9', 'dark')).toBe('#473DD9');
    expect(useSeriesMode('dark', () => seriesColor(0))).toBe('#584FDC');
    expect(seriesColor(0)).toBe('#473DD9');

    const dark = useSeriesMode('dark', () => pickQualitativePalette(0, 12));
    expect(dark[0]).toBe('#584FDC');
    expect(dark[5]).toBe('#636279');
    expect(dark[2]).toBe('#36C4A5');
    expect(pickQualitativePalette(0, 2)[0]).toBe('#473DD9');
  });

  it('follows the client page style while a chart is painting', () => {
    expect(pickQualitativePalette(2, 2)).toEqual(['#473DD9', '#36C4A5']);
    const palette1 = useSeriesMode('light', () => pickQualitativePalette(4, 4), 'palette1');
    expect(palette1).toEqual(['#2039B4', '#88B802', '#D2382D', '#56546D']);
    expect(pickQualitativePalette(2, 2)[0]).toBe('#473DD9');

    const ramp = useSeriesMode('light', () => sequentialColors(), 'palette4');
    expect(ramp[0]).toBe('#77C59D');
    expect(ramp[ramp.length - 1]).toBe('#0C6E40');
    expect(sequentialColors()[0]).toBe('#D6D3FF');
  });
});
