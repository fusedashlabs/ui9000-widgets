import { describe, expect, it, vi } from 'vitest';

import { heatmapTokens, normalizeMatrixData } from '../lib/index.js';
import { matrixColorRanges, matrixView, renderMatrixChart } from '../render/draw.js';
import { heatmapGridLayout, renderHeatmapGrid } from '../render/heatmap-grid.js';
import { heatmapCellKey } from '../lib/heatmap-layout.js';

const measure = (text: string) => text.length * 6;

function plot(): HTMLElement {
  const container = document.createElement('div');
  document.body.append(container);
  return container;
}

const CELLS = [
  { x: 'A', y: 'one', value: 1 },
  { x: 'B', y: 'one', value: 4 },
  { x: 'A', y: 'two', value: 8 },
];

const draw = (container: HTMLElement, cells = CELLS, extra = {}) =>
  renderMatrixChart(container, {
    model: normalizeMatrixData(cells),
    width: 600,
    height: 400,
    measure,
    ...extra,
  });

describe('matrixView', () => {
  it('puts the largest totals first', () => {
    const { rows, columns } = matrixView(normalizeMatrixData(CELLS));
    expect(rows).toEqual(['two', 'one']);
    expect(columns).toEqual(['A', 'B']);
  });

  it('keeps an axis with an order of its own', () => {
    const { columns } = matrixView(
      normalizeMatrixData([
        { x: 'Mon', y: 'a', value: 1 },
        { x: 'Tue', y: 'a', value: 9 },
      ]),
    );
    expect(columns).toEqual(['Mon', 'Tue']);
  });
});

describe('renderMatrixChart', () => {
  it('draws one rect per filled cell and a run for the empty ones', () => {
    const container = plot();
    draw(container);
    expect(container.querySelectorAll('rect.matrix-cell')).toHaveLength(3);
    expect(container.querySelectorAll('rect.matrix-empty')).toHaveLength(1);
  });

  it('keeps the column names and totals in a header above the rows', () => {
    const container = plot();
    draw(container);
    const header = container.querySelector('.heatmap-header')!;
    expect(header.querySelectorAll('g.heatmap-column')).toHaveLength(2);
    expect(header.querySelectorAll('g.heatmap-column-total')).toHaveLength(2);
    expect(header.querySelector('.heatmap-totals-icon')).not.toBeNull();
    expect(container.querySelectorAll('svg > g.heatmap-row')).toHaveLength(2);
  });

  it('follows the value with the opacity of the cell', () => {
    const container = plot();
    draw(container);
    const opacities = [...container.querySelectorAll('rect.matrix-cell')].map((cell) =>
      Number(cell.getAttribute('fill-opacity')),
    );
    expect(Math.max(...opacities)).toBe(1);
    expect(Math.min(...opacities)).toBe(0.125);
  });

  it('paints a negative value flat', () => {
    const container = plot();
    draw(container, [
      { x: 'A', y: 'one', value: 5 },
      { x: 'B', y: 'one', value: -2 },
    ]);
    const cells = [...container.querySelectorAll('rect.matrix-cell')];
    const negative = cells.find((cell) => cell.getAttribute('fill') !== heatmapTokens('light').cell)!;
    expect(negative.getAttribute('fill')).toBe(heatmapTokens('light').negativeCell);
    expect(negative.getAttribute('fill-opacity')).toBe('1');
  });

  it('counts only positive values in the totals', () => {
    const { rowTotals } = matrixView(
      normalizeMatrixData([
        { x: 'A', y: 'one', value: 5 },
        { x: 'B', y: 'one', value: -2 },
      ]),
    );
    expect(rowTotals.get('one')).toBe(5);
  });

  it('scales the bar behind the row name to the row total', () => {
    const container = plot();
    draw(container);
    const [largest, smaller] = [...container.querySelectorAll('rect.heatmap-row-bar')].map(
      (bar) => Number(bar.getAttribute('width')),
    );
    expect(smaller / largest).toBeCloseTo(5 / 8, 1);
  });

  it('leaves one pixel between the row bars', () => {
    const container = plot();
    draw(container);
    const bars = [...container.querySelectorAll('rect.heatmap-row-bar')];
    const top = (bar: Element): number => Number(bar.getAttribute('y'));
    const bottom = (bar: Element): number => top(bar) + Number(bar.getAttribute('height'));
    expect(top(bars[1]) - bottom(bars[0])).toBe(1);
  });

  it('reports the cell under the pointer once and clears on leave', () => {
    const container = plot();
    const onCellHover = vi.fn();
    const onCellLeave = vi.fn();
    draw(container, CELLS, { onCellHover, onCellLeave });

    const overlay = container.querySelector('rect.heatmap-overlay')!;
    overlay.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }));
    overlay.dispatchEvent(new MouseEvent('mousemove', { clientX: 2, clientY: 2 }));
    expect(onCellHover).toHaveBeenCalledOnce();
    expect(onCellHover.mock.calls[0][0].cell).toEqual({ x: 'A', y: 'two', value: 8 });
    const hover = container.querySelector('rect.heatmap-hover')!;
    expect(hover.getAttribute('visibility')).toBe('visible');

    overlay.dispatchEvent(new MouseEvent('mouseleave'));
    expect(onCellLeave).toHaveBeenCalledOnce();
    expect(hover.getAttribute('visibility')).toBe('hidden');
  });

  it('reports the total of a row', () => {
    const container = plot();
    const onRowHover = vi.fn();
    draw(container, CELLS, { onRowHover });
    container.querySelector('g.heatmap-row')!.dispatchEvent(new MouseEvent('mouseenter'));
    expect(onRowHover.mock.calls[0][0]).toMatchObject({ row: 'two', total: 8 });
  });

  it('shows only the cells in a KPI tile', () => {
    const container = plot();
    draw(container, CELLS, { isInKpi: true });
    expect(container.querySelector('.heatmap-header')).toBeNull();
    expect(container.querySelector('g.heatmap-row')).toBeNull();
    expect(container.querySelectorAll('rect.matrix-cell')).toHaveLength(3);
  });

  it('renders nothing for an empty model instead of throwing', () => {
    const container = plot();
    draw(container, []);
    expect(container.childElementCount).toBe(0);
  });

  it('uses the colours of the dark theme', () => {
    const container = plot();
    draw(container, CELLS, { themeMode: 'dark' });
    const header = container.querySelector('g.heatmap-column rect')!;
    expect(header.getAttribute('fill')).toBe(heatmapTokens('dark').header);
  });

  it('paints the legend in the colour of the cells in each theme', () => {
    const model = normalizeMatrixData([{ x: 'A', y: 'one', value: 5 }]);
    for (const mode of ['light', 'dark'] as const) {
      const [range] = matrixColorRanges(model, mode);
      expect(range.color).toContain(heatmapTokens(mode).cell);
    }
    expect(heatmapTokens('dark').cell).not.toBe(heatmapTokens('light').cell);
  });
});

