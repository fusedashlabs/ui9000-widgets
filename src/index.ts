export * from './context/index.js';
export * from './types/index.js';
export {
  loadBarChart,
  loadChart,
  loadLineChart,
  loadAreaChart,
  loadAreaGroupedBarChart,
  loadLollipop,
  loadStepLineChart,
  loadSparkLineChart,
  loadSparkAreaChart,
  loadScatterSparklineChart,
  loadChartRenderer,
  loadHistogramChart,
  loadPunchcardChart,
  loadMatrixChart,
  loadBoxPlotChart,
  loadViolinChart,
  loadWaterfallChart,
  loadSankeyChart,
  loadParallelCoordinatesChart,
  loadPieChart,
  loadDonutChart,
  loadPolarAreaChart,
  loadScatterPlotChart,
  loadNetworkGraph,
  loadBiasVarianceTradeoffChart,
  loadBubbleChart,
  loadRadarChart,
  loadRadialBarChart,
  loadTreemapChart,
  loadPartialDependenceChart,
  loadKpiWidget,
  loadGiniImpurityEntropyChart,
  loadMapChart,
  loadCustomWidget,
  loadTable,
  loadText,
  loadImage,
  loadEventTimeline,
  loadEvidencePanel,
  loadEntityDetail,
  loadTextInput,
  loadNumberInput,
  loadSelect,
  loadMultiSelect,
  loadCheckbox,
  loadDateInput,
  loadButton,
  loadForm,
  loadApprovalBar,
  type ChartKind,
} from './lazy/index.js';

import { registerBarChart, Ui9000BarChart } from './components/bar-chart/index.js';
import { registerLineChart, Ui9000LineChart } from './components/line-chart/index.js';
import {
  registerAreaChart,
  Ui9000AreaChart,
} from './components/area-chart/index.js';
import {
  registerAreaGroupedBarChart,
  Ui9000AreaGroupedBarChart,
} from './components/area-grouped-bar-chart/index.js';
import { registerLollipop, Ui9000Lollipop } from './components/lollipop/index.js';
import {
  registerStepLineChart,
  Ui9000StepLineChart,
} from './components/step-line-chart/index.js';
import {
  registerSparkLineChart,
  Ui9000SparkLineChart,
} from './components/spark-line-chart/index.js';
import {
  registerSparkAreaChart,
  Ui9000SparkAreaChart,
} from './components/spark-area-chart/index.js';
import {
  registerScatterSparklineChart,
  Ui9000ScatterSparklineChart,
} from './components/scatter-sparkline-chart/index.js';
import {
  registerChartRenderer,
  Ui9000ChartRenderer,
} from './components/chart-renderer/index.js';
import {
  registerHistogramChart,
  Ui9000HistogramChart,
} from './components/histogram-chart/index.js';
import {
  registerPunchcardChart,
  Ui9000PunchcardChart,
} from './components/punchcard-chart/index.js';
import {
  registerMatrixChart,
  Ui9000MatrixChart,
} from './components/matrix-chart/index.js';
import {
  registerBoxPlotChart,
  Ui9000BoxPlotChart,
} from './components/box-plot-chart/index.js';
import {
  registerViolinChart,
  Ui9000ViolinChart,
} from './components/violin-chart/index.js';
import {
  registerWaterfallChart,
  Ui9000WaterfallChart,
} from './components/waterfall-chart/index.js';
import {
  registerSankeyChart,
  Ui9000SankeyChart,
} from './components/sankey-chart/index.js';
import {
  registerParallelCoordinatesChart,
  Ui9000ParallelCoordinatesChart,
} from './components/parallel-coordinates-chart/index.js';
import {
  registerPieChart,
  Ui9000PieChart,
} from './components/pie-chart/index.js';
import {
  registerDonutChart,
  Ui9000DonutChart,
} from './components/donut-chart/index.js';
import {
  registerPolarAreaChart,
  Ui9000PolarAreaChart,
} from './components/polar-area-chart/index.js';
import {
  registerScatterPlot,
  Ui9000ScatterPlot,
} from './components/scatter-plot-chart/index.js';
import {
  registerNetworkGraph,
  Ui9000NetworkGraph,
} from './components/network-graph/index.js';
import {
  registerBiasVarianceTradeoffChart,
  Ui9000BiasVarianceTradeoffChart,
} from './components/bias-variance-tradeoff-chart/index.js';
import {
  registerBubbleChart,
  Ui9000BubbleChart,
} from './components/bubble-chart/index.js';
import {
  registerRadarChart,
  Ui9000RadarChart,
} from './components/radar-chart/index.js';
import {
  registerRadialBarChart,
  Ui9000RadialBarChart,
} from './components/radial-bar-chart/index.js';
import {
  registerTreemapChart,
  Ui9000TreemapChart,
} from './components/treemap-chart/index.js';
import {
  registerPartialDependenceChart,
  Ui9000PartialDependenceChart,
} from './components/partial-dependence-chart/index.js';
import {
  registerKpiWidget,
  Ui9000KpiWidget,
} from './components/kpi-widget/index.js';
import {
  registerGiniImpurityEntropyChart,
  Ui9000GiniImpurityEntropyChart,
} from './components/gini-impurity-entropy-chart/index.js';
import { registerMapChart, Ui9000MapChart } from './components/map-chart/index.js';
import {
  registerCustomWidget,
  Ui9000CustomWidget,
} from './components/custom-widget/index.js';
import {
  registerTable,
  Ui9000Table,
} from './components/table/index.js';
import {
  registerText,
  Ui9000Text,
} from './components/text/index.js';
import {
  registerImage,
  Ui9000Image,
} from './components/image/index.js';
import {
  registerEventTimeline,
  Ui9000EventTimeline,
} from './components/event-timeline/index.js';
import {
  registerEvidencePanel,
  Ui9000EvidencePanel,
} from './components/evidence-panel/index.js';
import {
  registerEntityDetail,
  Ui9000EntityDetail,
} from './components/entity-detail/index.js';
import {
  registerTextInput,
  Ui9000TextInput,
} from './components/text-input/index.js';
import {
  registerNumberInput,
  Ui9000NumberInput,
} from './components/number-input/index.js';
import {
  registerSelect,
  Ui9000Select,
} from './components/select/index.js';
import {
  registerMultiSelect,
  Ui9000MultiSelect,
} from './components/multi-select/index.js';
import {
  registerCheckbox,
  Ui9000Checkbox,
} from './components/checkbox/index.js';
import {
  registerDateInput,
  Ui9000DateInput,
} from './components/date-input/index.js';
import {
  registerButton,
  Ui9000Button,
} from './components/button/index.js';
import {
  registerForm,
  Ui9000Form,
} from './components/form/index.js';
import {
  registerApprovalBar,
  Ui9000ApprovalBar,
} from './components/approval-bar/index.js';

