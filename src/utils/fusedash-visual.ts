import type { Selection } from 'd3-selection';

import type { ResolvedMode } from '../context/resolve-mode.js';

/** FuseDash Widgets visual tokens — keep charts looking 1:1 with client. */

/** Cartesian axis ink. Dark hexes are the client shell neutrals. */
export const FD_LIGHT = {
  gridStroke: '#afb3bb',
  axisLabelFill: '#6c7584',
  axisStroke: '#afb3bb',
  polarGridStroke: '#939ba7',
  polarCategoryLabelFill: '#5f6877',
  polarTickPill: '#ffffff',
  radialBarGridStroke: '#939ba7',
  radialBarLabelFill: '#5f6877',
  radarTickFill: '#f1f4f7',
  radarTickText: '#000000',
  sliceStroke: '#ffffff',
  biasVarianceGridStroke: '#d1d5db',
  biasVarianceAxisStroke: '#9ca3af',
  biasVarianceLabelFill: '#6b7280',
  parallelAxisStroke: '#939ba7',
  parallelAxisLabelFill: '#5f6877',
  sankeyNodeRule: '#D3DBE3',
  sankeyNodeRuleActive: '#939BA7',
  networkLabelText: 'rgba(33, 38, 46, 0.9)',
  networkLabelHover: '#FFFFFF',
  mapSelectionStroke: '#000000',
  mapSpikeLabel: '#000000',
  mapSpikeHalo: '#ffffff',
} as const;

export const FD_DARK = {
  gridStroke: '#444B57',
  axisLabelFill: '#A4A9B1',
  axisStroke: '#444B57',
  polarGridStroke: '#444B57',
  polarCategoryLabelFill: '#A4A9B1',
  polarTickPill: '#282E37',
  radialBarGridStroke: '#444B57',
  radialBarLabelFill: '#A4A9B1',
  radarTickFill: '#282E37',
  radarTickText: '#EFF0F1',
  sliceStroke: '#1a1b1f',
  biasVarianceGridStroke: '#444B57',
  biasVarianceAxisStroke: '#444B57',
  biasVarianceLabelFill: '#A4A9B1',
  parallelAxisStroke: '#444B57',
  parallelAxisLabelFill: '#A4A9B1',
  sankeyNodeRule: '#444B57',
  sankeyNodeRuleActive: '#A4A9B1',
  networkLabelText: '#EFF0F1',
  networkLabelHover: '#282E37',
  mapSelectionStroke: '#EFF0F1',
  mapSpikeLabel: '#EFF0F1',
  mapSpikeHalo: '#13161D',
} as const;

export function fdColors(mode: ResolvedMode) {
  return mode === 'dark' ? FD_DARK : FD_LIGHT;
}

