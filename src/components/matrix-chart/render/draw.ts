import type { SequentialColorRange } from '../../../utils/fuse-palette.js';
import { hasNaturalOrder } from '../lib/domain.js';
import {
  getHeatmapCells,
  heatmapCellKey,
  LEGEND_OPACITY_STEPS,
  orderByTotals,
  type MeasureText,
} from '../lib/heatmap-layout.js';
import { heatmapTokens } from '../lib/heatmap-tokens.js';
import type { MatrixCell, MatrixModel } from '../lib/index.js';
import { renderHeatmapGrid } from './heatmap-grid.js';

export interface MatrixView {
  /** Rows and columns in drawn order: largest total first, unless the axis has an order of its own. */
  rows: string[];
  columns: string[];
  values: Map<string, number>;
  rowTotals: Map<string, number>;
}

export interface RenderMatrixOptions {
  model: MatrixModel;
  /** Width and height of the scroll viewport the plot lives in. */
  width: number;
  height: number;
  themeMode?: 'light' | 'dark';
  fontFamily?: string;
  /** Unique id for the SVG gradients of this chart. */
  idPrefix?: string;
  isInKpi?: boolean;
  reveal?: boolean;
  measure?: MeasureText;
  onCellHover?: (payload: { cell: MatrixCell; event: MouseEvent }) => void;
  onRowHover?: (payload: { row: string; total: number; event: MouseEvent }) => void;
  onPointerMove?: (event: MouseEvent) => void;
  onCellLeave?: () => void;
}

/** One value per (row, column), with the axes in drawn order. */
export function matrixView(model: MatrixModel): MatrixView {
  const values = new Map<string, number>();
  for (const cell of model.cells) values.set(heatmapCellKey(cell.y, cell.x), cell.value);

  const { rowTotals, columnTotals } = getHeatmapCells(model.yDomain, model.xDomain, values);
  return {
    rows: orderByTotals(model.yDomain, rowTotals, hasNaturalOrder(model.yDomain)),
    columns: orderByTotals(model.xDomain, columnTotals, hasNaturalOrder(model.xDomain)),
    values,
    rowTotals,
  };
}

/** Steps of the cell colour for the Low - High legend. */
export function matrixColorRanges(
  model: MatrixModel,
  mode: 'light' | 'dark' = 'light',
): SequentialColorRange[] {
  const maxValue = Math.max(0, ...model.cells.map((cell) => cell.value));
  if (!maxValue) return [];
  const { cell } = heatmapTokens(mode);
  const stepCount = LEGEND_OPACITY_STEPS.length;
  return LEGEND_OPACITY_STEPS.map((opacity, index) => ({
    color: `color-mix(in srgb, ${cell} ${opacity * 100}%, transparent)`,
    start: (maxValue * index) / stepCount,
    end: (maxValue * (index + 1)) / stepCount,
  }));
}

/** FuseDash MatrixChart: the heatmap of a matrix model. */
export function renderMatrixChart(container: HTMLElement, options: RenderMatrixOptions): void {
  const { model, width, height, onCellHover, onRowHover, onCellLeave } = options;
  if (!model.cells.length) {
    container.replaceChildren();
    return;
  }
  const { rows, columns, values } = matrixView(model);
  renderHeatmapGrid(container, {
    rows,
    columns,
    rowLabels: rows,
    columnLabels: columns,
    values,
    width,
    height,
    idPrefix: options.idPrefix ?? 'ui9000-matrix',
    themeMode: options.themeMode,
    fontFamily: options.fontFamily,
    isInKpi: options.isInKpi,
    reveal: options.reveal,
    measure: options.measure,
    fillHeight: true,
    fitRows: true,
    hoverable: !!onCellHover,
    onCellEnter: onCellHover
      ? (event, { row, column, value }) => onCellHover({ cell: { x: column, y: row, value }, event })
      : undefined,
    onRowEnter: onRowHover
      ? (event, { row, total }) => onRowHover({ row, total, event })
      : undefined,
    onPointerMove: options.onPointerMove,
    onPointerLeave: onCellLeave,
  });
}