export {
  Ui9000BarChart,
  registerBarChart,
  Ui9000LineChart,
  registerLineChart,
  Ui9000AreaChart,
  registerAreaChart,
  Ui9000AreaGroupedBarChart,
  registerAreaGroupedBarChart,
  Ui9000Lollipop,
  registerLollipop,
  Ui9000StepLineChart,
  registerStepLineChart,
  Ui9000SparkLineChart,
  registerSparkLineChart,
  Ui9000SparkAreaChart,
  registerSparkAreaChart,
  Ui9000ScatterSparklineChart,
  registerScatterSparklineChart,
  Ui9000ChartRenderer,
  registerChartRenderer,
  Ui9000HistogramChart,
  registerHistogramChart,
  Ui9000PunchcardChart,
  registerPunchcardChart,
  Ui9000MatrixChart,
  registerMatrixChart,
  Ui9000BoxPlotChart,
  registerBoxPlotChart,
  Ui9000ViolinChart,
  registerViolinChart,
  Ui9000WaterfallChart,
  registerWaterfallChart,
  Ui9000SankeyChart,
  registerSankeyChart,
  Ui9000ParallelCoordinatesChart,
  registerParallelCoordinatesChart,
  Ui9000PieChart,
  registerPieChart,
  Ui9000DonutChart,
  registerDonutChart,
  Ui9000PolarAreaChart,
  registerPolarAreaChart,
  Ui9000ScatterPlot,
  registerScatterPlot,
  Ui9000NetworkGraph,
  registerNetworkGraph,
  Ui9000BiasVarianceTradeoffChart,
  registerBiasVarianceTradeoffChart,
  Ui9000BubbleChart,
  registerBubbleChart,
  Ui9000RadarChart,
  registerRadarChart,
  Ui9000RadialBarChart,
  registerRadialBarChart,
  Ui9000TreemapChart,
  registerTreemapChart,
  Ui9000PartialDependenceChart,
  registerPartialDependenceChart,
  Ui9000KpiWidget,
  registerKpiWidget,
  Ui9000GiniImpurityEntropyChart,
  registerGiniImpurityEntropyChart,
  Ui9000MapChart,
  registerMapChart,
  Ui9000CustomWidget,
  registerCustomWidget,
  Ui9000Table,
  registerTable,
  Ui9000Text,
  registerText,
  Ui9000Image,
  registerImage,
  Ui9000EventTimeline,
  registerEventTimeline,
  Ui9000EvidencePanel,
  registerEvidencePanel,
  Ui9000EntityDetail,
  registerEntityDetail,
  Ui9000TextInput,
  registerTextInput,
  Ui9000NumberInput,
  registerNumberInput,
  Ui9000Select,
  registerSelect,
  Ui9000MultiSelect,
  registerMultiSelect,
  Ui9000Checkbox,
  registerCheckbox,
  Ui9000DateInput,
  registerDateInput,
  Ui9000Button,
  registerButton,
  Ui9000Form,
  registerForm,
  Ui9000ApprovalBar,
  registerApprovalBar,
};

