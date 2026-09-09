// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeSparkLineData } from '../../spark-line-chart/lib/index.js';
import { renderSparkLineChart } from '../../spark-line-chart/render/draw.js';

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
    showArea: true,
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

describe('renderSparkLineChart (showArea)', () => {
  it('draws area and line paths per series', () => {
    const svg = render();
    expect(svg.querySelectorAll('.series path.area')).toHaveLength(2);
    expect(svg.querySelectorAll('.series path.line')).toHaveLength(2);
  });

  it('area paths use fill-opacity 0.1 and baseline at y=0', () => {
    const svg = render();
    const area = svg.querySelector('.series path.area');
    expect(area?.getAttribute('fill-opacity')).toBe('0.1');
    expect(area?.getAttribute('pointer-events')).toBe('none');
    expect(area?.getAttribute('d')).toBeTruthy();
  });
});