describe('heatmapGridLayout', () => {
  const rows = Array.from({ length: 40 }, (_, i) => `row ${i}`);
  const options = {
    rows,
    columns: ['A', 'B'],
    rowLabels: rows,
    columnLabels: ['A', 'B'],
    values: new Map<string, number>(),
    width: 600,
    height: 400,
    idPrefix: 'test',
    measure,
  };

  it('lets rows scroll at the design pitch when they do not fit', () => {
    const layout = heatmapGridLayout({ ...options, fillHeight: true, fitRows: true });
    expect(layout.rowPitch).toBe(32);
    expect(layout.rowsHeight).toBe(1280);
  });

  it('shrinks a few rows to fit a low widget', () => {
    const few = rows.slice(0, 8);
    const layout = heatmapGridLayout({
      ...options,
      rows: few,
      rowLabels: few,
      height: 300,
      fillHeight: true,
      fitRows: true,
    });
    expect(layout.rowPitch).toBeLessThan(32);
    expect(layout.rowPitch).toBeGreaterThanOrEqual(22);
    expect(layout.gridTop + layout.rowsHeight).toBeLessThanOrEqual(300);
  });

  it('keeps the full header under a title', () => {
    const layout = heatmapGridLayout({ ...options, title: 'Heatmap' });
    expect(layout.headerHeight).toBe(135);
  });

  it('narrows the name column with the widget', () => {
    expect(heatmapGridLayout({ ...options, width: 300 }).labelWidth).toBe(90);
    expect(heatmapGridLayout(options).labelWidth).toBe(134);
  });
});

describe('renderHeatmapGrid', () => {
  const values = new Map([[heatmapCellKey('r1', 'c1'), 3]]);
  const base = {
    rows: ['r1', 'r2'],
    columns: ['c1'],
    rowLabels: ['r1', 'r2'],
    columnLabels: ['c1'],
    values,
    width: 500,
    height: 400,
    idPrefix: 'grid',
    measure,
  };

  it('draws the selected row and the row colours it is given', () => {
    const container = plot();
    renderHeatmapGrid(container, { ...base, selectedRow: 'r2', rowColors: ['#111111', '#222222'] });
    expect(container.querySelector('rect.heatmap-selected-row')?.getAttribute('y')).toBe('33');
    expect(container.querySelector('circle')?.getAttribute('fill')).toBe('#111111');
  });

  it('cuts a long corner title and keeps the whole text on hover', () => {
    const container = plot();
    const title = 'A corner title far too long for the name column';
    renderHeatmapGrid(container, { ...base, title });
    const text = container.querySelector('.heatmap-header text title')!;
    expect(text.textContent).toBe(title);
    expect(text.parentElement?.textContent).toContain('...');
  });

  it('calls a row click', () => {
    const container = plot();
    const onRowClick = vi.fn();
    renderHeatmapGrid(container, { ...base, onRowClick });
    container.querySelector('g.heatmap-row')!.dispatchEvent(new MouseEvent('click'));
    expect(onRowClick).toHaveBeenCalledWith('r1');
  });

  it('reports a column under the pointer', () => {
    const container = plot();
    const onColumnEnter = vi.fn();
    renderHeatmapGrid(container, { ...base, onColumnEnter });
    container.querySelector('g.heatmap-column')!.dispatchEvent(new MouseEvent('mouseenter'));
    expect(onColumnEnter.mock.calls[0][1]).toEqual({ column: 'c1', total: 3 });
  });

  it('picks readable totals with the auto colour', () => {
    const container = plot();
    renderHeatmapGrid(container, {
      ...base,
      tokens: { ...heatmapTokens('light'), totalsText: 'auto' },
    });
    const text = container.querySelector('g.heatmap-column-total text');
    expect(text?.getAttribute('fill')).toBe('#2E2156');
  });
});
