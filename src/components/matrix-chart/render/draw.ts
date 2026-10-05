import { scaleBand } from 'd3-scale';
import { select, type Selection } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import {
  decorateManualAxisLabel,
  type AxisLabelTooltipHandlers,
} from '../../../utils/axis-labels.js';
import {
  generateSequentialColorRanges,
  sequentialColorForValue,
  SEQUENTIAL_1,
  type SequentialColorRange,
} from '../../../utils/fuse-palette.js';
import { FD, fdColors } from '../../../utils/fusedash-visual.js';
import { matrixYLabelMaxChars, type MatrixCell, type MatrixModel } from '../lib/index.js';

const NO_DATA_PATTERN_ID = 'ui9000-matrix-no-data';

/**
 * Painting every column × row is what makes a missing measurement look empty.
 * Past this many slots the chat host cannot afford a rect per hole, so only
 * the cells that carry a value are drawn.
 */
const MAX_GRID_CELLS = 10_000;

/** Client `DynamicAxisLabel` background-rect compensation. */
const LABEL_ROTATION_COMPENSATION = 4;

/** Rotated header labels may grow the pinned axis, but never past this. */
const TOP_AXIS_MAX_HEIGHT = 160;
/** …nor past this share of the widget, however long the categories are. */
const TOP_AXIS_MAX_HEIGHT_RATIO = 0.35;

export interface MatrixLayout {
  /** Rows > `FD.matrixSeparateAxisRowLimit` → header pinned, rows scroll. */
  separateTopAxis: boolean;
  /** Height reserved for the column header. */
  topAxisHeight: number;
  /** Height of the row band stack alone. */
  rowsHeight: number;
  /** Full drawn height — taller than the viewport when the rows overflow. */
  contentHeight: number;
  needsScroll: boolean;
}

export interface RenderMatrixOptions extends AxisLabelTooltipHandlers {
  model: MatrixModel;
  width: number;
  /** Height of the scroll viewport the plot lives in. */
  height: number;
  /**
   * Stable outer height the pinned header's budget is measured against —
   * the body box that holds both the header and the scroll area.
   *
   * It must NOT be the scroll viewport (`height`): the header sits above the
   * scroll area, so sizing the header from the viewport makes the header
   * resize itself on every redraw and settle into a visible up/down cycle.
   */
  bodyHeight?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  /** Pinned header host — only used when the layout separates the top axis. */
  topAxisContainer?: HTMLElement | null;
  onCellHover?: (payload: { cell: MatrixCell; event: MouseEvent }) => void;
  onCellLeave?: () => void;
}

export function matrixColorRanges(model: MatrixModel): SequentialColorRange[] {
  return generateSequentialColorRanges(
    model.rawValues.filter((v) => Number.isFinite(v)),
    SEQUENTIAL_1,
  );
}

/** Client `getColor` + the negative / no-data special cases. */
function cellFill(value: number, ranges: SequentialColorRange[]): string {
  if (value < 0) return FD.matrixNegativeFill;
  if (!value) return `url(#${NO_DATA_PATTERN_ID})`;
  return sequentialColorForValue(value, ranges) ?? `url(#${NO_DATA_PATTERN_ID})`;
}

function slotKey(x: string, y: string): string {
  return `${x}\0${y}`;
}

/**
 * One rect per column × row. A slot with no measurement is stored as 0 and
 * paints the hatch, the same as a real 0. A positive value takes the ramp;
 * a negative stays flat grey.
 */
function cellsToPaint(model: MatrixModel): MatrixCell[] {
  const columns = model.xDomain.length;
  const rows = model.yDomain.length;
  const slots = columns * rows;
  if (!columns || !rows || slots > MAX_GRID_CELLS) return model.cells;

  const bySlot = new Map<string, MatrixCell>();
  for (const cell of model.cells) bySlot.set(slotKey(cell.x, cell.y), cell);

  const painted: MatrixCell[] = [];
  for (const y of model.yDomain) {
    for (const x of model.xDomain) {
      painted.push(bySlot.get(slotKey(x, y)) ?? { x, y, value: 0 });
    }
  }
  return painted;
}

/** Mirrors client `calculateHorizontalLabelAngle`. */
export function horizontalLabelAngle(
  labelWidth: number,
  availableWidth: number,
  labelHeight: number,
): number {
  if (availableWidth <= 0 || labelWidth <= 0 || labelWidth <= availableWidth) {
    return 0;
  }
  if (labelHeight >= availableWidth) return -90;

  const ratio = Math.max(-1, Math.min(1, (availableWidth * 0.8) / labelWidth));
  const angle = Math.acos(ratio) * (180 / Math.PI) * -1;
  const rounded = Math.ceil(angle / 5) * 5;
  if (rounded > 0) return 0;
  if (rounded < -90) return -90;
  return rounded;
}

/**
 * Client `MatrixChart` frame: `topAxisHeight` reserves font + tick + spacing,
 * rows never fall under `minCellHeight`, and the plot grows past the viewport
 * instead of squeezing.
 */
