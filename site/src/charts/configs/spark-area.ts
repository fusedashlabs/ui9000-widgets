import { HEADER_CONTROLS, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const sparkArea: ChartConfig = {
  id: 'spark-area',
  title: 'Spark area',
  category: 'ordered-series',
  description: 'A compact filled line over time, for the shape and weight of a trend.',
  tag: 'ui9000-spark-area-chart',
  keywords: ['sparkline', 'mini area'],
  load: async () => {
    await import('../../../../src/components/spark-area-chart/element/ui9000-spark-area-chart.js');
  },
  presets: [
    {
      id: 'by-group',
      label: 'By group',
      icon: 'area-overlap',
      data: () => import('../../../../src/stories/fixtures/spark-area.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the areas.' },
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
    useFor: ['A volume trend in a small space, such as beside a KPI.', 'A few series over the same dates.'],
    avoid: ['Many overlapping series: the fills hide each other.', 'Reading exact values.'],
  },
};

export default sparkArea;
