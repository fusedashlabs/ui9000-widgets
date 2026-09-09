import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import networkFixture from '../../../stories/fixtures/network-graph.fusedash.json';
import {
  normalizeNetworkGraphData,
  visibleNodeIds,
  type NetworkGraphInput,
} from '../lib/index.js';
import {
  renderNetworkGraph,
  resizeNetworkGraph,
  stopNetworkGraph,
  updateNetworkGraphVisibility,
} from '../render/draw.js';

const MODEL = normalizeNetworkGraphData(networkFixture as NetworkGraphInput);

function draw(width = 800, height = 480): HTMLElement {
  const container = document.createElement('div');
  renderNetworkGraph(container, {
    model: MODEL,
    visibleIds: null,
    width,
    height,
    theme: DEFAULT_THEME,
  });
  return container;
}

/** Node centres, so a redraw that reshuffles the layout is visible in a test. */
function transforms(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('g.node')).map(
    (g) => g.getAttribute('transform') ?? '',
  );
}

describe('renderNetworkGraph', () => {
  it('draws one group per node and one line per link', () => {
    const container = draw();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('g.node')).toHaveLength(10);
    expect(container.querySelectorAll('line.link-line')).toHaveLength(9);
    // Every link carries a pill, so the legend filter never has to build one.
    expect(container.querySelectorAll('g.link-label')).toHaveLength(9);
  });
});

describe('updateNetworkGraphVisibility', () => {
  it('hides filtered nodes in place — same SVG, same zones', () => {
    const container = draw();
    const svg = container.querySelector('svg');
    const before = transforms(container);

    // Top three buckets only: citigroup, capital_one, wells_fargo.
    const visible = visibleNodeIds(MODEL, { leftSlider: 5, rightSlider: 7 });
    expect(updateNetworkGraphVisibility(container, visible)).toBe(true);

    expect(container.querySelector('svg')).toBe(svg);
    expect(container.querySelectorAll('g.node')).toHaveLength(10);
    // Isolated leftovers stay pinned in the zone the full graph gave them.
    expect(transforms(container)).toEqual(before);

    const groups = Array.from(container.querySelectorAll<SVGGElement>('g.node'));
    const shown = groups.filter((g) => g.style.opacity === '1');
    expect(shown).toHaveLength(3);
    for (const hidden of groups.filter((g) => g.style.opacity === '0')) {
      expect(hidden.style.pointerEvents).toBe('none');
    }
    const lines = Array.from(container.querySelectorAll<SVGLineElement>('line.link-line'));
    expect(lines.some((l) => l.style.opacity === '0')).toBe(true);
  });

  it('restores everything when the filter is cleared', () => {
    const container = draw();
    updateNetworkGraphVisibility(container, visibleNodeIds(MODEL, { leftSlider: 5, rightSlider: 7 }));
    updateNetworkGraphVisibility(container, null);

    const groups = Array.from(container.querySelectorAll<SVGGElement>('g.node'));
    expect(groups.every((g) => g.style.opacity === '1')).toBe(true);
    const lines = Array.from(container.querySelectorAll<SVGLineElement>('line.link-line'));
    expect(lines.every((l) => l.style.opacity === '1')).toBe(true);
  });

  it('reports false when no graph is mounted', () => {
    const container = document.createElement('div');
    expect(updateNetworkGraphVisibility(container, null)).toBe(false);
    stopNetworkGraph(draw());
    expect(updateNetworkGraphVisibility(document.createElement('div'), null)).toBe(false);
  });
});

describe('resizeNetworkGraph', () => {
  it('re-frames the settled layout without rebuilding or re-seeding it', () => {
    const container = draw(800, 480);
    const svg = container.querySelector('svg');
    const nodes = container.querySelectorAll('g.node');
    const before = transforms(container);

    expect(resizeNetworkGraph(container, 520, 360)).toBe(true);

    expect(container.querySelector('svg')).toBe(svg);
    expect(container.querySelectorAll('g.node')[0]).toBe(nodes[0]);
    expect(svg?.getAttribute('viewBox')).toBe('0 0 520 360');
    // Nodes are only pulled back inside the smaller frame, never re-simulated.
    expect(transforms(container)).not.toEqual([]);
    expect(transforms(container)).toHaveLength(before.length);
  });

  it('rejects an empty frame and an unmounted container', () => {
    const container = draw();
    expect(resizeNetworkGraph(container, 0, 300)).toBe(false);
    expect(resizeNetworkGraph(document.createElement('div'), 400, 300)).toBe(false);
  });
});
