// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeScatterSparklineData } from '../lib/index.js';
import { renderScatterSparklineChart } from '../render/draw.js';
import scatterSparklineFixture from '../../../stories/fixtures/scatter-sparkline.fusedash.json';

const model = normalizeScatterSparklineData(scatterSparklineFixture as never);

let host: HTMLElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});

describe('renderScatterSparklineChart', () => {
  it('renders line, gradient area, and scatter markers', () => {
    renderScatterSparklineChart(host, {
      model,
      width: 640,
      height: 320,
      theme: DEFAULT_THEME,
    });

    const svg = host.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(host.querySelectorAll('.scatter-marker').length).toBe(
      model.scatterPoints.length,
    );
    expect(host.querySelectorAll('.line').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('.area').length).toBeGreaterThan(0);
  });
});
