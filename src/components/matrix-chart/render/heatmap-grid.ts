import { CHART_TYPE } from '../../../utils/chart-theme.js';
import {
  CELL_PITCH,
  FONT_SIZE,
  fitTotals,
  getHeaderHeight,
  getHeatmapCells,
  getReadableTextColor,
  getRowPitch,
  HEADER_HEIGHT,
  HEADER_PADDING_BOTTOM,
  HEADER_PADDING_TOP,
  heatmapCellKey,
  LABEL_BAR_MAX_SHARE,
  LABEL_PADDING_LEFT,
  LABEL_PADDING_RIGHT,
  LABEL_WIDTH,
  LINE_HEIGHT,
  MAX_LABEL_LINES,
  measureTextWidth,
  MIN_CELL_PITCH,
  MIN_FIT_ROW_PITCH,
  MIN_HEADER_HEIGHT,
  MIN_LABEL_WIDTH,
  TOTALS_SIZE,
  TOTALS_TEXT_PADDING,
  wrapLabel,
  type MeasureText,
} from '../lib/heatmap-layout.js';
import {
  heatmapRowDotColors,
  heatmapTokens,
  type HeatmapTokens,
} from '../lib/heatmap-tokens.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ROW_DOT_RADIUS = 4;
const HOVER_CELL_STROKE_WIDTH = 1.5;
const TITLE_FONT_SIZE = CHART_TYPE.heading;
const SUBTITLE_FONT_SIZE = CHART_TYPE.subtitle;
const TITLE_GAP = 4;
const TITLE_BOTTOM_PADDING = 10;
const TITLE_SIDE_ROOM = 8;
const CORNER_TITLE_FONT_SIZE = CHART_TYPE.subtitle;
const CORNER_TITLE_PADDING_BOTTOM = 14;
/** Delay between two columns of the reveal. */
export const REVEAL_COLUMN_DELAY_MS = 18;

export interface HeatmapCellInfo {
  row: string;
  column: string;
  value: number;
}

export interface HeatmapRowInfo {
  row: string;
  total: number;
}

export interface HeatmapColumnInfo {
  column: string;
  total: number;
}

export interface HeatmapGridOptions {
  /** Row and column keys, in the order they are drawn. */
  rows: string[];
  columns: string[];
  /** Text shown for each row / column (same order as the keys). */
  rowLabels: string[];
  columnLabels: string[];
  /** Cell values keyed by `heatmapCellKey(row, column)`. */
  values: Map<string, number>;
  /** Width and height of the scroll viewport the grid lives in. */
  width: number;
  height: number;
  /** Unique id for the SVG gradients of this chart. */
  idPrefix: string;
  themeMode?: 'light' | 'dark';
  /** Page colour under the grid; `auto` totals text is picked against it. */
  surface?: string;
  fontFamily?: string;
  tokens?: HeatmapTokens;
  /** Colour of the dot in front of each row label. */
  rowColors?: string[];
  /** KPI tiles show only the cells, without names and totals. */
  isInKpi?: boolean;
  /** Draws the hover border on cells. */
  hoverable?: boolean;
  /** Width of the row name column; the design value by default. */
  labelColumnWidth?: number;
  /** Row drawn with a highlight border (e.g. the selected graph node). */
  selectedRow?: string | null;
  /** Rows share the height of the widget, at least the design's pitch. */
  fillHeight?: boolean;
  /** With fillHeight: a few rows shrink to fit instead of hiding below the edge. */
  fitRows?: boolean;
  /** Height kept free under rows that fill the widget. */
  fillBottomRoom?: number;
  /** Title and subtitle in the empty top-left corner. */
  title?: string;
  subtitle?: string;
  /** Caption over the row totals column and in front of the column totals. */
  rowTotalsTitle?: string;
  columnTotalsTitle?: string;
  /** Top-left area covered by something drawn over the grid. */
  cornerInset?: { width: number; height: number };
  /** Columns fade in left to right. */
  reveal?: boolean;
  measure?: MeasureText;
  onCellEnter?: (event: MouseEvent, cell: HeatmapCellInfo) => void;
  onRowEnter?: (event: MouseEvent, row: HeatmapRowInfo) => void;
  onColumnEnter?: (event: MouseEvent, column: HeatmapColumnInfo) => void;
  onRowClick?: (row: string) => void;
  onPointerMove?: (event: MouseEvent) => void;
  onPointerLeave?: () => void;
}

