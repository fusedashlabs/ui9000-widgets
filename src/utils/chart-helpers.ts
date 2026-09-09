import type { ChartDimensions, WidgetScale } from '../types/index.js';
import { SCALE_PADDING } from '../types/index.js';
import { FD } from './fusedash-visual.js';

export function parseJsonAttr<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getDimensions(
  container: HTMLElement,
  scale: WidgetScale = 'default',
): ChartDimensions {
  const padding = SCALE_PADDING[scale];
  const width = container.clientWidth || 400;
  const height = container.clientHeight || 300;
  return {
    width,
    height,
    margin: { top: padding, right: padding, bottom: padding + 16, left: padding + 32 },
  };
}

/** FuseDash LineChart new-design frame */
export function getLineChartDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.lineMargin },
  };
}

/** FuseDash RadarChart frame */
export function getRadarDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.radarMargin },
  };
}

/** FuseDash Lollipop frame */
export function getLollipopDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.lollipopMargin },
  };
}

/** FuseDash PunchcardChart frame */
export function getPunchcardDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.punchcardMargin },
  };
}

/** FuseDash MatrixChart frame */
export function getMatrixDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.matrixMargin },
  };
}

/** FuseDash StepLineChart frame */
export function getStepLineDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.stepLineMargin },
  };
}

/** FuseDash SparkLineChart frame */
export function getSparkLineDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.sparkLineMargin },
  };
}

/**
 * FuseDash Barchart frame. `scale` stands in for the Redux `getWidgetScale`
 * factor: it tightens or loosens the frame around the plot rather than zooming
 * the whole SVG, which is what the fixed-size chat host needs.
 */
export function getBarChartDimensions(
  container: HTMLElement,
  scale: WidgetScale = 'default',
): ChartDimensions {
  const delta = SCALE_PADDING[scale] - SCALE_PADDING.default;
  const base = FD.barMargin;
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: {
      top: Math.max(base.top + delta, 0),
      right: base.right,
      bottom: Math.max(base.bottom + delta, 8),
      left: Math.max(base.left + delta, 24),
    },
  };
}

/** FuseDash BoxPlotChart frame */
export function getBoxPlotDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.boxPlotMargin },
  };
}

/** FuseDash ViolinChart frame — margins differ by orientation. */
export function getViolinDimensions(
  container: HTMLElement,
  orientation: 'vertical' | 'horizontal' = 'vertical',
): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: {
      ...(orientation === 'horizontal'
        ? FD.violinHorizontalMargin
        : FD.violinVerticalMargin),
    },
  };
}

/** FuseDash HistogramChart frame */
export function getHistogramDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.histogramMargin },
  };
}

/**
 * FuseDash ParallelCoordinatesChart frame. Horizontal stacks one 72px band per
 * dimension and scrolls; vertical fits the container and keeps a bottom gutter.
 */
export function getParallelCoordinatesDimensions(
  container: HTMLElement,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin:
      orientation === 'vertical'
        ? { ...FD.parallelVerticalMargin }
        : { ...FD.parallelMargin },
  };
}

/** FuseDash WaterfallChart frame — margins differ by orientation. */
export function getWaterfallDimensions(
  container: HTMLElement,
  orientation: 'vertical' | 'horizontal' = 'horizontal',
): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: {
      ...(orientation === 'vertical'
        ? FD.waterfallVerticalMargin
        : FD.waterfallHorizontalMargin),
    },
  };
}

/** FuseDash ScatterPlot frame */
export function getScatterPlotDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.scatterMargin },
  };
}

/** FuseDash BiasVarianceTradeoffChart frame */
export function getBiasVarianceDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.biasVarianceMargin },
  };
}

/** FuseDash BubbleChart frame — top/right inset for max bubble radius. */
export function getBubbleChartDimensions(container: HTMLElement): ChartDimensions {
  const inset = FD.bubbleMaxRadius / 2 + 1;
  const base = FD.bubbleBaseMargin;
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: {
      top: base.top + inset,
      right: base.right + inset,
      bottom: base.bottom,
      left: base.left,
    },
  };
}

/**
 * FuseDash RadialBarChart frame. `scale` stands in for the Redux
 * `getWidgetScale` factor: a looser frame leaves less room for the circle,
 * which is how the fixed-size chat host resizes the rings.
 */
export function getRadialBarDimensions(
  container: HTMLElement,
  scale: WidgetScale = 'default',
): ChartDimensions {
  const delta = SCALE_PADDING[scale] - SCALE_PADDING.default;
  const base = FD.radialBarMargin;
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: {
      top: Math.max(base.top + delta, 0),
      right: Math.max(base.right + delta, 0),
      bottom: Math.max(base.bottom + delta, 0),
      left: Math.max(base.left + delta, 0),
    },
  };
}

/** FuseDash PartialDependenceChart frame */
export function getPartialDependenceDimensions(
  container: HTMLElement,
  scale: WidgetScale = 'default',
): ChartDimensions {
  const delta = SCALE_PADDING[scale] - SCALE_PADDING.default;
  const base = FD.pdpMargin;
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: {
      top: Math.max(base.top + delta, 4),
      right: Math.max(base.right + delta, 8),
      bottom: Math.max(base.bottom + delta, 16),
      left: Math.max(base.left + delta, 28),
    },
  };
}

/** FuseDash PieChart frame — square plot area, zero SVG margin */
export function getPieDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.pieMargin },
  };
}

/**
 * FuseDash PolarAreaChart frame. `scale` stands in for the Redux
 * `getWidgetScale` factor: it loosens or tightens the gutter around the disc
 * rather than zooming the whole SVG.
 */
export function getPolarAreaDimensions(
  container: HTMLElement,
  scale: WidgetScale = 'default',
): ChartDimensions {
  const delta = SCALE_PADDING[scale] - SCALE_PADDING.default;
  const base = FD.polarAreaMargin;
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: {
      top: Math.max(base.top + delta, 0),
      right: Math.max(base.right + delta, 0),
      bottom: Math.max(base.bottom + delta, 0),
      left: Math.max(base.left + delta, 0),
    },
  };
}

/** FuseDash Treemap frame — tiles fill the body, there is no axis gutter. */
export function getTreemapDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.treemapMargin },
  };
}

/** FuseDash AreaChart frame (same as LineChart new design) */
export function getAreaChartDimensions(container: HTMLElement): ChartDimensions {
  return getLineChartDimensions(container);
}

/** FuseDash AreaGroupedBarChart frame */
export function getAreaGroupedBarChartDimensions(container: HTMLElement): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.areaGroupedBarMargin },
  };
}

/** FuseDash GiniImpurityEntropyChart frame */
export function getGiniImpurityEntropyDimensions(
  container: HTMLElement,
): ChartDimensions {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
    margin: { ...FD.giniMargin },
  };
}

/** FuseDash Sankey frame — the layout insets itself, so there is no margin. */
export function getSankeyDimensions(container: HTMLElement): {
  width: number;
  height: number;
} {
  return {
    width: container.clientWidth || 400,
    height: container.clientHeight || 300,
  };
}

/** FuseDash Qualitative2Colors1 (+ extras) */
export const CHART_COLORS = [...FD.series];
