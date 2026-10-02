export type ChartKind =
  | 'line-chart'
  | 'area-chart'
  | 'area-grouped-bar-chart'
  | 'lollipop'
  | 'step-line-chart'
  | 'spark-line-chart'
  | 'spark-area-chart'
  | 'scatter-sparkline-chart'
  | 'chart-renderer'
  | 'bar-chart'
  | 'histogram-chart'
  | 'punchcard-chart'
  | 'matrix-chart'
  | 'box-plot-chart'
  | 'violin-chart'
  | 'waterfall-chart'
  | 'sankey-chart'
  | 'flow-sankey-chart'
  | 'parallel-coordinates-chart'
  | 'pie-chart'
  | 'donut-chart'
  | 'polar-area-chart'
  | 'scatter-plot-chart'
  | 'network-graph'
  | 'bias-variance-tradeoff-chart'
  | 'bubble-chart'
  | 'radar-chart'
  | 'radial-bar-chart'
  | 'treemap-chart'
  | 'partial-dependence-chart'
  | 'kpi-widget'
  | 'status-gauge-widget'
  | 'gini-impurity-entropy-chart'
  | 'map-chart'
  | 'custom-widget'
  | 'table'
  | 'text'
  | 'image'
  | 'event-timeline'
  | 'evidence-panel'
  | 'entity-detail'
  | 'text-input'
  | 'number-input'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'date-input'
  | 'button'
  | 'form'
  | 'approval-bar';

export interface LazyChartModule {
  register: () => void;
}