export interface HeatmapGridLayout {
  labelWidth: number;
  totalsSize: number;
  headerHeight: number;
  gridLeft: number;
  gridTop: number;
  cellPitch: number;
  rowPitch: number;
  chartWidth: number;
  rowsHeight: number;
}

/** Where every part of the grid goes for the given viewport. */
export function heatmapGridLayout(options: HeatmapGridOptions): HeatmapGridLayout {
  const { rows, columns, columnLabels, width, height, title, subtitle } = options;
  const {
    isInKpi = false,
    labelColumnWidth = LABEL_WIDTH,
    fillHeight = false,
    fitRows = false,
    fillBottomRoom = 0,
    rowTotalsTitle,
    cornerInset,
  } = options;

  const labelWidth = isInKpi
    ? 0
    : Math.round(Math.min(labelColumnWidth, Math.max(MIN_LABEL_WIDTH, width * 0.3)));
  const totalsSize = isInKpi ? 0 : TOTALS_SIZE;
  // With a title or a corner overlay the header keeps the full height they are laid out in.
  let headerHeight = HEADER_HEIGHT;
  if (isInKpi) headerHeight = 0;
  else if (!(title || subtitle || rowTotalsTitle || cornerInset)) {
    headerHeight = getHeaderHeight({
      columnLabels,
      fontSize: FONT_SIZE,
      minHeight: MIN_HEADER_HEIGHT,
      maxHeight: HEADER_HEIGHT,
      padding: HEADER_PADDING_TOP + HEADER_PADDING_BOTTOM,
      measure: options.measure ?? measureTextWidth,
    });
  }
  const gridLeft = labelWidth + totalsSize;
  const gridTop = headerHeight + totalsSize;
  const cellPitch = columns.length
    ? Math.max(MIN_CELL_PITCH, Math.floor((width - gridLeft) / columns.length))
    : CELL_PITCH;
  const rowPitch = getRowPitch({
    pitch: CELL_PITCH,
    cellPitch,
    isInKpi,
    fillHeight,
    availableHeight: Math.floor(height) - gridTop - fillBottomRoom,
    rowCount: rows.length,
    minFitPitch: fitRows ? MIN_FIT_ROW_PITCH : undefined,
  });
  return {
    labelWidth,
    totalsSize,
    headerHeight,
    gridLeft,
    gridTop,
    cellPitch,
    rowPitch,
    chartWidth: gridLeft + cellPitch * columns.length,
    rowsHeight: rowPitch * rows.length,
  };
}

function svgEl(
  parent: Element,
  name: string,
  attrs: Record<string, string | number> = {},
): SVGElement {
  const el = document.createElementNS(SVG_NS, name) as SVGElement;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  parent.appendChild(el);
  return el;
}

const share = (value: number, max: number): number =>
  max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

const maxOf = (items: Iterable<number>): number => Math.max(0, ...Array.from(items));

/** Box with the 1px inner border every heatmap box paints. */
function gridBox(
  parent: Element,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
): void {
  svgEl(parent, 'rect', {
    x: x + 0.5,
    y: y + 0.5,
    width: Math.max(width - 1, 0),
    height: Math.max(height - 1, 0),
    fill: 'none',
    stroke,
    'stroke-width': 1,
    'pointer-events': 'none',
  });
}

function centeredLines(
  parent: Element,
  lines: string[],
  x: number,
  y: number,
  anchor: 'start' | 'middle',
  color: string,
  fontSize = FONT_SIZE,
): void {
  const text = svgEl(parent, 'text', {
    x,
    y,
    'font-size': fontSize,
    fill: color,
    'text-anchor': anchor,
    'pointer-events': 'none',
  });
  lines.forEach((line, index) => {
    const span = svgEl(text, 'tspan', {
      x,
      y: y + (index - (lines.length - 1) / 2) * LINE_HEIGHT,
      'dominant-baseline': 'central',
    });
    span.textContent = line;
  });
}

function totalText(
  parent: Element,
  text: string,
  x: number,
  y: number,
  rotated: boolean,
  color: string,
): void {
  if (!text) return;
  if (!rotated) {
    centeredLines(parent, [text], x, y, 'middle', color);
    return;
  }
  const group = svgEl(parent, 'g', { transform: `translate(${x}, ${y}) rotate(-90)` });
  centeredLines(group, [text], 0, 0, 'middle', color);
}

