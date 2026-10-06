import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeBandUtilization, plotWidth, labelGutter, BAND_LABEL_GAP } from '../lib/index.js';
import { renderBandUtilization } from '../render/draw.js';
import fixture from '../../../stories/fixtures/band-utilization.json';

function widths(host: HTMLElement, row: string): number[] {
  return [...host.querySelectorAll<SVGRectElement>(`.band-segment[data-row="${row}"]`)].map(
    (node) => Number(node.getAttribute('width')),
  );
}

describe('renderBandUtilization', () => {
  it('draws segment width as the share of the track and writes the percent inside', () => {
    const host = document.createElement('div');
    const model = normalizeBandUtilization(fixture);
    const width = 640;
    renderBandUtilization(host, {
      model,
      width,
      theme: DEFAULT_THEME,
      themeMode: 'light',
      showTooltip: false,
    });

    const track = host.querySelector<SVGRectElement>('.band-track[data-row="A1"]');
    const trackWidth = Number(track?.getAttribute('width'));
    expect(trackWidth).toBeCloseTo(plotWidth(width, labelGutter(['A1', 'B1', 'C1', 'C2'])));

    const [low, medium, high] = widths(host, 'A1');
    expect(low / trackWidth).toBeCloseTo(0.22, 2);
    expect(medium / trackWidth).toBeCloseTo(0.48, 2);
    expect(high / trackWidth).toBeCloseTo(0.3, 2);

    const labels = [...host.querySelectorAll('.band-value')].map((node) => node.textContent);
    expect(labels.slice(0, 3)).toEqual(['22%', '48%', '30%']);
    expect(host.querySelector('.tick')).toBeNull();
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Band Utilization by Sector',
    );
  });

  it('leaves a short row short instead of stretching it to the track', () => {
    const host = document.createElement('div');
    const model = normalizeBandUtilization({
      name: 'Short',
      yAxe: ['sector'],
      xAxe: ['share'],
      groupBy: ['band'],
      axisDetails: {
        share: {
          label: 'Percent',
          measure_unit_symbol: '%',
        },
      },
      data: [
        { sector: 'E1', band: 'Low', share: 40 },
        { sector: 'E1', band: 'Medium', share: 25 },
        { sector: 'E1', band: 'High', share: 10 },
      ],
    });
    renderBandUtilization(host, {
      model,
      width: 500,
      theme: DEFAULT_THEME,
      showTooltip: false,
    });

    const track = Number(
      host.querySelector('.band-track')?.getAttribute('width'),
    );
    const filled = widths(host, 'E1').reduce((acc, value) => acc + value, 0);
    expect(filled / track).toBeCloseTo(0.75, 2);
    expect(host.querySelector('.band-track')?.getAttribute('data-complete')).toBe('false');
    expect(host.querySelector('.tick')).toBeNull();
  });

  it('clips a long row name so it stops before the band', () => {
    const host = document.createElement('div');
    const name = 'North American Distribution Sector Alpha';
    const model = normalizeBandUtilization({
      yAxe: ['sector'],
      xAxe: ['share'],
      groupBy: ['band'],
      data: [
        { sector: name, band: 'Low', share: 40 },
        { sector: name, band: 'High', share: 60 },
      ],
    });
    renderBandUtilization(host, {
      model,
      width: 640,
      theme: DEFAULT_THEME,
      showTooltip: false,
    });

    const gutter = Number(host.querySelector('.band-label-clip')?.getAttribute('width'));
    const trackX = Number(host.querySelector('.band-track')?.getAttribute('x'));
    expect(trackX).toBe(gutter + BAND_LABEL_GAP);
    const visible = [...(host.querySelector('.band-row-label')?.childNodes ?? [])].find(
      (node) => node.nodeType === Node.TEXT_NODE,
    );
    expect(visible?.textContent?.endsWith('…')).toBe(true);
    expect(visible?.textContent?.length).toBeLessThan(name.length);
  });

  it('centers an overflowing segment label in the visible part of the track', () => {
    const host = document.createElement('div');
    const model = normalizeBandUtilization({
      yAxe: ['sector'],
      xAxe: ['share'],
      groupBy: ['band'],
      data: [
        { sector: 'E1', band: 'Low', share: 80 },
        { sector: 'E1', band: 'High', share: 40 },
      ],
    });
    renderBandUtilization(host, {
      model,
      width: 500,
      theme: DEFAULT_THEME,
      showTooltip: false,
    });

    const track = host.querySelector('.band-track');
    const plotX = Number(track?.getAttribute('x'));
    const trackWidth = Number(track?.getAttribute('width'));
    const rect = host.querySelector('.band-segment[data-series="High"]');
    expect(Number(rect?.getAttribute('width')) / trackWidth).toBeCloseTo(0.4, 2);

    const label = host.querySelector('.band-value[data-series="High"]');
    const x = Number(label?.getAttribute('x'));
    expect(x).toBeCloseTo(plotX + 0.9 * trackWidth, 0);
    expect(x).toBeGreaterThan(plotX);
    expect(x).toBeLessThan(plotX + trackWidth);
  });
});
