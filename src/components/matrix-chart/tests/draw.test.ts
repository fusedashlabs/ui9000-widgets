import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/matrix.fusedash.json';
import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeMatrixData } from '../lib/index.js';
import { renderMatrixChart } from '../render/draw.js';

function hosts() {
  const plot = document.createElement('div');
  const topAxis = document.createElement('div');
  document.body.append(plot, topAxis);
  return { plot, topAxis };
}

const model = normalizeMatrixData(fusedashFixture);

describe('renderMatrixChart', () => {
  it('paints one rect per grid cell and pins the header when rows overflow', () => {
    const { plot, topAxis } = hosts();
    renderMatrixChart(plot, {
      model,
      width: 900,
      height: 400,
      theme: DEFAULT_THEME,
      topAxisContainer: topAxis,
    });

    expect(plot.querySelectorAll('rect.matrix-cell')).toHaveLength(94 * 50);
    // Header lives in the pinned container, not in the scrolling plot
    expect(topAxis.querySelectorAll('svg text')).toHaveLength(94);
    expect(plot.querySelectorAll('.x-axis')).toHaveLength(0);
    expect(plot.querySelectorAll('.y-axis text')).toHaveLength(50);
    expect(plot.querySelector('pattern#ui9000-matrix-no-data')).not.toBeNull();
  });

  it('draws the header inline for a short grid', () => {
    const { plot, topAxis } = hosts();
    const small = normalizeMatrixData([
      { x: 'A', y: 'one', value: 1 },
      { x: 'B', y: 'two', value: 2 },
    ]);
    renderMatrixChart(plot, {
      model: small,
      width: 400,
      height: 300,
      theme: DEFAULT_THEME,
      topAxisContainer: topAxis,
    });

    expect(plot.querySelectorAll('.x-axis text')).toHaveLength(2);
    expect(topAxis.children).toHaveLength(0);
  });

  it('fills zero cells with the no-data hatch and negatives flat grey', () => {
    const { plot } = hosts();
    renderMatrixChart(plot, {
      model: normalizeMatrixData([
        { x: 'A', y: 'r', value: 0 },
        { x: 'B', y: 'r', value: -5 },
        { x: 'C', y: 'r', value: 10 },
      ]),
      width: 400,
      height: 300,
      theme: DEFAULT_THEME,
    });

    const fills = [...plot.querySelectorAll('rect.matrix-cell')].map((r) =>
      r.getAttribute('fill'),
    );
    expect(fills[0]).toBe('url(#ui9000-matrix-no-data)');
    expect(fills[1]).toBe('#DADAE1');
    expect(fills[2]).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('reports hovered cells and clears on leave without redrawing', () => {
    const { plot } = hosts();
    const seen: string[] = [];
    let left = 0;
    renderMatrixChart(plot, {
      model: normalizeMatrixData([
        { x: 'A', y: 'r', value: 1 },
        { x: 'B', y: 'r', value: 2 },
      ]),
      width: 400,
      height: 300,
      theme: DEFAULT_THEME,
      onCellHover: ({ cell }) => seen.push(`${cell.x}:${cell.value}`),
      onCellLeave: () => {
        left += 1;
      },
    });

    const cells = plot.querySelectorAll('rect.matrix-cell');
    cells[1].dispatchEvent(new MouseEvent('mouseenter'));
    cells[1].dispatchEvent(new MouseEvent('mouseleave'));
    expect(seen).toEqual(['B:2']);
    expect(left).toBe(1);
    // Hover must never rebuild the plot
    expect(plot.querySelectorAll('rect.matrix-cell')).toHaveLength(2);
  });

  it('offers the full text of a truncated row label on hover', () => {
    const { plot } = hosts();
    const hovered: string[] = [];
    renderMatrixChart(plot, {
      model: normalizeMatrixData([
        { x: 'A', y: 'Cauliflower White Spring', value: 1 },
      ]),
      width: 400,
      height: 300,
      theme: DEFAULT_THEME,
      onAxisLabelHover: (text) => hovered.push(text),
    });

    const label = plot.querySelector('.y-axis text')!;
    expect(label.textContent).toBe('Cauliflow...');
    label.dispatchEvent(new MouseEvent('mouseenter'));
    expect(hovered).toEqual(['Cauliflower White Spring']);
  });

  it('renders nothing for an empty model instead of throwing', () => {
    const { plot, topAxis } = hosts();
    expect(() =>
      renderMatrixChart(plot, {
        model: normalizeMatrixData(null),
        width: 400,
        height: 300,
        theme: DEFAULT_THEME,
        topAxisContainer: topAxis,
      }),
    ).not.toThrow();
    expect(plot.children).toHaveLength(0);
  });
});

/**
 * The pinned header sits above the scroll area, so its height changes the
 * scroll viewport, which fires the resize observer, which redraws. If the
 * header's own size depended on that viewport there would be no fixed point
 * and the chart would visibly jitter up and down forever (FUS-3992).
 */
describe('pinned header sizing', () => {
  // Long column labels over the 7-row limit — enough to pin and rotate the
  // header, small enough to redraw dozens of times cheaply.
  const tall = normalizeMatrixData(
    Array.from({ length: 12 }, (_, col) =>
      Array.from({ length: 10 }, (_, row) => ({
        x: `Column heading number ${col}`,
        y: `Row ${row}`,
        value: col + row + 1,
      })),
    ).flat(),
  );

  function headerHeight(bodyHeight: number, previousHeader: number): number {
    const { plot, topAxis } = hosts();
    renderMatrixChart(plot, {
      model: tall,
      width: 968,
      // What the scroll viewport would measure with that header in place
      height: bodyHeight - previousHeader,
      bodyHeight,
      theme: DEFAULT_THEME,
      topAxisContainer: topAxis,
    });
    const height = Number(topAxis.querySelector('svg')?.getAttribute('height'));
    plot.remove();
    topAxis.remove();
    return height;
  }

  it('does not depend on the header height of the previous draw', () => {
    for (const bodyHeight of [300, 380, 420, 460, 560, 700, 820]) {
      const heights = [41, 98, 120, 160].map((previous) =>
        headerHeight(bodyHeight, previous),
      );
      expect(
        new Set(heights).size,
        `body ${bodyHeight}px settled to ${heights.join('/')}`,
      ).toBe(1);
    }
  });

  it('stays within its share of the widget', () => {
    for (const bodyHeight of [300, 420, 560, 820]) {
      const height = headerHeight(bodyHeight, 41);
      expect(height).toBeLessThanOrEqual(
        Math.max(41, Math.round(bodyHeight * 0.35)),
      );
    }
  });
});