const loaders: Record<ChartKind, () => Promise<LazyChartModule>> = {
  'line-chart': async () => {
    const mod = await import('../components/line-chart/index.js');
    return { register: mod.registerLineChart };
  },
  'area-chart': async () => {
    const mod = await import('../components/area-chart/index.js');
    return { register: mod.registerAreaChart };
  },
  'area-grouped-bar-chart': async () => {
    const mod = await import('../components/area-grouped-bar-chart/index.js');
    return { register: mod.registerAreaGroupedBarChart };
  },
  lollipop: async () => {
    const mod = await import('../components/lollipop/index.js');
    return { register: mod.registerLollipop };
  },
  'step-line-chart': async () => {
    const mod = await import('../components/step-line-chart/index.js');
    return { register: mod.registerStepLineChart };
  },
  'spark-line-chart': async () => {
    const mod = await import('../components/spark-line-chart/index.js');
    return { register: mod.registerSparkLineChart };
  },
  'spark-area-chart': async () => {
    const mod = await import('../components/spark-area-chart/index.js');
    return { register: mod.registerSparkAreaChart };
  },
  'scatter-sparkline-chart': async () => {
    const mod = await import('../components/scatter-sparkline-chart/index.js');
    return { register: mod.registerScatterSparklineChart };
  },
  'chart-renderer': async () => {
    const mod = await import('../components/chart-renderer/index.js');
    return { register: mod.registerChartRenderer };
  },
  'bar-chart': async () => {
    const mod = await import('../components/bar-chart/index.js');
    return { register: mod.registerBarChart };
  },
  'histogram-chart': async () => {
    const mod = await import('../components/histogram-chart/index.js');
    return { register: mod.registerHistogramChart };
  },
  'punchcard-chart': async () => {
    const mod = await import('../components/punchcard-chart/index.js');
    return { register: mod.registerPunchcardChart };
  },
  'matrix-chart': async () => {
    const mod = await import('../components/matrix-chart/index.js');
    return { register: mod.registerMatrixChart };
  },
  'box-plot-chart': async () => {
    const mod = await import('../components/box-plot-chart/index.js');
    return { register: mod.registerBoxPlotChart };
  },
  'violin-chart': async () => {
    const mod = await import('../components/violin-chart/index.js');
    return { register: mod.registerViolinChart };
  },
  'waterfall-chart': async () => {
    const mod = await import('../components/waterfall-chart/index.js');
    return { register: mod.registerWaterfallChart };
  },
  'sankey-chart': async () => {
    const mod = await import('../components/sankey-chart/index.js');
    return { register: mod.registerSankeyChart };
  },
  'flow-sankey-chart': async () => {
    const mod = await import('../components/flow-sankey-chart/index.js');
    return { register: mod.registerFlowSankeyChart };
  },
  'parallel-coordinates-chart': async () => {
    const mod = await import('../components/parallel-coordinates-chart/index.js');
    return { register: mod.registerParallelCoordinatesChart };
  },
  'pie-chart': async () => {
    const mod = await import('../components/pie-chart/index.js');
    return { register: mod.registerPieChart };
  },
  'donut-chart': async () => {
    const mod = await import('../components/donut-chart/index.js');
    return { register: mod.registerDonutChart };
  },
  'polar-area-chart': async () => {
    const mod = await import('../components/polar-area-chart/index.js');
    return { register: mod.registerPolarAreaChart };
  },
  'scatter-plot-chart': async () => {
    const mod = await import('../components/scatter-plot-chart/index.js');
    return { register: mod.registerScatterPlot };
  },
  'network-graph': async () => {
    const mod = await import('../components/network-graph/index.js');
    return { register: mod.registerNetworkGraph };
  },
  'bias-variance-tradeoff-chart': async () => {
    const mod = await import('../components/bias-variance-tradeoff-chart/index.js');
    return { register: mod.registerBiasVarianceTradeoffChart };
  },
  'bubble-chart': async () => {
    const mod = await import('../components/bubble-chart/index.js');
    return { register: mod.registerBubbleChart };
  },
  'radar-chart': async () => {
    const mod = await import('../components/radar-chart/index.js');
    return { register: mod.registerRadarChart };
  },
  'radial-bar-chart': async () => {
    const mod = await import('../components/radial-bar-chart/index.js');
    return { register: mod.registerRadialBarChart };
  },
  'treemap-chart': async () => {
    const mod = await import('../components/treemap-chart/index.js');
    return { register: mod.registerTreemapChart };
  },
  'partial-dependence-chart': async () => {
    const mod = await import('../components/partial-dependence-chart/index.js');
    return { register: mod.registerPartialDependenceChart };
  },
  'custom-widget': async () => {
    const mod = await import('../components/custom-widget/index.js');
    return { register: mod.registerCustomWidget };
  },
  'kpi-widget': async () => {
    const mod = await import('../components/kpi-widget/index.js');
    return { register: mod.registerKpiWidget };
  },
  'status-gauge-widget': async () => {
    const mod = await import('../components/status-gauge-widget/index.js');
    return { register: mod.registerStatusGaugeWidget };
  },
  'gini-impurity-entropy-chart': async () => {
    const mod = await import('../components/gini-impurity-entropy-chart/index.js');
    return { register: mod.registerGiniImpurityEntropyChart };
  },
  'map-chart': async () => {
    const mod = await import('../components/map-chart/index.js');
    return { register: mod.registerMapChart };
  },
  'table': async () => {
    const mod = await import('../components/table/index.js');
    return { register: mod.registerTable };
  },
  'text': async () => {
    const mod = await import('../components/text/index.js');
    return { register: mod.registerText };
  },
  'image': async () => {
    const mod = await import('../components/image/index.js');
    return { register: mod.registerImage };
  },
  'event-timeline': async () => {
    const mod = await import('../components/event-timeline/index.js');
    return { register: mod.registerEventTimeline };
  },
  'evidence-panel': async () => {
    const mod = await import('../components/evidence-panel/index.js');
    return { register: mod.registerEvidencePanel };
  },
  'entity-detail': async () => {
    const mod = await import('../components/entity-detail/index.js');
    return { register: mod.registerEntityDetail };
  },
  'text-input': async () => {
    const mod = await import('../components/text-input/index.js');
    return { register: mod.registerTextInput };
  },
  'number-input': async () => {
    const mod = await import('../components/number-input/index.js');
    return { register: mod.registerNumberInput };
  },
  'select': async () => {
    const mod = await import('../components/select/index.js');
    return { register: mod.registerSelect };
  },
  'multi-select': async () => {
    const mod = await import('../components/multi-select/index.js');
    return { register: mod.registerMultiSelect };
  },
  'checkbox': async () => {
    const mod = await import('../components/checkbox/index.js');
    return { register: mod.registerCheckbox };
  },
  'date-input': async () => {
    const mod = await import('../components/date-input/index.js');
    return { register: mod.registerDateInput };
  },
  'button': async () => {
    const mod = await import('../components/button/index.js');
    return { register: mod.registerButton };
  },
  'form': async () => {
    const mod = await import('../components/form/index.js');
    return { register: mod.registerForm };
  },
  'approval-bar': async () => {
    const mod = await import('../components/approval-bar/index.js');
    return { register: mod.registerApprovalBar };
  },
};

const loaded = new Set<ChartKind>();

/** Dynamically import and register a single chart web component. */
export async function loadChart(kind: ChartKind): Promise<LazyChartModule> {
  if (loaded.has(kind)) {
    return { register: () => undefined };
  }
  const mod = await loaders[kind]();
  mod.register();
  loaded.add(kind);
  return mod;
}

export async function loadLineChart(): Promise<LazyChartModule> {
  return loadChart('line-chart');
}

export async function loadAreaChart(): Promise<LazyChartModule> {
  return loadChart('area-chart');
}

export async function loadAreaGroupedBarChart(): Promise<LazyChartModule> {
  return loadChart('area-grouped-bar-chart');
}

export async function loadLollipop(): Promise<LazyChartModule> {
  return loadChart('lollipop');
}

export async function loadStepLineChart(): Promise<LazyChartModule> {
  return loadChart('step-line-chart');
}

export async function loadSparkLineChart(): Promise<LazyChartModule> {
  return loadChart('spark-line-chart');
}