export const FD = {
  gridStroke: FD_LIGHT.gridStroke,
  gridDash: '1 2',
  axisLabelFill: FD_LIGHT.axisLabelFill,
  axisLabelSize: 11,
  axisStroke: FD_LIGHT.axisStroke,
  hoverGuideLight: '#6c7584',
  hoverGuideDark: '#ffffff',
  /**
   * Qualitative12Colors.default — used when series count unknown.
   * Prefer `resolveFormattingColor` / `pickQualitativePalette` for FuseDash widgets.
   */
  series: [
    '#473DD9',
    '#938CFF',
    '#36C4A5',
    '#ADF4E5',
    '#BDBCC8',
    '#56546D',
    '#FF8C47',
    '#FFCEB0',
    '#FF4781',
    '#FFB0C9',
    '#47B0FF',
    '#B0DDFF',
  ],
  lineMargin: { top: 10, right: 1, bottom: 21, left: 40 },
  lollipopMargin: { top: 10, right: 3, bottom: 21, left: 40 },
  /** FuseDash RadarChart (useNewDesign) frame */
  radarMargin: { top: 25, right: 5, bottom: 25, left: 5 },
  radarScaleSteps: 5,
  radarDomainPadFactor: 1.1,
  radarMarkerSize: 50,
  radarMarkerHoverSize: 70,
  radarSpokeDash: '2,2',
  radarCapRadius: 3,
  radarLabelOffset: 12,
  radarGradientEdgeOpacity: 0.3,
  radarStrokeWidth: 2,
  radarTickLabelFill: FD_LIGHT.radarTickFill,
  /** Client PunchcardChart DEFAULT_MARGIN */
  punchcardMargin: { top: 0, right: 0, bottom: 21, left: 80 },
  /** Client MatrixChart DEFAULT_MARGIN */
  matrixMargin: { top: 20, right: 0, bottom: 30, left: 80 },
  /** MatrixChart cell gutter + corner (client `rectPadding`) */
  matrixCellPadding: 3,
  matrixCellRadius: 2,
  /** Rows never shrink below this — the plot scrolls instead */
  matrixMinCellHeight: 16,
  /** Top header: font + tick + label spacing reserve (client `topAxisHeight`) */
  matrixTopTickLength: 8,
  matrixTopLabelsSpacing: 12,
  /** Above this many rows the top axis is pinned and the rows scroll */
  matrixSeparateAxisRowLimit: 7,
  /** Negative cells are flat grey; zero / missing cells get the hatch pattern */
  matrixNegativeFill: '#DADAE1',
  matrixNoDataLight: '#f0f1f2',
  matrixNoDataDark: '#33373d',
  matrixNoDataStripeLight: '#ffffff',
  matrixNoDataStripeDark: '#000000',
  /** Client AxisLeft `TickLabel length={9}` */
  matrixYLabelMaxChars: 9,
  /** Client `MAX_LABEL_LENGTH` for the top header labels */
  matrixTopLabelMaxChars: 25,
  stepLineMargin: { top: 10, right: 1, bottom: 21, left: 40 },
  /** SparkLineChart — same frame as StepLineChart */
  sparkLineMargin: { top: 10, right: 1, bottom: 21, left: 40 },
  sparkLineStrokeWidth: 1.5,
  sparkDomainPadFactor: 1.2,
  sparkGuideDash: '5,2',
  sparkHoverDotRadius: 4,
  boxPlotMargin: { top: 10, right: 1, bottom: 21, left: 40 },
  histogramMargin: { top: 10, right: 1, bottom: 21, left: 40 },
  /** Client VerticalWaterfallChart margin */
  waterfallVerticalMargin: { top: 10, right: 0, bottom: 21, left: 40 },
  /** Client HorizontalWaterfallChart base margin (left is sized from labels) */
  waterfallHorizontalMargin: { top: 10, right: 1, bottom: 21, left: 40 },
  waterfallBarThickness: 16,
  waterfallBarRadius: 2,
  waterfallArrow: 5,
  waterfallDomainPadFactor: 1.2,
  /** Client hard-coded fills (formatting keys are ignored for paint) */
  waterfallPositive: '#938CFF',
  waterfallNegative: '#FF8C47',
  waterfallTotal: '#BDBCC8',
  waterfallHoverDim: 0.2,
  waterfallMinBand: 32,
  /** Client VerticalViolinChart DEFAULT_MARGIN */
  violinVerticalMargin: { top: 10, right: 16, bottom: 28, left: 44 },
  /** Client HorizontalViolinChart DEFAULT_MARGIN */
  violinHorizontalMargin: { top: 10, right: 24, bottom: 28, left: 44 },
  /** Client Horizontal/Vertical BoxPlot */
  boxPlotDomainPadFactor: 1.1,
  boxPlotBorderRadius: 2,
  lineStrokeWidth: 2,
  lineStrokeAlphaPct: 80,
  /** FuseDash AreaChart linearGradient stops (new design) */
  areaGradientTopOpacity: 0.6,
  areaGradientBottomOpacity: 0.1,
  lollipopStemWidth: 3,
  lollipopStemAlphaPct: 50,
  markerRadius: 4,
  /** StepLineChart: plain stroke, no alpha / glow / markers */
  stepStrokeWidth: 1.5,
  /** StepLineChart y-domain is padded by 1.2x before `.nice()` */
  stepDomainPadFactor: 1.2,
  /** KS-plot "Ideal" overlay */
  stepIdealColor: '#2ecc71',
  stepIdealWidth: 3,
  /** ROC "Random guessing" diagonal */
  stepGuessWidth: 2,
  stepGuessDash: '5,5',
  /** Max-deviation marker (KS distance) */
  stepDeviationFill: '#2c2d33',
  /** Tooltip crosshair on the step chart */
  stepGuideDash: '5,2',
  stepHoverDotRadius: 4,
  /** Barchart — shared frame + bar geometry (all six FuseDash variants) */
  barMargin: { top: 10, right: 1, bottom: 21, left: 40 },
  barCornerRadius: 4,
  /** Bar fill is a gradient from the series color to a faded stop */
  barFadeOpacity: 0.6,
  barFadeOpacityHovered: 0.7,
  /** Vertical single-series: bandwidth * 0.4, capped, with a visible floor */
  barBandFraction: 0.4,
  barMaxWidth: 40,
  barMinHeight: 6,
  /** Vertical grouped: floor(clamp(plotWidth / categories / series)) + 1px gap */
  barGroupMinWidth: 4,
  barGroupMaxWidth: 24,
  barGroupGap: 1,
  /** Vertical stacked: bandwidth * 0.85, same clamp as grouped */
  barStackedBandFraction: 0.85,
  /** Horizontal: fixed row thickness, gutter, and a floor for tiny values */
  barRowThickness: 24,
  barRowSpacing: 16,
  barMinWidth: 6,
  /** Y (vertical) / X (horizontal) domain headroom */
  barDomainPadFactor: 1.2,
  barHorizontalPadFactor: 1.1,
  /** Stacked totals get a flat 10% pad instead */
  barStackedPadFraction: 0.1,
  /** Cumulative overlay line (FuseDash `cumulativeLine`) */
  barCumulativeColor: '#6d6df7',
  barCumulativeWidth: 2,
  barCumulativeDotRadius: 3,
  /** Hovered category column: animated dot pattern + solid guide */
  barHoverDotFill: '#CFD2D6',
  barHoverGuideWidth: 2,
  /** Client `calculatedLeftMargin` (unused in chat — shared LEFT_GUTTER_MARGIN) */
  barLabelCharWidth: 5,
  barLabelGutter: 28,
  barLabelGutterMin: 56,
  barLabelGutterMax: 180,
  /** Resting / dimmed / hovered arc opacity (FuseDash settles on 0.8) */
  donutArcOpacity: 0.8,
  donutArcOpacityDimmed: 0.2,
  /** PieChart — FuseDash uses zero margin; pie is a square inscribed in the body */
  pieMargin: { top: 0, right: 0, bottom: 0, left: 0 },
  pieMinArcLengthPx: 5,
  /** PolarAreaChart — FuseDash margin around the centred disc */
  polarAreaMargin: { top: 25, right: 5, bottom: 25, left: 5 },
  /** Concentric grid rings; opacity ramps 0.2 → 1.0 outward */
  polarRadialSteps: 5,
  polarGridStroke: FD_LIGHT.polarGridStroke,
  polarGridStepOpacity: 0.2,
  /** Dashed spoke from the centre to each category boundary, with a round cap */
  polarSpokeDash: '2,2',
  polarSpokeCapRadius: 3,
  /** Category labels sit just outside the outermost ring */
  polarCategoryLabelFill: FD_LIGHT.polarCategoryLabelFill,
  polarCategoryLabelSize: 12,
  polarCategoryLabelOffset: 12,
  /** Side room reserved for those labels, measured off the longest one */
  polarLabelCharWidth: 0.55,
  polarLabelGutterMin: 40,
  polarLabelGutterMax: 120,
  polarLabelGutterMaxFraction: 0.28,
  /** Below this radius the label ring collides with itself — drop it */
  polarMinLabelRadius: 40,
  /** Sectors: 0.8 at rest, siblings drop to 0.2 on hover */
  polarSectorOpacity: 0.8,
  polarSectorOpacityDimmed: 0.2,
  /** Radial tick pills are hidden when the disc is too short to fit them */
  polarTickPillRowHeight: 21,
  polarTickPillPadX: 7,
  polarTickPillPadY: 3,
  polarTickPillRadius: 4,
  polarTickPill: FD_LIGHT.polarTickPill,
  polarTickPillDark: FD_DARK.polarTickPill,
  /** RadialBarChart — client margin; the plot is a circle inscribed in the body */
  radialBarMargin: { top: 25, right: 5, bottom: 25, left: 5 },
  /** Hole is 20% of the outer radius; rings sweep 270° clockwise from 12 o'clock */
  radialBarInnerRadiusRatio: 0.2,
  radialBarSweepDeg: 270,
  radialBarTicks: 5,
  /** Ring thickness clamp around `((outer - inner - rings) / rings) * 0.5` */
  radialBarMinArcWidth: 4,
  radialBarMaxArcWidth: 24,
  radialBarArcCornerRadius: 1,
  /** Resting / dimmed arc opacity */
  radialBarArcOpacity: 0.8,
  radialBarArcOpacityDimmed: 0.2,
  /** Client draws the rings and the radial axes in one darker grey */
  radialBarGridStroke: FD_LIGHT.radialBarGridStroke,
  radialBarTickDash: '4,4',
  radialBarLabelFill: FD_LIGHT.radialBarLabelFill,
  radialBarTickLabelSize: 12,
  radialBarRingLabelSize: 11,
  /** Value labels sit 12px outside the outer ring */
  radialBarTickLabelOffset: 12,
  /** Ring labels are cut at `(outer - inner) / 8` characters */
  radialBarLabelCharWidth: 8,
  /** ScatterPlot — FuseDash DEFAULT_MARGIN */
  scatterMargin: { top: 10, right: 5, bottom: 21, left: 40 },
  /** AreaGroupedBarChart — client DEFAULT_MARGIN */
  areaGroupedBarMargin: { top: 10, right: 5, bottom: 21, left: 40 },
  /** Area fill under the line (client stopOpacity 0.35 → 0) */
  areaGroupedBarGradientTopOpacity: 0.35,
  areaGroupedBarGradientBottomOpacity: 0,
  areaGroupedBarMarkerRadius: 3,
  areaGroupedBarDimOpacity: 0.3,
  areaGroupedBarBarOpacity: 0.85,
  /** BubbleChart — BASE_MARGIN + MAX_BUBBLE_RADIUS/2 inset on top/right */
  bubbleBaseMargin: { top: 10, right: 1, bottom: 21, left: 40 },
  bubbleMaxRadius: 30,
  bubbleNegativeFill: '#DADAE1',
  scatterMarkerSize: 40,
  scatterReferenceLine: '#56546D',
  /** BiasVarianceTradeoffChart — the client widget carries its own frame/palette */
  biasVarianceMargin: { top: 24, right: 24, bottom: 36, left: 48 },
  biasVarianceSeries: ['#6366f1', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444'],
  biasVarianceGridStroke: FD_LIGHT.biasVarianceGridStroke,
  biasVarianceGridDash: '2,4',
  biasVarianceAxisStroke: FD_LIGHT.biasVarianceAxisStroke,
  biasVarianceLabelFill: FD_LIGHT.biasVarianceLabelFill,
  biasVarianceLineWidth: 2,
  biasVarianceLineOpacity: 0.95,
  /** Sibling curves fade while one is hovered (FuseDash line-hover convention) */
  biasVarianceLineOpacityDimmed: 0.2,
  /** Y domain is `[0, max * 1.1]` before `.nice()` */
  biasVarianceDomainPadFactor: 1.1,
  biasVarianceXTicks: 8,
  biasVarianceYTicks: 6,
  /** Shared `DomainsLimits` overlay (reference lines / bands) */
  domainLimitColor: '#6C8CF5',
  domainLimitFillOpacity: 0.12,
  domainLimitDash: '4,4',
  domainLimitArrow: 8,
  domainLimitLabelFill: '#141c2ce6',
  domainLimitLabelText: '#ffffff',
  domainLimitLabelSize: 10,
  /** PartialDependenceChart — client DEFAULT_MARGIN */
  pdpMargin: { top: 16, right: 24, bottom: 28, left: 44 },
  /** ICE band: many faint curves under one dashed average line */
  pdpIceOpacity: 0.18,
  pdpIceStrokeWidth: 1.25,
  pdpAverageStrokeWidth: 2.5,
  pdpAverageDash: '4,4',
  donutSliceStroke: FD_LIGHT.sliceStroke,
  donutSliceStrokeDark: FD_DARK.sliceStroke,
  donutSliceStrokeWidth: 2,
  /** Treemap — d3 `treemapBinary` tiles, no axes so the plot fills the body */
  treemapMargin: { top: 0, right: 0, bottom: 0, left: 0 },
  treemapPaddingInner: 2,
  treemapTileRadius: 6,
  /** Tile fill fades from the band color to 80% alpha at the bottom edge */
  treemapGradientBottomOpacity: 0.8,
  /** White scanlines every 5px, fading out toward the bottom of the tile */
  treemapStripeColor: '#FFFFFF',
  treemapStripeSpacing: 5,
  treemapStripeOpacity: 0.14,
  treemapStripeFalloff: 0.8,
  /** Client `hasLightColor` label colors */
  treemapLabelOnLight: '#0B101A',
  treemapLabelOnDark: '#FFFFFF',
  treemapLabelPadding: 4,
  treemapLabelSize: 14,
  treemapValueSize: 12,
  /** A tile only gets a name below this, and a value below `MinValueHeight` */
  treemapMinLabelWidth: 40,
  treemapMinLabelHeight: 20,
  treemapMinValueHeight: 30,
  /** Grouped mode: one card per group in the client's grid-template-areas */
  treemapCardGap: 8,
  treemapCardRadius: 8,
  treemapCardPadding: 8,
  treemapGroupsMarginTop: 10,
  /** Rows in the >5 group fallback list, which scrolls instead of squeezing */
  treemapCardMinHeight: 140,
  /** Sibling tiles fade while one is hovered (chat-only affordance) */
  treemapDimOpacity: 0.4,
  /** `getTreemapRangeColors`: 7 shades from +55% white to -35% black */
  treemapRangeSteps: 7,
  treemapRangeMinShift: 0.55,
  treemapRangeMaxShift: -0.35,
  /** Sankey: layout extent inset, node gap, and the two node-rule colors */
  sankeyPadding: 4.5,
  sankeyNodePadding: 14,
  sankeyNodeWidth: 70,
  sankeyNodeWidthSmall: 65,
  sankeyNodeRule: FD_LIGHT.sankeyNodeRule,
  sankeyNodeRuleActive: FD_LIGHT.sankeyNodeRuleActive,
  /** Ribbons sit at 50% alpha until hovered or focused */
  sankeyLinkAlphaPct: 50,
  sankeyLinkInset: 3,
  sankeyDimOpacity: 0.5,
  /** ParallelCoordinates — client Horizontal/Vertical frames */
  parallelMargin: { top: 10, right: 1, bottom: 8, left: 1 },
  parallelVerticalMargin: { top: 10, right: 1, bottom: 1, left: 1 },
  /** Horizontal: one 72px band per dimension, so the plot scrolls past ~5 axes */
  parallelAxisSpacing: 72,
  /** Vertical: gutter kept free under the axes for the bottom tick row */
  parallelColorScaleHeight: 44,
  /** Right gutter reserved for the colour ramp + its tick labels */
  parallelLegendOffsetRight: 20,
  parallelLegendWidth: 10,
  parallelLegendTickLabelWidth: 44,
  parallelLegendRadius: 6,
  /** Resting / dimmed / hovered polyline stroke */
  parallelLineWidth: 1,
  parallelLineWidthHovered: 5,
  parallelLineOpacity: 0.4,
  parallelLineOpacityDimmed: 0.05,
  /** Client draws these axes a shade darker than the shared FD axis tokens */
  parallelAxisStroke: FD_LIGHT.parallelAxisStroke,
  parallelAxisLabelFill: FD_LIGHT.parallelAxisLabelFill,
  parallelTitleSize: 11,
  parallelTitleSizeActive: 13,
  /** GiniImpurityEntropyChart — client DEFAULT_MARGIN */
  giniMargin: { top: 20, right: 24, bottom: 28, left: 44 },
  /** Curves are drawn as smooth Catmull-Rom splines with this tension */
  giniCurveAlpha: 0.5,
  /** p-hat guide + confidence-interval band */
  giniOverlayColor: '#4c6ef5',
  giniOverlayBandOpacity: 0.08,
  giniOverlayDash: '5,5',
  /** Split annotation markers on the Gini curve */
  giniSplitMarkerFill: '#12b886',
  giniSplitMarkerStroke: '#ffffff',
  giniSplitMarkerRadius: 4,
  giniSplitLabelOffset: 8,
  /** Hovering one curve fades the others so the read is unambiguous */
  giniCurveDimOpacity: 0.2,
} as const;

/** SequentialColors1 for the `default` styleId — low → high. */
export const FD_SEQUENTIAL = [
  '#D6D3FF',
  '#B5B0FF',
  '#938CFF',
  '#7369FF',
  '#5448FF',
  '#473DD9',
  '#3C33B5',
] as const;

export type MarkerShape =
  | 'donut'
  | 'circle'
  | 'square'
  | 'rhombus'
  | 'triangle'
  | 'disabled';

/** Mirrors client `lightenColor` — blend hex toward white (amount 0–1). */
export function lightenColor(hex: string, amount: number): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return hex;
  const t = Math.max(0, Math.min(1, amount));
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const lr = Math.round(r + (255 - r) * t);
  const lg = Math.round(g + (255 - g) * t);
  const lb = Math.round(b + (255 - b) * t);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/** Mirrors client `hexToHexWithAlpha` (opacity 0–100). */
export function hexWithAlpha(hex: string, opacityPct: number): string {
  let clean = hex.replace('#', '').toUpperCase();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9A-F]{6}$/.test(clean)) return hex;
  const alpha = Math.round((Math.max(0, Math.min(100, opacityPct)) / 100) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `#${clean}${alpha}`;
}

