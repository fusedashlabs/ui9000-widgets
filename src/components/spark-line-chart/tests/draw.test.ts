// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeSparkLineData } from '../lib/index.js';
import { renderSparkLineChart } from '../render/draw.js';

const multiSeries = normalizeSparkLineData({
  series: [
    {
      id: 'Rain',
      color: '#473DD9',
      points: [
        { x: '2024-01-01', y: 68 },
        { x: '2024-01-02', y: 60 },
        { x: '2024-01-03', y: 59 },
      ],
    },
    {
      id: 'Snow',
      color: '#36C4A5',
      points: [
        { x: '2024-01-01', y: 63 },
        { x: '2024-01-02', y: 58 },
        { x: '2024-01-03', y: 64 },
      ],
    },
  ],
});

let host: HTMLElement;

function render(series = multiSeries, options = {}): SVGSVGElement {
  renderSparkLineChart(host, {
    series,
    width: 640,
    height: 320,
    theme: DEFAULT_THEME,
    ...options,
  });
  const svg = host.querySelector('svg');
  expect(svg).not.toBeNull();
  return svg!;
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});

describe('renderSparkLineChart', () => {
  it('draws one path per series and grid lines', () => {
    const svg = render();
    expect(svg.querySelectorAll('.series path.line')).toHaveLength(2);
    expect(svg.querySelectorAll('.grid line').length).toBeGreaterThan(0);
  });

  it('draws y-axis ticks', () => {
    const svg = render();
    expect(svg.querySelectorAll('.y-axis .tick').length).toBeGreaterThan(0);
  });

  it('skips draw when fewer than two x values', () => {
    const single = normalizeSparkLineData({
      points: [{ x: '2024-01-01', y: 10 }],
    });
    renderSparkLineChart(host, {
      series: single,
      width: 400,
      height: 300,
      theme: DEFAULT_THEME,
    });
    expect(host.querySelector('svg')).toBeNull();
  });
});