/** Column and row totals arrows drawn in the corner cell. */
function totalsCornerIcon(parent: Element, x: number, y: number, tokens: HeatmapTokens): void {
  const group = svgEl(parent, 'g', {
    transform: `translate(${x}, ${y})`,
    'pointer-events': 'none',
    class: 'heatmap-totals-icon',
  });
  const arrow = (d: string, stroke: string) =>
    svgEl(group, 'path', {
      d,
      fill: 'none',
      stroke,
      'stroke-opacity': tokens.cornerIconOpacity,
      'stroke-width': 1,
    });
  arrow('M7 7.5 H23 L19.5 11', tokens.columnTotal);
  arrow('M7.5 7 V23 L11 19.5', tokens.rowTotal);
  svgEl(group, 'path', { d: 'M6 6 H8 L6 8 Z', fill: tokens.columnTotal });
  svgEl(group, 'path', { d: 'M6 8 L8 6 V8 Z', fill: tokens.rowTotal });
}

const SELECTIONS = new WeakMap<HTMLElement, (row: string | null) => void>();

/** Moves the selected row in place: the grid and its scroll stay. */
export function setHeatmapSelectedRow(container: HTMLElement, row: string | null): boolean {
  const paint = SELECTIONS.get(container);
  paint?.(row);
  return !!paint;
}

function linearGradient(
  defs: Element,
  id: string,
  x2: number,
  stops: Array<{ color: string }>,
  userSpace: boolean,
): void {
  const gradient = svgEl(defs, 'linearGradient', {
    id,
    x1: 0,
    x2,
    y1: 0,
    y2: 0,
    ...(userSpace ? { gradientUnits: 'userSpaceOnUse' } : {}),
  });
  stops.forEach(({ color }, index) => {
    svgEl(gradient, 'stop', { offset: index, 'stop-color': color });
  });
}

/**
 * Heatmap of the Network + Heatmap design: column header, mint column totals,
 * lilac row totals, row labels with a bar chart of the row totals and blue cells
 * whose opacity follows the value. Rows scroll under a sticky header. Used by the
 * matrix chart and by the heatmap view of the network graph.
 */