export function matrixLayout(
  model: MatrixModel,
  viewportHeight: number,
  margin: { top: number; bottom: number },
): MatrixLayout {
  const topAxisHeight = Math.max(
    margin.top,
    FD.axisLabelSize + FD.matrixTopTickLength + FD.matrixTopLabelsSpacing + 10,
  );
  const separateTopAxis = model.yDomain.length > FD.matrixSeparateAxisRowLimit;
  const chrome = separateTopAxis ? 0 : topAxisHeight + margin.bottom + 10;

  const rowsCount = model.yDomain.length;
  const rowsHeight = Math.max(viewportHeight - chrome, 0);
  const perRow = rowsCount
    ? Math.max(Math.floor(rowsHeight / rowsCount), FD.matrixMinCellHeight)
    : 0;

  const stack = perRow * rowsCount;
  const contentHeight = stack + chrome;
  return {
    separateTopAxis,
    topAxisHeight,
    rowsHeight: stack,
    contentHeight,
    needsScroll: contentHeight > viewportHeight,
  };
}

function appendNoDataPattern(
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  themeMode: 'light' | 'dark',
): void {
  const pattern = defs
    .append('pattern')
    .attr('id', NO_DATA_PATTERN_ID)
    .attr('width', 5)
    .attr('height', 5)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)');
  pattern
    .append('rect')
    .attr('width', 5)
    .attr('height', 5)
    .attr(
      'fill',
      themeMode === 'dark' ? FD.matrixNoDataDark : FD.matrixNoDataLight,
    );
  pattern
    .append('rect')
    .attr('width', 2)
    .attr('height', 5)
    .attr(
      'fill',
      themeMode === 'dark'
        ? FD.matrixNoDataStripeDark
        : FD.matrixNoDataStripeLight,
    );
}

/**
 * Column header. Labels are measured, then rotated the way client
 * `useVisxDynamicAxisLabel` does once they stop fitting their band.
 */
function renderTopAxis(
  group: Selection<SVGGElement, unknown, null, undefined>,
  xDomain: string[],
  xScale: ReturnType<typeof scaleBand<string>>,
  axisWidth: number,
  maxExtent: number,
  axisLabels: AxisLabelTooltipHandlers,
  themeMode: 'light' | 'dark',
): number {
  const available = axisWidth / Math.max(xDomain.length, 1);
  const baselineY = -FD.matrixTopTickLength;

  const labels = xDomain.map((category) => {
    const band = xScale(category);
    const text = group
      .append('text')
      .attr('y', baselineY)
      .attr('font-size', FD.axisLabelSize)
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('text-anchor', 'middle');
    decorateManualAxisLabel(text, category, {
      maxLength: FD.matrixTopLabelMaxChars,
      ...axisLabels,
    });
    return { text, full: category, x: (band ?? 0) + xScale.bandwidth() / 2 };
  });

  // jsdom has no layout engine — fall back to the FuseDash char estimate.
  const widthOf = (text: (typeof labels)[number]['text']): number =>
    text.node()?.getComputedTextLength?.() ||
    text.text().length * FD.axisLabelSize * 0.55;

  const longest = labels.reduce(
    (max, { text }) => Math.max(max, widthOf(text)),
    0,
  );

  const angle = horizontalLabelAngle(
    longest + FD.matrixTopLabelsSpacing,
    available,
    FD.axisLabelSize,
  );

  if (angle === 0) {
    for (const { text, x } of labels) text.attr('x', x);
    return FD.axisLabelSize + FD.matrixTopTickLength;
  }

  const radians = (Math.PI / 180) * angle;
  const sin = Math.abs(Math.sin(radians));
  const chrome = FD.matrixTopTickLength + 4;

  // Rotated labels grow the header vertically — shorten them to the space the
  // header is allowed to take rather than letting them clip against its edge.
  if (sin > 0 && sin * longest + chrome > maxExtent) {
    const slotWidth = Math.max((maxExtent - chrome) / sin, FD.axisLabelSize);
    for (const { text, full } of labels) {
      decorateManualAxisLabel(text, full, {
        maxLength: FD.matrixTopLabelMaxChars,
        slotWidth,
        ...axisLabels,
      });
    }
  }

  const shift = FD.axisLabelSize * 0.5 - LABEL_ROTATION_COMPENSATION;
  const groupDx = Math.cos(radians) ** 2 * shift;
  const textDx = Math.sin(radians) ** 2 * shift;

  let extent = 0;
  for (const { text, x } of labels) {
    text
      .attr('x', 0)
      .attr('dx', textDx)
      .attr('text-anchor', 'start')
      .attr(
        'transform',
        `translate(${x - available / 2 + groupDx},${
          baselineY + Math.abs(angle) * 0.1
        }) rotate(${angle})`,
      )
      .attr('y', 0);
    extent = Math.max(extent, widthOf(text));
  }

  return sin * extent + chrome;
}

