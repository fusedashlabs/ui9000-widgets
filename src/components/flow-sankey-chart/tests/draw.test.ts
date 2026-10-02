import { describe, expect, it, vi } from 'vitest';

import figmaFixture from '../../../stories/fixtures/flow-sankey.figma.json';
import { DEFAULT_THEME } from '../../../types/index.js';
import {
  normalizeFlowSankeyData,
  type FlowGraphPayload,
} from '../lib/index.js';
import {
  renderFlowSankeyChart,
  type RenderFlowSankeyOptions,
} from '../render/draw.js';

const FIGMA_MOCK = figmaFixture as unknown as FlowGraphPayload;

function draw(
  width = 900,
  height = 620,
  extra: Partial<RenderFlowSankeyOptions> = {},
): HTMLElement {
  const container = document.createElement('div');
  renderFlowSankeyChart(container, {
    model: normalizeFlowSankeyData(FIGMA_MOCK),
    width,
    height,
    theme: DEFAULT_THEME,
    ...extra,
  });
  return container;
}

describe('renderFlowSankeyChart', () => {
  it('draws one svg, one ribbon per link and one bar per node', () => {
    const container = draw();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('.flow-links path')).toHaveLength(42);
    expect(container.querySelectorAll('.flow-nodes path')).toHaveLength(27);
  });

  it('draws one rail and one header per stage column', () => {
    const container = draw();
    expect(container.querySelectorAll('.flow-rails path')).toHaveLength(4);
    const headers = [...container.querySelectorAll('.flow-stages text')].map(
      (t) => t.textContent,
    );
    expect(headers).toEqual([
      'ROOT CAUSE CATEGORY',
      'SUBCATEGORY',
      'SPECIFIC CAUSE',
      'IMPACT/OUTCOME',
    ]);
  });

  it('renders the percentage gutter only when show-grid is on', () => {
    expect(draw().querySelectorAll('.flow-axis text')).toHaveLength(11);
    const ticks = [...draw().querySelectorAll('.flow-axis text')].map(
      (t) => t.textContent,
    );
    expect(ticks[0]).toBe('0%');
    expect(ticks[ticks.length - 1]).toBe('100%');

    const off = draw(900, 620, { showGrid: false });
    expect(off.querySelectorAll('.flow-axis')).toHaveLength(0);
  });

  it('keeps every axis tick label inside the canvas', () => {
    // Anchored at its right edge, a tick wider than the gutter would spill off
    // the left of the SVG and be clipped.
    const charRatio = 0.62;
    for (const [w, h] of [
      [900, 620],
      [1400, 940],
      [520, 340],
    ]) {
      const container = draw(w, h);
      const labels = [...container.querySelectorAll('.flow-axis text')];
      expect(labels.length).toBeGreaterThan(0);

      for (const label of labels) {
        const anchorX = Number(label.getAttribute('x'));
        const size = Number(label.getAttribute('font-size'));
        const width = (label.textContent ?? '').length * size * charRatio;
        expect(label.getAttribute('text-anchor')).toBe('end');
        expect(anchorX - width).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('starts the tick stubs inside the canvas too', () => {
    const lines = [...draw().querySelectorAll('.flow-axis line')];
    for (const line of lines) {
      expect(Number(line.getAttribute('x1'))).toBeGreaterThanOrEqual(0);
    }
  });

  it('labels the value and share next to each visible node', () => {
    const container = draw();
    const text = container.querySelector('.flow-labels')?.textContent ?? '';
    expect(text).toContain('Input Voltage');
    expect(text).toContain('156');
    expect(text).toContain('(22.8%)');
    expect(text).toContain('(45.5%)');
  });

  it('drops label blocks for bands too thin to carry them', () => {
    const tall = draw(900, 620).querySelectorAll('.flow-label').length;
    const short = draw(900, 200).querySelectorAll('.flow-label').length;

    expect(short).toBeLessThan(tall);
    expect(short).toBeGreaterThan(0);
  });

  describe('label blocks', () => {
    /** Vertical extent of one label block, from its own rendered children. */
    function extent(group: Element): { top: number; bottom: number } {
      const ys: number[] = [];
      for (const child of group.children) {
        if (child.tagName === 'rect') {
          const y = Number(child.getAttribute('y'));
          ys.push(y, y + Number(child.getAttribute('height')));
        } else {
          const y = Number(child.getAttribute('y'));
          const size = Number(child.getAttribute('font-size')) || 11;
          // Baseline sits a little below `y` via dy; count a full line either way.
          ys.push(y, y + size * 1.2);
        }
      }
      return { top: Math.min(...ys), bottom: Math.max(...ys) };
    }

    const blocks = (container: HTMLElement) =>
      [...container.querySelectorAll('.flow-label')].map(extent);

    it('keeps every label block inside the canvas', () => {
      for (const [w, h] of [
        [900, 620],
        [1400, 940],
        [700, 420],
      ]) {
        for (const block of blocks(draw(w, h))) {
          expect(block.top).toBeGreaterThanOrEqual(0);
          expect(block.bottom).toBeLessThanOrEqual(h);
        }
      }
    });

    it('leaves real breathing room between label blocks in a column', () => {
      for (const [w, h] of [
        [900, 620],
        [700, 420],
      ]) {
        const container = draw(w, h);
        const byColumn = new Map<string, { top: number; bottom: number }[]>();
        for (const group of container.querySelectorAll('.flow-label')) {
          const key = group.getAttribute('data-stage') ?? '';
          const list = byColumn.get(key);
          if (list) list.push(extent(group));
          else byColumn.set(key, [extent(group)]);
        }
        expect(byColumn.size).toBeGreaterThan(1);

        for (const column of byColumn.values()) {
          column.sort((a, b) => a.top - b.top);
          for (let i = 1; i < column.length; i += 1) {
            // Not merely non-overlapping: blocks that only touch read as
            // collided, which is what the value row and the next icon chip did.
            expect(column[i].top - column[i - 1].bottom).toBeGreaterThanOrEqual(3);
          }
        }
      }
    });
  });

  it('shares one gradient per severity pair instead of one per ribbon', () => {
    const gradients = draw().querySelectorAll('defs linearGradient');
    expect(gradients.length).toBeGreaterThan(0);
    expect(gradients.length).toBeLessThanOrEqual(16);
  });

  it('rings the selected node and lights only its path', () => {
    const container = draw(900, 620, { selectedId: 'power-loss' });
    const bars = [...container.querySelectorAll('.flow-nodes path')];
    const ringed = bars.filter((b) => b.getAttribute('stroke-dasharray'));
    expect(ringed).toHaveLength(1);

    const ribbons = [...container.querySelectorAll('.flow-links path')];
    const lit = ribbons.filter((r) => r.getAttribute('opacity') === '1');
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.length).toBeLessThan(ribbons.length);
  });

  it('reports hover on a ribbon without rebuilding the plot', () => {
    const onLinkHover = vi.fn();
    const container = draw(900, 620, { onLinkHover });
    const svg = container.querySelector('svg');
    const ribbon = container.querySelector('.flow-links path') as SVGPathElement;

    ribbon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(onLinkHover).toHaveBeenCalledTimes(1);
    expect(onLinkHover.mock.calls[0][0]).toMatchObject({
      sourceLabel: expect.any(String),
      value: expect.any(Number),
    });
    // Same SVG node — hover dims, it never redraws.
    expect(container.querySelector('svg')).toBe(svg);
  });

  it('dims siblings while a ribbon is hovered and restores on leave', () => {
    const container = draw();
    const ribbons = [...container.querySelectorAll('.flow-links path')];
    const resting = ribbons[1].getAttribute('opacity');

    ribbons[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(ribbons[0].getAttribute('opacity')).toBe('1');
    expect(Number(ribbons[1].getAttribute('opacity'))).toBeLessThan(1);

    ribbons[0].dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(ribbons[1].getAttribute('opacity')).toBe(resting);
  });

  it('toggles selection through onSelect when a node is clicked', () => {
    const onSelect = vi.fn();
    const container = draw(900, 620, { onSelect });
    const bar = container.querySelector('.flow-nodes path') as SVGPathElement;

    bar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.any(String));

    bar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('reports node hover with its stage and share', () => {
    const onNodeHover = vi.fn();
    const container = draw(900, 620, { onNodeHover });
    const bar = container.querySelector('.flow-nodes path') as SVGPathElement;

    bar.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(onNodeHover.mock.calls[0][0]).toMatchObject({
      label: expect.any(String),
      stageLabel: expect.any(String),
      share: expect.any(Number),
    });
  });

  it('redraws cleanly into the same container on resize', () => {
    const container = document.createElement('div');
    const model = normalizeFlowSankeyData(FIGMA_MOCK);
    for (const [w, h] of [
      [900, 620],
      [560, 360],
      [1200, 780],
    ]) {
      renderFlowSankeyChart(container, {
        model,
        width: w,
        height: h,
        theme: DEFAULT_THEME,
      });
      expect(container.querySelectorAll('svg')).toHaveLength(1);
      expect(container.querySelector('svg')?.getAttribute('width')).toBe(
        String(w),
      );
    }
  });

  it('draws nothing for an empty model or a frame below the minimum', () => {
    const empty = document.createElement('div');
    renderFlowSankeyChart(empty, {
      model: normalizeFlowSankeyData([]),
      width: 900,
      height: 620,
      theme: DEFAULT_THEME,
    });
    expect(empty.querySelectorAll('svg')).toHaveLength(0);

    expect(draw(120, 620).querySelectorAll('svg')).toHaveLength(0);
    expect(draw(900, 80).querySelectorAll('svg')).toHaveLength(0);
  });

  it('picks the dark rail in dark mode', () => {
    const light = draw(900, 620, { themeMode: 'light' });
    const dark = draw(900, 620, { themeMode: 'dark' });
    const railFill = (el: HTMLElement) =>
      el.querySelector('.flow-rails path')?.getAttribute('fill');

    expect(railFill(light)).not.toBe(railFill(dark));
  });
});
