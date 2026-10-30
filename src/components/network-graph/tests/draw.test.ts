import { afterEach, describe, expect, it, vi } from 'vitest';

import networkFixture from '../../../stories/fixtures/network-graph.fusedash.json';
import { graphThemeColors } from '../lib/theme.js';
import {
  normalizeNetworkGraphData,
  visibleNodeIds,
  type NetworkGraphInput,
} from '../lib/index.js';
import {
  networkNodeElement,
  renderNetworkGraph,
  resizeNetworkGraph,
  setNetworkGraphActive,
  setNetworkGraphColors,
  stopNetworkGraph,
  updateNetworkGraphVisibility,
} from '../render/draw.js';

const MODEL = normalizeNetworkGraphData(networkFixture as NetworkGraphInput);
const measure = (text: string): number => text.length * 6;
const mounted: HTMLElement[] = [];

function draw(extra = {}, model = MODEL): HTMLElement {
  const container = document.createElement('div');
  mounted.push(container);
  renderNetworkGraph(container, { model, visibleIds: null, measure, ...extra });
  return container;
}

afterEach(() => {
  while (mounted.length) stopNetworkGraph(mounted.pop() as HTMLElement);
});

/** Node centres, so a change that reshuffles the layout is visible in a test. */
function transforms(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('g.node')).map(
    (g) => g.getAttribute('transform') ?? '',
  );
}

const nodeNamed = (container: HTMLElement, id: string): Element =>
  networkNodeElement(container, id)?.closest('g.node') as Element;

describe('renderNetworkGraph', () => {
  it('draws one group per node and one line per link', () => {
    const container = draw();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('g.node')).toHaveLength(10);
    expect(container.querySelectorAll('line.link-line')).toHaveLength(9);
  });

  it('draws on the fixed canvas, whatever the size of the widget', () => {
    const svg = draw().querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`-800 ${1375 * -0.35} 2000 1375`);
  });

  it('lays the graph out inside the dashed circle before the first paint', () => {
    const container = draw();
    const [outer] = Array.from(container.querySelectorAll('.graph-decor circle'));
    const radius = Number(outer.getAttribute('r'));
    const cx = Number(outer.getAttribute('cx'));
    const cy = Number(outer.getAttribute('cy'));
    for (const value of transforms(container)) {
      const [x, y] = value.match(/-?[\d.]+/g)?.map(Number) ?? [];
      expect(Math.hypot(x - cx, y - cy)).toBeLessThanOrEqual(radius);
    }
  });

  it('draws small nodes as rings and large ones filled', () => {
    const model = normalizeNetworkGraphData({
      nodes: Array.from({ length: 8 }, (_, i) => ({
        id: `n${i}`,
        label: `N ${i}`,
        value: 10 ** i,
      })),
      links: [],
    });
    const container = draw({}, model);
    const rings = Array.from(container.querySelectorAll('.node-background')).map((node) =>
      node.getAttribute('data-ring'),
    );
    expect(rings).toContain('true');
    expect(rings).toContain('false');
  });

  it('names every node under its circle, cutting a long name', () => {
    const model = normalizeNetworkGraphData({
      nodes: [{ id: 'a', label: 'A very long node name '.repeat(6), value: 1 }],
      links: [],
    });
    const container = draw({}, model);
    expect(container.querySelector('.node-label-title')?.textContent).toContain('...');
    expect(container.querySelector('.node-label title')?.textContent).toContain('A very long');
  });
});

describe('selection', () => {
  const ids = MODEL.nodes.map((node) => node.id);

  it('reports a click on a node and clears it on a second click', () => {
    const onSelect = vi.fn();
    const container = draw({ onSelect });
    const area = nodeNamed(container, ids[0]).querySelector('.node-drag-area') as Element;
    area.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(ids[0]);
    area.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('clears the selection on a click on the empty canvas', () => {
    const onSelect = vi.fn();
    const container = draw({ activeNodeId: ids[0], onSelect });
    container.querySelector('svg')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('dims what is not related to the selected node', () => {
    const container = draw();
    setNetworkGraphActive(container, ids[0]);
    const colors = graphThemeColors('light');
    const opacities = Array.from(
      container.querySelectorAll<SVGGElement>('.node-visual'),
    ).map((node) => node.style.opacity);
    expect(opacities).toContain(String(colors.dimmedOpacity));
    expect(opacities).toContain('1');
    const strokes = Array.from(container.querySelectorAll('line.link-line')).map((line) =>
      line.getAttribute('stroke'),
    );
    expect(strokes).toContain(colors.linkDimmed);
  });

  it('opens the focus view from the + of the selected node', () => {
    const onOpenFocus = vi.fn();
    const container = draw({ activeNodeId: ids[0], onOpenFocus });
    const plus = nodeNamed(container, ids[0]).querySelector('.node-plus') as Element;
    plus.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOpenFocus).toHaveBeenCalledWith(ids[0]);
  });

  it('repaints for a theme without moving a node', () => {
    const container = draw();
    const before = transforms(container);
    setNetworkGraphColors(container, 'dark', []);
    expect(transforms(container)).toEqual(before);
    expect(container.querySelector('.node-halo')?.getAttribute('fill')).toBe(
      graphThemeColors('dark').nodeHalo,
    );
  });
});

describe('updateNetworkGraphVisibility', () => {
  it('hides filtered nodes in place', () => {
    const container = draw();
    const svg = container.querySelector('svg');
    const visible = visibleNodeIds(MODEL, { leftSlider: 3, rightSlider: 7 });

    expect(updateNetworkGraphVisibility(container, visible)).toBe(true);
    expect(container.querySelector('svg')).toBe(svg);

    const hidden = Array.from(container.querySelectorAll<SVGGElement>('g.node')).filter(
      (node) => node.style.opacity === '0',
    );
    expect(hidden).toHaveLength(MODEL.nodes.length - (visible?.size ?? 0));
  });

  it('restores everything when the filter is cleared', () => {
    const container = draw();
    updateNetworkGraphVisibility(container, new Set());
    updateNetworkGraphVisibility(container, null);
    for (const node of container.querySelectorAll<SVGGElement>('g.node')) {
      expect(node.style.opacity).toBe('1');
    }
    for (const line of container.querySelectorAll<SVGLineElement>('line.link-line')) {
      expect(line.style.opacity).toBe('1');
    }
  });

  it('reports false when no graph is mounted', () => {
    expect(updateNetworkGraphVisibility(document.createElement('div'), null)).toBe(false);
  });
});

describe('resizeNetworkGraph', () => {
  it('leaves the layout to the view box', () => {
    const container = draw();
    const before = transforms(container);
    expect(resizeNetworkGraph(container, 400, 300)).toBe(true);
    expect(transforms(container)).toEqual(before);
  });

  it('rejects an empty frame and an unmounted container', () => {
    expect(resizeNetworkGraph(draw(), 0, 300)).toBe(false);
    expect(resizeNetworkGraph(document.createElement('div'), 400, 300)).toBe(false);
  });
});
