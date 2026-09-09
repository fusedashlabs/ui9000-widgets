import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import fusedashFixture from '../../../stories/fixtures/sankey.fusedash.json';
import {
  buildColorRanges,
  normalizeSankeyData,
  type SankeyFusePayload,
} from '../lib/index.js';
import { renderSankeyChart } from '../render/draw.js';

const FUSEDASH_MOCK = fusedashFixture as unknown as SankeyFusePayload;

function draw(width = 800, height = 420): HTMLElement {
  const container = document.createElement('div');
  const model = normalizeSankeyData(FUSEDASH_MOCK);
  renderSankeyChart(container, {
    model,
    colorRanges: buildColorRanges(
      model.links.map((l) => l.value),
      model.colors,
    ),
    width,
    height,
    theme: DEFAULT_THEME,
    onLinkHover: () => undefined,
  });
  return container;
}

describe('renderSankeyChart', () => {
  it('draws one ribbon per link and one label + rule per node', () => {
    const container = draw();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('.links path')).toHaveLength(25);
    expect(container.querySelectorAll('.node-labels text')).toHaveLength(13);
    expect(container.querySelectorAll('.node-rules line')).toHaveLength(13);
  });

  it('anchors the two columns to opposite sides and truncates long labels', () => {
    const labels = [...draw().querySelectorAll('.node-labels text')];
    const anchors = new Set(labels.map((t) => t.getAttribute('text-anchor')));
    expect(anchors).toEqual(new Set(['start', 'end']));
    expect(labels.every((t) => (t.textContent ?? '').length <= 10)).toBe(true);
  });

  it('paints ribbons at half alpha until they are hovered', () => {
    const container = draw();
    const paths = [...container.querySelectorAll<SVGPathElement>('.links path')];
    expect(paths.every((p) => p.getAttribute('stroke')?.endsWith('80'))).toBe(true);
    expect(paths.every((p) => Number(p.getAttribute('stroke-width')) >= 1)).toBe(true);

    paths[0].dispatchEvent(new MouseEvent('mouseenter'));
    expect(paths[0].getAttribute('stroke')).toHaveLength(7);
    expect(paths[0].getAttribute('opacity')).toBe('1');
    expect(paths[1].getAttribute('opacity')).toBe('0.5');

    paths[0].dispatchEvent(new MouseEvent('mouseleave'));
    expect(paths[1].getAttribute('opacity')).toBe('1');
  });

  it('focuses a node and its ribbons on click, and releases on a second click', () => {
    const container = draw();
    const paths = [...container.querySelectorAll<SVGPathElement>('.links path')];
    const labels = [...container.querySelectorAll<SVGTextElement>('.node-labels text')];

    labels[0].dispatchEvent(new MouseEvent('click'));
    const focused = paths.filter((p) => p.getAttribute('opacity') === '1');
    expect(focused.length).toBeGreaterThan(0);
    expect(focused.length).toBeLessThan(paths.length);
    expect(labels[0].getAttribute('font-weight')).toBe('600');

    labels[0].dispatchEvent(new MouseEvent('click'));
    expect(paths.every((p) => p.getAttribute('opacity') === '1')).toBe(true);
    expect(labels[0].getAttribute('font-weight')).toBe('400');
  });

  it('hides the node rules on a short frame and renders nothing when tiny', () => {
    expect(draw(800, 70).querySelectorAll('.node-rules line')).toHaveLength(0);
    expect(draw(60, 40).querySelectorAll('svg')).toHaveLength(0);
  });
});
