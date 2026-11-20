import { HEADER_CONTROLS, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const sparkLine: ChartConfig = {
  id: 'spark-line',
  title: 'Spark line',
  category: 'ordered-series',
  description: 'A compact line over time, for the shape of a trend rather than exact values.',
  tag: 'ui9000-spark-line-chart',
  keywords: ['sparkline', 'mini chart'],
  load: async () => {
    await import('../../../../src/components/spark-line-chart/element/ui9000-spark-line-chart.js');
  },
  presets: [
    {
      id: 'by-group',
      label: 'By group',
      icon: 'lines',
      data: () => import('../../../../src/stories/fixtures/spark-line.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the lines.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend above the plot, one entry per series.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering the plot.' },
    { property: 'xLabel', type: 'string', default: '', description: 'Title under the horizontal axis.' },
    { property: 'yLabel', type: 'string', default: '', description: 'Title beside the vertical axis.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [SCALE_INERT],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the date.',
    yAxe: 'Field of a row with the value.',
    groupBy: 'Field that splits the rows into series. Empty: one series.',
    formatting: 'Colour per series.',
    uniqueValues: 'Order of the dates and series.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: ['The direction of a trend in a small space, such as beside a KPI.', 'A few series over the same dates.'],
    avoid: ['Reading exact values: use a line chart with full axes.', 'Unordered categories.'],
  },
};

export default sparkLine;
