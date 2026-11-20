import { HEADER_CONTROLS, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const scatter: ChartConfig = {
  id: 'scatter',
  title: 'Scatter',
  category: 'two-measures',
  description: 'Plots each row as a dot by two numeric values, to show how they relate.',
  tag: 'ui9000-scatter-plot',
  keywords: ['correlation', 'xy', 'dots'],
  load: async () => {
    await import('../../../../src/components/scatter-plot-chart/element/ui9000-scatter-plot.js');
  },
  presets: [
    {
      id: 'by-group',
      label: 'By group',
      icon: 'dots',
      data: () => import('../../../../src/stories/fixtures/scatter.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showReferenceLine', type: 'boolean', default: false, description: 'A diagonal line where both values are equal.' },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the dots.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend above the plot, one entry per group.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a dot.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [SCALE_INERT],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the horizontal value.',
    yAxe: 'Field of a row with the vertical value.',
    groupBy: 'Field that colours the dots by group. Empty: one colour.',
    uniqueValues: 'Order of the groups.',
    data: 'The rows: one dot each.',
  },
  whenToUse: {
    useFor: ['Whether two measures move together, and how strongly.', 'Clusters and outliers across many rows.'],
    avoid: ['One measure over time: a line chart fits.', 'Thousands of overlapping dots: a matrix of counts reads better.'],
  },
};

export default scatter;