/** Register all published chart web components (eager). Prefer lazy imports in MCP hosts. */
export function registerAllCharts(): void {
  registerLineChart();
  registerAreaChart();
  registerAreaGroupedBarChart();
  registerLollipop();
  registerStepLineChart();
  registerSparkLineChart();
  registerSparkAreaChart();
  registerScatterSparklineChart();
  registerChartRenderer();
  registerBarChart();
  registerHistogramChart();
  registerPunchcardChart();
  registerMatrixChart();
  registerBoxPlotChart();
  registerViolinChart();
  registerWaterfallChart();
  registerSankeyChart();
  registerParallelCoordinatesChart();
  registerPieChart();
  registerDonutChart();
  registerPolarAreaChart();
  registerScatterPlot();
  registerNetworkGraph();
  registerBiasVarianceTradeoffChart();
  registerBubbleChart();
  registerRadarChart();
  registerRadialBarChart();
  registerTreemapChart();
  registerPartialDependenceChart();
  registerKpiWidget();
  registerGiniImpurityEntropyChart();
  registerMapChart();
  registerCustomWidget();
  registerTable();
  registerText();
  registerImage();
  registerEventTimeline();
  registerEvidencePanel();
  registerEntityDetail();
  registerTextInput();
  registerNumberInput();
  registerSelect();
  registerMultiSelect();
  registerCheckbox();
  registerDateInput();
  registerButton();
  registerForm();
  registerApprovalBar();
}

export {
  normalizeBarData,
  renderBarChart,
  type BarChartData,
  type BarHoverEntry,
  type BarLayout,
  type BarOrientation,
  type BarPoint,
  type BarSeries,
  barChartMetadata,
} from './components/bar-chart/index.js';

export {
  normalizeLineData,
  renderLineChart,
  type LineChartData,
  type LineCurve,
  type LinePoint,
  type LineSeries,
  lineChartMetadata,
} from './components/line-chart/index.js';

export {
  normalizeAreaData,
  renderAreaChart,
  collectXDomain,
  type AreaChartData,
  type AreaLayout,
  type AreaModel,
  type AreaPoint,
  type AreaSeries,
  areaChartMetadata,
} from './components/area-chart/index.js';

export {
  normalizeAreaGroupedBarData,
  renderAreaGroupedBarChart,
  areaGroupedBarYDomain,
  type AreaGroupedBarChartInput,
  type AreaGroupedBarGroup,
  type AreaGroupedBarLinePoint,
  type AreaGroupedBarModel,
  areaGroupedBarChartMetadata,
} from './components/area-grouped-bar-chart/index.js';

export {
  normalizeLollipopData,
  renderLollipopChart,
  type LollipopChartData,
  type LollipopOrientation,
  type LollipopPoint,
  type LollipopSeries,
  lollipopMetadata,
} from './components/lollipop/index.js';

export {
  normalizeStepLineData,
  renderStepLineChart,
  type StepLineChartData,
  type StepLineGrafType,
  type StepLineHoverEntry,
  type StepLinePoint,
  type StepLineSeries,
  stepLineChartMetadata,
} from './components/step-line-chart/index.js';

export {
  normalizeSparkLineData,
  renderSparkLineChart,
  type SparkLineChartData,
  type SparkLineHoverEntry,
  type SparkLinePoint,
  type SparkLineSeries,
  sparkLineChartMetadata,
} from './components/spark-line-chart/index.js';