/** Mirrors client `calculateScaleLinearDomain`. */
export function calculateScaleLinearDomain(data: number[]): [number, number] {
  if (!data.length) return [0, 1];
  let min = Infinity;
  let max = -Infinity;
  for (const v of data) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min < 0 && max > 0) {
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    return [-absMax, absMax];
  }
  return [Math.min(0, min), Math.max(0, max)];
}

/** Mirrors client Y-tick formatting. */
export function formatCompactNumber(value: number, decimals = 2): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Number.isInteger(value) && abs < 1000) return String(value);
  return value.toFixed(decimals);
}

export function seriesColor(index: number, override?: string): string {
  if (override) return override;
  return FD.series[index % FD.series.length];
}

/** Line markers: donut = hollow ring (FuseDash default). */
export function markerAppearance(
  shape: MarkerShape,
  color: string,
  themeMode: 'light' | 'dark' = 'light',
): { fill: string; stroke: string } {
  const outline = themeMode === 'dark' ? '#000' : '#fff';
  if (shape === 'donut' || shape === 'disabled') {
    return { fill: outline, stroke: color };
  }
  return { fill: color, stroke: outline };
}

export function appendGlowFilter(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  id = 'ui9000-glow',
): string {
  let defs = svg.select<SVGDefsElement>('defs');
  if (defs.empty()) defs = svg.append('defs');
  if (defs.select(`#${id}`).empty()) {
    const filter = defs
      .append('filter')
      .attr('id', id)
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');
  }
  return `url(#${id})`;
}

