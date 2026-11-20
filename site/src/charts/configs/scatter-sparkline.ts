import { HEADER_CONTROLS, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const scatterSparkline: ChartConfig = {
  id: 'scatter-sparkline',
  title: 'Scatter sparkline',
  category: 'ordered-series',
  description: 'A compact row of dots over time: each reading on its own, without a line between them.',
  tag: 'ui9000-scatter-sparkline-chart',
  keywords: ['sparkline', 'dots'],
  load: async () => {
    await import('../../../../src/components/scatter-sparkline-chart/element/ui9000-scatter-sparkline-chart.js');
  },
  presets: [
    {
      id: 'one-series',
      label: 'One series',
      icon: 'spark-dots',
      data: () => import('../../../../src/stories/fixtures/scatter-sparkline.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the dots.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend above the plot.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a dot.' },
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
    useFor: ['Irregular readings over time, where a line would suggest values between them.', 'Spotting outliers in a small space.'],
    avoid: ['Reading exact values.', 'Dense series: the dots merge into a band.'],
  },
};

export default scatterSparkline;