export function renderHeatmapGrid(container: HTMLElement, options: HeatmapGridOptions): void {
  const { rows, columns, rowLabels, columnLabels, values, idPrefix } = options;
  const {
    themeMode = 'light',
    surface = themeMode === 'dark' ? '#13161D' : '#FFFFFF',
    fontFamily,
    tokens = heatmapTokens(themeMode),
    rowColors,
    isInKpi = false,
    hoverable = false,
    selectedRow = null,
    title,
    subtitle,
    rowTotalsTitle,
    columnTotalsTitle,
    cornerInset,
    reveal = false,
    onCellEnter,
    onRowEnter,
    onColumnEnter,
    onRowClick,
    onPointerMove,
    onPointerLeave,
  } = options;
  const measure = options.measure ?? measureTextWidth;
  const rowDots = heatmapRowDotColors();

  container.replaceChildren();
  SELECTIONS.delete(container);
  if (options.width <= 0 || !rows.length || !columns.length) return;

  const layout = heatmapGridLayout(options);
  const { labelWidth, totalsSize, headerHeight, gridLeft, gridTop } = layout;
  const { cellPitch, rowPitch, chartWidth, rowsHeight } = layout;

  const { columns: columnCells, rowTotals, columnTotals } = getHeatmapCells(rows, columns, values);
  const maxValue = maxOf(values.values());
  const maxRowTotal = maxOf(rowTotals.values());
  const maxColumnTotal = maxOf(columnTotals.values());

  const totalsColor = (fill: string, opacity: number): string =>
    tokens.totalsText === 'auto'
      ? getReadableTextColor(fill, opacity, surface, ['#2E2156', '#FFFFFF'])
      : tokens.totalsText;
  const revealColumn = (el: SVGElement, index: number): void => {
    if (!reveal) return;
    el.classList.add('heatmap-reveal');
    el.style.animationDelay = `${index * REVEAL_COLUMN_DELAY_MS}ms`;
  };
  const columnHandlers = (el: SVGElement, column: string): void => {
    if (!onColumnEnter) return;
    el.addEventListener('mouseenter', (event) =>
      onColumnEnter(event, { column, total: columnTotals.get(column) ?? 0 }),
    );
    if (onPointerMove) el.addEventListener('mousemove', onPointerMove);
    if (onPointerLeave) el.addEventListener('mouseleave', onPointerLeave);
  };

  if (!isInKpi) {
    const stickyHeader = document.createElement('div');
    stickyHeader.className = 'heatmap-header';
    stickyHeader.style.width = 'fit-content';
    container.appendChild(stickyHeader);
    const header = svgEl(stickyHeader, 'svg', { width: chartWidth, height: gridTop });
    header.style.display = 'block';
    if (fontFamily) header.style.fontFamily = fontFamily;

    const insetWidth = cornerInset?.width ?? 0;
    const insetHeight = cornerInset?.height ?? 0;
    const headerTopRoom = (x: number): number =>
      x < insetWidth ? Math.max(HEADER_PADDING_TOP, insetHeight) : HEADER_PADDING_TOP;

    svgEl(header, 'line', {
      x1: labelWidth - 0.5,
      x2: labelWidth - 0.5,
      y1: 0,
      y2: headerHeight,
      stroke: tokens.gridLine,
    });
    gridBox(header, labelWidth, 0, totalsSize, headerHeight, tokens.gridLine);

    if (rowTotalsTitle) {
      const group = svgEl(header, 'g', {
        transform: `translate(${labelWidth + totalsSize / 2}, ${
          headerHeight - CORNER_TITLE_PADDING_BOTTOM
        }) rotate(-90)`,
      });
      centeredLines(
        group,
        wrapLabel(
          rowTotalsTitle,
          headerHeight - CORNER_TITLE_PADDING_BOTTOM - headerTopRoom(labelWidth),
          CORNER_TITLE_FONT_SIZE,
          Math.max(1, Math.floor((totalsSize - TOTALS_TEXT_PADDING * 2) / LINE_HEIGHT)),
          measure,
        ),
        0,
        0,
        'start',
        tokens.caption,
        CORNER_TITLE_FONT_SIZE,
      );
    }

    // The corner title and subtitle stay over the row names: longer ones are
    // cut with "..." and the whole text shows on hover.
    const cornerText = (
      text: string,
      y: number,
      fontSize: number,
      color: string,
      fontWeight: number,
    ): void => {
      const line = wrapLabel(text, labelWidth - TITLE_SIDE_ROOM, fontSize, 1, measure)[0] ?? '';
      const el = svgEl(header, 'text', {
        x: 1,
        y,
        'font-size': fontSize,
        'font-weight': fontWeight,
        fill: color,
      });
      if (line !== text) svgEl(el, 'title').textContent = text;
      el.append(line);
    };
    if (title) {
      cornerText(
        title,
        headerHeight - TITLE_BOTTOM_PADDING - (subtitle ? SUBTITLE_FONT_SIZE + TITLE_GAP : 0),
        TITLE_FONT_SIZE,
        tokens.title,
        600,
      );
    }
    if (subtitle) {
      cornerText(
        subtitle,
        headerHeight - TITLE_BOTTOM_PADDING,
        SUBTITLE_FONT_SIZE,
        tokens.subtitle,
        400,
      );
    }

    const maxColumnLines = Math.max(1, Math.min(MAX_LABEL_LINES, Math.floor(cellPitch / 12)));
    columns.forEach((column, index) => {
      const x = gridLeft + index * cellPitch;
      const group = svgEl(header, 'g', { class: 'heatmap-column' });
      revealColumn(group, index);
      columnHandlers(group, column);
      svgEl(group, 'rect', {
        x,
        y: 0,
        width: cellPitch,
        height: headerHeight,
        fill: tokens.header,
      });
      gridBox(group, x, 0, cellPitch, headerHeight, tokens.gridLine);
      const turned = svgEl(group, 'g', {
        transform: `translate(${x + cellPitch / 2}, ${headerHeight - HEADER_PADDING_BOTTOM}) rotate(-90)`,
      });
      centeredLines(
        turned,
        wrapLabel(
          columnLabels[index] ?? '',
          headerHeight - HEADER_PADDING_BOTTOM - headerTopRoom(x),
          FONT_SIZE,
          maxColumnLines,
          measure,
        ),
        0,
        0,
        'start',
        tokens.headerText,
      );
    });

    gridBox(header, 0, headerHeight, labelWidth, totalsSize, tokens.gridLine);
    gridBox(header, labelWidth, headerHeight, totalsSize, totalsSize, tokens.gridLine);
    if (columnTotalsTitle) {
      centeredLines(
        header,
        [columnTotalsTitle],
        LABEL_PADDING_LEFT,
        headerHeight + totalsSize / 2,
        'start',
        tokens.caption,
      );
    }
    totalsCornerIcon(header, labelWidth, headerHeight, tokens);

    const fittedColumns = fitTotals(
      columns.map((column) => columnTotals.get(column) ?? 0),
      cellPitch,
      totalsSize,
      FONT_SIZE,
      TOTALS_TEXT_PADDING,
      measure,
    );
    columns.forEach((column, index) => {
      const x = gridLeft + index * cellPitch;
      const opacity =
        share(columnTotals.get(column) ?? 0, maxColumnTotal) * tokens.columnTotalsMax;
      const group = svgEl(header, 'g', { class: 'heatmap-column-total' });
      revealColumn(group, index);
      columnHandlers(group, column);
      svgEl(group, 'rect', {
        x,
        y: headerHeight,
        width: cellPitch,
        height: totalsSize,
        fill: tokens.columnTotal,
        'fill-opacity': opacity,
      });
      gridBox(group, x, headerHeight, cellPitch, totalsSize, tokens.gridLine);
      totalText(
        group,
        fittedColumns.texts[index],
        x + cellPitch / 2,
        headerHeight + totalsSize / 2,
        fittedColumns.rotated,
        totalsColor(tokens.columnTotal, opacity),
      );
    });
  }

  const body = svgEl(container, 'svg', {
    width: chartWidth,
    height: rowsHeight,
    role: 'img',
    'aria-label': 'Matrix chart',
  });
  body.style.display = 'block';
  if (fontFamily) body.style.fontFamily = fontFamily;

  const defs = svgEl(body, 'defs');
  linearGradient(
    defs,
    `${idPrefix}-label`,
    labelWidth,
    [{ color: tokens.labelFrom }, { color: tokens.labelTo }],
    true,
  );
  linearGradient(
    defs,
    `${idPrefix}-bar`,
    labelWidth,
    [{ color: tokens.bar }, { color: tokens.labelTo }],
    true,
  );
  // The 1px inner border of every cell, tiled over the columns.
  const pattern = svgEl(defs, 'pattern', {
    id: `${idPrefix}-grid`,
    patternUnits: 'userSpaceOnUse',
    x: gridLeft,
    y: 0,
    width: cellPitch,
    height: rowPitch,
  });
  gridBox(pattern, 0, 0, cellPitch, rowPitch, tokens.gridLine);

  if (!isInKpi) {
    const rowLineLimit = rowPitch >= MAX_LABEL_LINES * LINE_HEIGHT + 4 ? MAX_LABEL_LINES : 1;
    const fittedRows = fitTotals(
      rows.map((row) => rowTotals.get(row) ?? 0),
      totalsSize,
      rowPitch,
      FONT_SIZE,
      TOTALS_TEXT_PADDING,
      measure,
    );
    rows.forEach((row, rowIndex) => {
      const y = rowIndex * rowPitch;
      const total = rowTotals.get(row) ?? 0;
      const totalShare = share(total, maxRowTotal);
      const opacity = totalShare * tokens.rowTotalsMax;
      const group = svgEl(body, 'g', { class: 'heatmap-row' });
      if (reveal) group.classList.add('heatmap-reveal');
      if (onRowClick) {
        group.style.cursor = 'pointer';
        group.addEventListener('click', () => onRowClick(row));
      }
      if (onPointerMove) group.addEventListener('mousemove', onPointerMove);
      if (onRowEnter) {
        group.addEventListener('mouseenter', (event) => onRowEnter(event, { row, total }));
      }
      if (onPointerLeave) group.addEventListener('mouseleave', onPointerLeave);

      svgEl(group, 'rect', {
        x: 0,
        y,
        width: labelWidth,
        height: rowPitch,
        fill: `url(#${idPrefix}-label)`,
      });
      gridBox(group, 0, y, labelWidth, rowPitch, tokens.gridLine);
      const barWidth = Math.round(labelWidth * LABEL_BAR_MAX_SHARE * totalShare);
      // One pixel short of the next row, so neighbouring bars read apart.
      svgEl(group, 'rect', {
        class: 'heatmap-row-bar',
        x: labelWidth - barWidth,
        y,
        width: barWidth,
        height: Math.max(rowPitch - 1, 0),
        fill: `url(#${idPrefix}-bar)`,
      });
      svgEl(group, 'circle', {
        cx: 0,
        cy: y + rowPitch / 2,
        r: ROW_DOT_RADIUS,
        fill: rowColors?.[rowIndex] ?? rowDots[rowIndex % rowDots.length],
        stroke: tokens.dotRing,
        'stroke-width': 1,
      });
      centeredLines(
        group,
        wrapLabel(
          rowLabels[rowIndex] ?? '',
          labelWidth - LABEL_PADDING_LEFT - LABEL_PADDING_RIGHT,
          FONT_SIZE,
          rowLineLimit,
          measure,
        ),
        LABEL_PADDING_LEFT,
        y + rowPitch / 2,
        'start',
        tokens.text,
      );
      svgEl(group, 'rect', {
        x: labelWidth,
        y,
        width: totalsSize,
        height: rowPitch,
        fill: tokens.rowTotal,
        'fill-opacity': opacity,
      });
      gridBox(group, labelWidth, y, totalsSize, rowPitch, tokens.gridLine);
      totalText(
        group,
        fittedRows.texts[rowIndex],
        labelWidth + totalsSize / 2,
        y + rowPitch / 2,
        fittedRows.rotated,
        totalsColor(tokens.rowTotal, opacity),
      );
    });
  }

  // Cells column by column: runs of empty cells, the filled cells, the grid lines.
  columnCells.forEach(({ cells, emptyRuns }, columnIndex) => {
    const x = gridLeft + columnIndex * cellPitch;
    const group = svgEl(body, 'g', { class: 'heatmap-cells' });
    revealColumn(group, columnIndex);
    for (const [start, end] of emptyRuns) {
      svgEl(group, 'rect', {
        class: 'matrix-empty',
        x,
        y: start * rowPitch,
        width: cellPitch,
        height: (end - start) * rowPitch,
        fill: tokens.emptyCell,
      });
    }
    for (const { rowIndex, value } of cells) {
      svgEl(group, 'rect', {
        class: 'matrix-cell',
        x,
        y: rowIndex * rowPitch,
        width: cellPitch,
        height: rowPitch,
        fill: value < 0 ? tokens.negativeCell : tokens.cell,
        'fill-opacity': value < 0 ? 1 : share(value, maxValue),
      });
    }
    svgEl(group, 'rect', {
      x,
      y: 0,
      width: cellPitch,
      height: rowsHeight,
      fill: `url(#${idPrefix}-grid)`,
      'pointer-events': 'none',
    });
  });

  const selection = svgEl(body, 'rect', {
    class: 'heatmap-selected-row',
    x: 1,
    width: chartWidth - 2,
    height: rowPitch - 2,
    fill: 'none',
    stroke: tokens.cell,
    'stroke-width': 2,
    'pointer-events': 'none',
  });
  const paintSelection = (row: string | null): void => {
    const index = row == null ? -1 : rows.indexOf(row);
    selection.setAttribute('visibility', index < 0 ? 'hidden' : 'visible');
    selection.setAttribute('y', String(Math.max(index, 0) * rowPitch + 1));
  };
  paintSelection(selectedRow);
  SELECTIONS.set(container, paintSelection);

  const hover = hoverable
    ? svgEl(body, 'rect', {
        class: 'heatmap-hover',
        width: cellPitch,
        height: rowPitch,
        fill: 'none',
        stroke: tokens.hoverCell,
        'stroke-width': HOVER_CELL_STROKE_WIDTH,
        visibility: 'hidden',
        'pointer-events': 'none',
      })
    : null;

  // One transparent box over the cells finds the cell under the pointer, so
  // the grid needs no handlers per cell.
  let hoveredKey: string | null = null;
  const overlay = svgEl(body, 'rect', {
    class: 'heatmap-overlay',
    x: gridLeft,
    y: 0,
    width: cellPitch * columns.length,
    height: rowsHeight,
    fill: 'transparent',
    'pointer-events': 'all',
  });
  overlay.addEventListener('mousemove', (event) => {
    const box = overlay.getBoundingClientRect();
    const columnIndex = Math.floor((event.clientX - box.left) / cellPitch);
    const rowIndex = Math.floor((event.clientY - box.top) / rowPitch);
    const row = rows[rowIndex];
    const column = columns[columnIndex];
    if (row === undefined || column === undefined) return;
    const key = heatmapCellKey(row, column);
    if (key !== hoveredKey) {
      hoveredKey = key;
      hover?.setAttribute('x', String(gridLeft + columnIndex * cellPitch));
      hover?.setAttribute('y', String(rowIndex * rowPitch));
      hover?.setAttribute('visibility', 'visible');
      onCellEnter?.(event, { row, column, value: values.get(key) ?? 0 });
    }
    onPointerMove?.(event);
  });
  overlay.addEventListener('mouseleave', () => {
    hoveredKey = null;
    hover?.setAttribute('visibility', 'hidden');
    onPointerLeave?.();
  });
}