export {
  normalizeSparkLineData as normalizeSparkAreaData,
  renderSparkLineChart as renderSparkAreaChart,
  type SparkLineChartData as SparkAreaChartData,
  type SparkLineHoverEntry as SparkAreaHoverEntry,
  type SparkLinePoint as SparkAreaPoint,
  type SparkLineSeries as SparkAreaSeries,
  sparkAreaChartMetadata,
} from './components/spark-area-chart/index.js';

export {
  normalizeScatterSparklineData,
  renderScatterSparklineChart,
  type ScatterSparklineChartData,
  type ScatterSparklineModel,
  type ScatterSparklineRawPoint,
  scatterSparklineChartMetadata,
} from './components/scatter-sparkline-chart/index.js';

export {
  canRenderChartType,
  resolveChartTarget,
  resolveWidgetChartType,
  SUPPORTED_CHART_TYPES,
  type ChartTarget,
  chartRendererMetadata,
} from './components/chart-renderer/index.js';

export {
  normalizeHistogramData,
  renderHistogramChart,
  type HistogramBin,
  type HistogramModel,
  type HistogramStack,
  histogramChartMetadata,
} from './components/histogram-chart/index.js';

export {
  normalizePunchcardData,
  renderPunchcardChart,
  type PunchcardCell,
  type PunchcardModel,
  punchcardChartMetadata,
} from './components/punchcard-chart/index.js';

export {
  normalizeMatrixData,
  renderMatrixChart,
  matrixColorRanges,
  matrixLayout,
  type MatrixCell,
  type MatrixModel,
  matrixChartMetadata,
} from './components/matrix-chart/index.js';

export {
  normalizeBoxPlotData,
  renderBoxPlotChart,
  type BoxPlotBox,
  type BoxPlotModel,
  type BoxPlotOrientation,
  boxPlotChartMetadata,
} from './components/box-plot-chart/index.js';

export {
  normalizeViolinData,
  renderViolinChart,
  type ViolinGroup,
  type ViolinModel,
  type ViolinOrientation,
  violinChartMetadata,
} from './components/violin-chart/index.js';

export {
  normalizeWaterfallData,
  renderWaterfallChart,
  type WaterfallModel,
  type WaterfallOrientation,
  type WaterfallStep,
  waterfallChartMetadata,
} from './components/waterfall-chart/index.js';

export {
  normalizeSankeyData,
  renderSankeyChart,
  type SankeyLinkDatum,
  type SankeyModel,
  type SankeyNodeDatum,
  sankeyChartMetadata,
} from './components/sankey-chart/index.js';

export {
  normalizeParallelCoordinatesData,
  renderParallelCoordinatesChart,
  type ParallelCoordinatesModel,
  type ParallelCoordinatesOrientation,
  type ParallelCoordinatesRow,
  parallelCoordinatesChartMetadata,
} from './components/parallel-coordinates-chart/index.js';

export {
  normalizePieData,
  renderPieChart,
  legendSlicesFromPieOrder,
  type PieChartData,
  type PieSlice,
  type PieModel,
  pieChartMetadata,
} from './components/pie-chart/index.js';

export {
  normalizeDonutData,
  renderDonutChart,
  legendSlicesFromDonutOrder,
  computeDonutInnerRadius,
  MIN_DONUT_THICKNESS,
  DONUT_THICKNESS_RATIO,
  type DonutChartData,
  type DonutModel,
  type DonutChartSlice,
  donutChartMetadata,
} from './components/donut-chart/index.js';

export {
  normalizePolarAreaData,
  renderPolarAreaChart,
  polarLabelAnchor,
  polarRadialTicks,
  polarSectorAngles,
  type PolarAreaChartData,
  type PolarAreaLegendEntry,
  type PolarAreaModel,
  type PolarAreaSector,
  polarAreaChartMetadata,
} from './components/polar-area-chart/index.js';

export {
  normalizeScatterData,
  renderScatterPlot,
  type ScatterChartData,
  type ScatterModel,
  type ScatterPoint,
  scatterPlotChartMetadata,
} from './components/scatter-plot-chart/index.js';

export {
  normalizeNetworkGraphData,
  renderNetworkGraph,
  stopNetworkGraph,
  visibleNodeIds,
  legendRanges,
  type NetworkGraphModel,
  type NetworkLink,
  type NetworkNode,
  type NetworkRange,
  networkGraphMetadata,
} from './components/network-graph/index.js';

