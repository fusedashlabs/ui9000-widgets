/**
 * Site map: the sidebar and the Introduction cards read from here.
 * Chart categories and chart types follow the Storybook sidebar order and naming (.storybook/preview.ts storySort).
 */
import { asStoryModule, type StoryModule } from './lib/stories.js';

export interface ChartTypeEntry {
  id: string;
  label: string;
  /** Other words people use for this chart, for search: "column" finds Bar. */
  keywords: string[];
}

export interface CategoryPreview {
  /** Chart type shown on the Introduction card. */
  typeId: string;
  /** The Storybook story whose element and fixture data the card renders. */
  load: () => Promise<StoryModule>;
  story: string;
}

export interface CategoryEntry {
  id: string;
  label: string;
  description: string;
  types: ChartTypeEntry[];
  preview: CategoryPreview;
}

export interface FoundationEntry {
  id: string;
  label: string;
}

const type = (label: string, keywords: string[] = []): ChartTypeEntry => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label,
  keywords,
});

// Color, Typography and Motion come later: they describe tokens and motion this repo's charts don't have yet.
export const FOUNDATIONS: FoundationEntry[] = ['Spacing'].map((label) => ({
  id: label.toLowerCase(),
  label,
}));

export const CATEGORIES: CategoryEntry[] = [
  {
    id: 'comparison',
    label: 'Comparison',
    description: 'Compare values across categories with bars, lines, areas and radial forms.',
    types: [
      type('Bar', ['column', 'horizontal bar', 'grouped', 'stacked', 'ranking']),
      type('Lollipop', ['dot plot', 'stem']),
      type('Line', ['trend', 'time series']),
      type('Area', ['filled line', 'volume']),
      type('Area and bars', ['combo', 'mixed']),
      type('Radial bar', ['circular bar', 'ring']),
      type('Polar area', ['rose', 'nightingale', 'coxcomb']),
    ],
    preview: { typeId: 'bar', load: () => asStoryModule(import('../../src/stories/BarChart.stories.js')), story: 'Default' },
  },
  {
    id: 'part-of-a-whole',
    label: 'Part of a whole',
    description: 'Show how the parts add up to a total.',
    types: [
      type('Pie', ['share', 'percentage', 'proportion']),
      type('Donut', ['doughnut', 'ring']),
      type('Treemap', ['hierarchy', 'nested']),
      type('Band utilization', ['capacity', 'usage']),
    ],
    preview: { typeId: 'pie', load: () => asStoryModule(import('../../src/stories/PieChart.stories.js')), story: 'Default' },
  },
  {
    id: 'ordered-series',
    label: 'Ordered series',
    description: 'Follow a value along an ordered axis, from KS and ROC curves to sparklines.',
    types: [
      type('Step line', ['ks plot', 'roc curve', 'cdf', 'staircase']),
      type('Spark line', ['sparkline', 'mini chart']),
      type('Spark area', ['sparkline', 'mini area']),
      type('Scatter sparkline', ['sparkline', 'dots']),
    ],
    preview: { typeId: 'step-line', load: () => asStoryModule(import('../../src/stories/StepLineChart.stories.js')), story: 'KsPlot' },
  },
  {
    id: 'distribution',
    label: 'Distribution',
    description: 'Represent how numerical data spreads: frequency in bins, quartiles and density.',
    types: [
      type('Histogram', ['bins', 'frequency']),
      type('Box plot', ['box and whisker', 'quartiles']),
      type('Violin', ['density', 'kde']),
    ],
    preview: { typeId: 'histogram', load: () => asStoryModule(import('../../src/stories/HistogramChart.stories.js')), story: 'Single' },
  },
  {
    id: 'two-measures',
    label: 'Two measures',
    description: 'Show the relationship between two numerical variables; bubble size adds a third.',
    types: [type('Scatter', ['correlation', 'xy', 'dots']), type('Bubble', ['size', 'third measure'])],
    preview: { typeId: 'scatter', load: () => asStoryModule(import('../../src/stories/ScatterPlot.stories.js')), story: 'Default' },
  },
  {
    id: 'two-way-magnitude',
    label: 'Two-way magnitude',
    description: 'Read a value where two categories cross, by colour or size.',
    types: [type('Matrix', ['heatmap', 'heat map', 'grid']), type('Punchcard', ['dot matrix', 'calendar'])],
    // Matrix's default fixture is a 94 × 50 grid, unreadable at card size; the punchcard reads at a glance.
    preview: {
      typeId: 'punchcard',
      load: () => asStoryModule(import('../../src/stories/PunchcardChart.stories.js')),
      story: 'Grouped',
    },
  },
  {
    id: 'many-metrics',
    label: 'Many metrics',
    description: 'Compare items across three or more quantitative variables at once.',
    types: [type('Radar', ['spider', 'web', 'star']), type('Parallel coordinates', ['multivariate', 'parallel axes'])],
    preview: { typeId: 'radar', load: () => asStoryModule(import('../../src/stories/RadarChart.stories.js')), story: 'Single' },
  },
  {
    id: 'flow',
    label: 'Flow',
    description: 'Visualize flow and quantities between categories or stages.',
    types: [type('Flow sankey', ['stages', 'funnel']), type('Sankey', ['alluvial', 'flow diagram'])],
    // The multi-stage Flow sankey needs more room than a card; the plain Sankey reads at card size.
    preview: { typeId: 'sankey', load: () => asStoryModule(import('../../src/stories/SankeyChart.stories.js')), story: 'Default' },
  },
  {
    id: 'contribution',
    label: 'Contribution',
    description: 'Show how an initial value is affected by a series of positive or negative changes.',
    types: [type('Waterfall', ['bridge', 'cascade', 'variance'])],
    preview: { typeId: 'waterfall', load: () => asStoryModule(import('../../src/stories/WaterfallChart.stories.js')), story: 'Horizontal' },
  },
];

export function findChartType(typeId: string): { category: CategoryEntry; type: ChartTypeEntry } | null {
  for (const category of CATEGORIES) {
    const found = category.types.find((t) => t.id === typeId);
    if (found) return { category, type: found };
  }
  return null;
}