/** Client AxisLeft: labels sit in the left gutter, cut to what the gutter holds. */
function renderYAxis(
  group: Selection<SVGGElement, unknown, null, undefined>,
  yDomain: string[],
  yScale: ReturnType<typeof scaleBand<string>>,
  gutter: number,
  axisLabels: AxisLabelTooltipHandlers,
  themeMode: 'light' | 'dark',
): void {
  for (const category of yDomain) {
    const band = yScale(category);
    if (band == null) continue;
    const text = group
      .append('text')
      .attr('x', -gutter)
      .attr('y', band + yScale.bandwidth() / 2 + 3)
      .attr('font-size', FD.axisLabelSize)
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('text-anchor', 'start')
      .style('dominant-baseline', 'middle');
    decorateManualAxisLabel(text, category, {
      maxLength: matrixYLabelMaxChars(gutter, FD.axisLabelSize),
      ...axisLabels,
    });
  }
}

/**
 * FuseDash MatrixChart — a sequential-palette grid with a pinned column header
 * once the rows overflow. Plot-local coordinates translated by the margin.
 */
export function renderMatrixChart(
  container: HTMLElement,
  options: RenderMatrixOptions,
): void {
  const {
    model,
    width,
    height,
    bodyHeight = height,
    margin = { ...FD.matrixMargin },
    theme,
    themeMode = 'light',
    topAxisContainer,
    onCellHover,
    onCellLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  const axisLabels: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  container.replaceChildren();
  topAxisContainer?.replaceChildren();
  if (!model.cells.length || width <= 0 || height <= 0) return;

  const layout = matrixLayout(model, height, margin);
  const xMax = width - margin.left - margin.right;
  const plotTop = layout.separateTopAxis ? 0 : layout.topAxisHeight;
  if (xMax < 8 || layout.rowsHeight < 8) return;

  const xScale = scaleBand<string>()
    .domain(model.xDomain)
    .range([0, xMax])
    .paddingInner(0)
    .paddingOuter(0);

  const yScale = scaleBand<string>()
    .domain(model.yDomain)
    .range([0, layout.rowsHeight])
    .paddingInner(0)
    .paddingOuter(0);

  const svgHeight = Math.max(layout.contentHeight, height);
  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', svgHeight)
    .attr('role', 'img')
    .attr('aria-label', 'Matrix chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  appendNoDataPattern(svg.append('defs'), themeMode);

  const plot = svg
    .append('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${margin.left},${plotTop})`);

  const ranges = matrixColorRanges(model);
  const cellPad = FD.matrixCellPadding;
  const cellWidth = Math.max(xScale.bandwidth() - cellPad, 1);
  const cellHeight = Math.max(yScale.bandwidth() - cellPad, 1);

  const layer = plot.append('g').attr('class', 'cells');
  for (const cell of cellsToPaint(model)) {
    const bx = xScale(cell.x);
    const by = yScale(cell.y);
    if (bx == null || by == null) continue;

    const rect = layer
      .append('rect')
      .attr('class', 'matrix-cell')
      .attr('x', bx)
      .attr('y', by + cellPad / 2)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('rx', FD.matrixCellRadius)
      .attr('fill', cellFill(cell.value, ranges));

    if (onCellHover) {
      rect
        .on('mouseenter', (event: MouseEvent) => onCellHover({ cell, event }))
        .on('mousemove', (event: MouseEvent) => onCellHover({ cell, event }))
        .on('mouseleave', () => onCellLeave?.());
    }
  }

  renderYAxis(
    plot.append('g').attr('class', 'y-axis'),
    model.yDomain,
    yScale,
    margin.left,
    axisLabels,
    themeMode,
  );

  if (!layout.separateTopAxis) {
    renderTopAxis(
      plot.append('g').attr('class', 'x-axis'),
      model.xDomain,
      xScale,
      xMax,
      layout.topAxisHeight,
      axisLabels,
      themeMode,
    );
    return;
  }

  if (!topAxisContainer) return;

  // Pinned header: drawn once, measured, then grown to fit rotated labels —
  // the client's fixed 41px header clips them when the rows scroll.
  const axisSvg = select(topAxisContainer)
    .append('svg')
    .attr('width', width)
    .attr('height', layout.topAxisHeight)
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const axisGroup = axisSvg
    .append('g')
    .attr('transform', `translate(${margin.left},${layout.topAxisHeight})`);

  const maxExtent = Math.max(
    layout.topAxisHeight,
    Math.min(
      TOP_AXIS_MAX_HEIGHT,
      Math.round(bodyHeight * TOP_AXIS_MAX_HEIGHT_RATIO),
    ),
  );
  const needed = renderTopAxis(
    axisGroup,
    model.xDomain,
    xScale,
    width,
    maxExtent,
    axisLabels,
    themeMode,
  );
  const axisHeight = Math.min(
    Math.max(layout.topAxisHeight, Math.ceil(needed)),
    maxExtent,
  );
  axisSvg.attr('height', axisHeight);
  axisGroup.attr('transform', `translate(${margin.left},${axisHeight})`);
}