export {
  normalizeBiasVarianceData,
  renderBiasVarianceChart,
  biasVarianceXDomain,
  biasVarianceXValues,
  biasVarianceYDomain,
  formatTradeoffValue,
  type BiasVarianceChartData,
  type BiasVarianceDomainLimit,
  type BiasVarianceHoverEntry,
  type BiasVarianceModel,
  type BiasVariancePoint,
  type BiasVarianceSeries,
  biasVarianceTradeoffChartMetadata,
} from './components/bias-variance-tradeoff-chart/index.js';

export {
  normalizeBubbleData,
  renderBubbleChart,
  type BubbleChartData,
  type BubbleModel,
  type BubblePoint,
  bubbleChartMetadata,
} from './components/bubble-chart/index.js';

export {
  normalizeRadarData,
  renderRadarChart,
  type RadarChartData,
  type RadarModel,
  type RadarPoint,
  type RadarSeries,
  radarChartMetadata,
} from './components/radar-chart/index.js';

export {
  normalizeRadialBarData,
  renderRadialBarChart,
  radialBarAngleScale,
  radialBarArcWidth,
  radialBarLabelLimit,
  RADIAL_BAR_SWEEP,
  formatRadialBarCategory,
  formatRadialBarValue,
  type RadialBarChartData,
  type RadialBarDatum,
  type RadialBarModel,
  radialBarChartMetadata,
} from './components/radial-bar-chart/index.js';

export {
  normalizeTreemapData,
  renderTreemapChart,
  treemapGridTemplate,
  treemapRangeColors,
  treemapValueRanges,
  type TreemapChartData,
  type TreemapGroupCard,
  type TreemapMode,
  type TreemapModel,
  type TreemapTile,
  treemapChartMetadata,
} from './components/treemap-chart/index.js';

export {
  normalizePartialDependenceData,
  renderPartialDependenceChart,
  type IcePoint,
  type IceSeries,
  type PartialDependenceChartData,
  type PartialDependenceModel,
  partialDependenceChartMetadata,
} from './components/partial-dependence-chart/index.js';

export {
  normalizeKpiData,
  extractCardsFromKpi,
  isAdvancedKpiItem,
  formatKpiValue,
  splitFormattedKpiValue,
  getKpiGridColumns,
  getKpiGridScrollAxis,
  getAdvancedSplitLayout,
  MIN_KPI_CELL_WIDTH,
  type AdvancedSplitLayout,
  type KpiCardModel,
  type KpiGridScrollAxis,
  type KpiStatusBadge,
  type KpiValueLabel,
  type KpiWidgetData,
  type KpiWidgetLayout,
  type KpiWidgetModel,
  type RawKpiItem,
  kpiWidgetMetadata,
} from './components/kpi-widget/index.js';

export {
  normalizeCustomWidget,
  normalizeTableModel,
  isContentChartType,
  paneFlexDirection,
  KPI_ROW_HEIGHT,
  MAX_PANES,
  PANE_GAP,
  customWidgetMetadata,
  type ArrangingDirection,
  type CustomPane,
  type CustomPaneKind,
  type CustomTableModel,
  type CustomWidgetArranging,
  type CustomWidgetModel,
  type CustomWidgetPayload,
} from './components/custom-widget/index.js';

export {
  normalizeGiniImpurityEntropyData,
  renderGiniImpurityEntropyChart,
  giniImpurity,
  splitAnnotation,
  type GiniHoverEntry,
  type GiniImpurityEntropyChartData,
  type GiniImpurityEntropyFusePayload,
  type GiniImpurityEntropyModel,
  type GiniOverlayFlags,
  type GiniOverlays,
  type GiniSeries,
  type GiniSeriesPoint,
  type SplitAnnotation,
  giniImpurityEntropyChartMetadata,
} from './components/gini-impurity-entropy-chart/index.js';

export {
  normalizeMapData,
  renderMapChart,
  stopMapChart,
  GEOJSON_KEYS,
  type MapChartInput,
  type MapHoverEntry,
  type MapLayerModel,
  type MapModel,
  mapChartMetadata,
} from './components/map-chart/index.js';

export {
  getUniversalFormatting,
  getUniversalMarkers,
  getFormattingKeys,
  formattingInputFromWidget,
  resolveWidgetFormatting,
  resolveWidgetMarkers,
  type UniversalFormattingInput,
  type ChartFormattingItem,
  type ChartMarkerItem,
  type ChartMarkerShape,
} from './utils/chart-formatting/index.js';

export type { WidgetHeaderHandlers, WidgetHeaderVariant } from './element/widget-header.js';

export {
  loadEngineCatalog,
  evaluateCatalog,
  ENGINE_TARGET_IDS,
  collectPortMetadata,
} from './catalog/index.js';