export function calculateNumTicks(height: number): number {
  if (height < 120) return 3;
  if (height < 220) return 4;
  if (height < 360) return 5;
  return 6;
}

/** Append FuseDash-style line/area marker at (cx, cy). */
export function appendLineMarker(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent: Selection<any, any, any, any>,
  opts: {
    shape: MarkerShape;
    color: string;
    cx: number;
    cy: number;
    r?: number;
    themeMode?: 'light' | 'dark';
    hovered?: boolean;
  },
): void {
  const {
    shape,
    color,
    cx,
    cy,
    r = FD.markerRadius,
    themeMode = 'light',
    hovered = false,
  } = opts;
  if (shape === 'disabled') return;

  const { fill, stroke } = markerAppearance(shape, color, themeMode);
  const strokeWidth = hovered ? 3 : 1;

  if (shape === 'square') {
    const size = 7;
    parent
      .append('rect')
      .attr('x', cx - size / 2)
      .attr('y', cy - size / 2)
      .attr('width', size)
      .attr('height', size)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth);
    return;
  }

  if (shape === 'rhombus') {
    const size = 9;
    parent
      .append('rect')
      .attr('x', cx - size / 2)
      .attr('y', cy - size / 2)
      .attr('width', size)
      .attr('height', size)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('transform', `rotate(45, ${cx}, ${cy})`);
    return;
  }

  if (shape === 'triangle') {
    const s = 4;
    parent
      .append('polygon')
      .attr(
        'points',
        `${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`,
      )
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth);
    return;
  }

  parent
    .append('circle')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', r)
    .attr('fill', fill)
    .attr('stroke', stroke)
    .attr('stroke-width', strokeWidth);
}