export async function loadSparkAreaChart(): Promise<LazyChartModule> {
  return loadChart('spark-area-chart');
}

export async function loadScatterSparklineChart(): Promise<LazyChartModule> {
  return loadChart('scatter-sparkline-chart');
}

export async function loadChartRenderer(): Promise<LazyChartModule> {
  return loadChart('chart-renderer');
}

export async function loadBarChart(): Promise<LazyChartModule> {
  return loadChart('bar-chart');
}

export async function loadHistogramChart(): Promise<LazyChartModule> {
  return loadChart('histogram-chart');
}

export async function loadPunchcardChart(): Promise<LazyChartModule> {
  return loadChart('punchcard-chart');
}

export async function loadMatrixChart(): Promise<LazyChartModule> {
  return loadChart('matrix-chart');
}

export async function loadBoxPlotChart(): Promise<LazyChartModule> {
  return loadChart('box-plot-chart');
}

export async function loadViolinChart(): Promise<LazyChartModule> {
  return loadChart('violin-chart');
}

export async function loadWaterfallChart(): Promise<LazyChartModule> {
  return loadChart('waterfall-chart');
}

export async function loadSankeyChart(): Promise<LazyChartModule> {
  return loadChart('sankey-chart');
}

export async function loadFlowSankeyChart(): Promise<LazyChartModule> {
  return loadChart('flow-sankey-chart');
}

export async function loadParallelCoordinatesChart(): Promise<LazyChartModule> {
  return loadChart('parallel-coordinates-chart');
}

export async function loadPieChart(): Promise<LazyChartModule> {
  return loadChart('pie-chart');
}

export async function loadDonutChart(): Promise<LazyChartModule> {
  return loadChart('donut-chart');
}

export async function loadPolarAreaChart(): Promise<LazyChartModule> {
  return loadChart('polar-area-chart');
}

export async function loadScatterPlotChart(): Promise<LazyChartModule> {
  return loadChart('scatter-plot-chart');
}

export async function loadNetworkGraph(): Promise<LazyChartModule> {
  return loadChart('network-graph');
}

export async function loadBiasVarianceTradeoffChart(): Promise<LazyChartModule> {
  return loadChart('bias-variance-tradeoff-chart');
}

export async function loadBubbleChart(): Promise<LazyChartModule> {
  return loadChart('bubble-chart');
}

export async function loadRadarChart(): Promise<LazyChartModule> {
  return loadChart('radar-chart');
}

export async function loadRadialBarChart(): Promise<LazyChartModule> {
  return loadChart('radial-bar-chart');
}

export async function loadTreemapChart(): Promise<LazyChartModule> {
  return loadChart('treemap-chart');
}

export async function loadPartialDependenceChart(): Promise<LazyChartModule> {
  return loadChart('partial-dependence-chart');
}

export async function loadKpiWidget(): Promise<LazyChartModule> {
  return loadChart('kpi-widget');
}

export async function loadStatusGaugeWidget(): Promise<LazyChartModule> {
  return loadChart('status-gauge-widget');
}

export async function loadGiniImpurityEntropyChart(): Promise<LazyChartModule> {
  return loadChart('gini-impurity-entropy-chart');
}

export async function loadMapChart(): Promise<LazyChartModule> {
  return loadChart('map-chart');
}

export async function loadCustomWidget(): Promise<LazyChartModule> {
  return loadChart('custom-widget');
}

export async function loadTable(): Promise<LazyChartModule> {
  return loadChart('table');
}

export async function loadText(): Promise<LazyChartModule> {
  return loadChart('text');
}

export async function loadImage(): Promise<LazyChartModule> {
  return loadChart('image');
}

export async function loadEventTimeline(): Promise<LazyChartModule> {
  return loadChart('event-timeline');
}

export async function loadEvidencePanel(): Promise<LazyChartModule> {
  return loadChart('evidence-panel');
}

export async function loadEntityDetail(): Promise<LazyChartModule> {
  return loadChart('entity-detail');
}

export async function loadTextInput(): Promise<LazyChartModule> {
  return loadChart('text-input');
}

export async function loadNumberInput(): Promise<LazyChartModule> {
  return loadChart('number-input');
}

export async function loadSelect(): Promise<LazyChartModule> {
  return loadChart('select');
}

export async function loadMultiSelect(): Promise<LazyChartModule> {
  return loadChart('multi-select');
}

export async function loadCheckbox(): Promise<LazyChartModule> {
  return loadChart('checkbox');
}

export async function loadDateInput(): Promise<LazyChartModule> {
  return loadChart('date-input');
}

export async function loadButton(): Promise<LazyChartModule> {
  return loadChart('button');
}

export async function loadForm(): Promise<LazyChartModule> {
  return loadChart('form');
}

export async function loadApprovalBar(): Promise<LazyChartModule> {
  return loadChart('approval-bar');
}

export { loaders };