/**
 * Lollipop head — FuseDash Vertical markers (default = rhombus diamond path).
 */
export function appendLollipopMarkerVertical(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent: Selection<any, any, any, any>,
  opts: { shape: MarkerShape; color: string; cx: number; cy: number },
): void {
  const { shape, color, cx, cy } = opts;
  if (shape === 'disabled') return;

  if (shape === 'donut') {
    parent
      .append('path')
      .attr(
        'd',
        `M ${cx}, ${cy - 5} a 5,5 0 1,0 0,10 a 5,5 0 1,0 0,-10 M ${cx}, ${cy - 2} a 2,2 0 1,1 0,4 a 2,2 0 1,1 0,-4`,
      )
      .attr('fill', color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    parent.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 2).attr('fill', '#fff');
    return;
  }

  if (shape === 'circle') {
    parent
      .append('path')
      .attr('d', `M ${cx}, ${cy - 5} a 5,5 0 1,0 0,10 a 5,5 0 1,0 0,-10`)
      .attr('fill', color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    return;
  }

  if (shape === 'square') {
    parent
      .append('path')
      .attr(
        'd',
        `M${cx - 5}, ${cy + 5} L${cx + 5}, ${cy + 5} L${cx + 5}, ${cy - 5} L${cx - 5}, ${cy - 5} Z`,
      )
      .attr('fill', color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    return;
  }

  if (shape === 'triangle') {
    parent
      .append('path')
      .attr('d', `M${cx}, ${cy - 5} L${cx - 5}, ${cy + 5} L${cx + 5}, ${cy + 5} Z`)
      .attr('fill', color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    return;
  }

  // default / rhombus
  parent
    .append('path')
    .attr(
      'd',
      `M${cx}, ${cy + 5} L${cx + 5}, ${cy} L${cx}, ${cy - 5} L${cx - 5}, ${cy}Z`,
    )
    .attr('fill', color)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1);
}
