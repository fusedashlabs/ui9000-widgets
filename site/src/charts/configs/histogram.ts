import { HEADER_CONTROLS, noGroupBy, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const histogram: ChartConfig = {
  id: 'histogram',
  title: 'Histogram',
  category: 'distribution',
  description: 'Counts how many values fall into each bin of a numeric range.',
  tag: 'ui9000-histogram-chart',
  keywords: ['bins', 'frequency'],
  load: async () => {
    await import('../../../../src/components/histogram-chart/element/ui9000-histogram-chart.js');
  },
  presets: [
    {
      id: 'single',
      label: 'Single',
      icon: 'histogram',
      data: () => import('../../../../src/stories/fixtures/histogram-single.fusedash.json').then((m) => m.default),
      values: { yLabel: 'Count' },
    },
    {
      id: 'grouped',
      label: 'Grouped',
      icon: 'histogram-grouped',
      data: () => import('../../../../src/stories/HistogramChart.stories.js').then((m) => m.Grouped.args?.data),
      values: { yLabel: 'Count' },
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the bins.' },
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend above the plot, one entry per group.',
      hiddenWhen: noGroupBy,
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The bin and its count in a tooltip when hovering a bar.' },
    { property: 'xLabel', type: 'string', default: '', description: 'Title under the horizontal axis.' },
    { property: 'yLabel', type: 'string', default: '', description: 'Title beside the vertical axis.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [SCALE_INERT],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    groupBy: 'Field that splits the counts into groups. Empty: one set of bins.',
    formatting: 'Colour per group.',
    uniqueValues: 'Order of the groups.',
    data: 'One row of precomputed statistics: the range, the bin count and width, and the counts per bin.',
  },
  whenToUse: {
    useFor: ['The shape of a numeric distribution: where values cluster, skew and gaps.', 'Comparing that shape across a few groups.'],
    avoid: ['Categories with no numeric order: a bar chart fits.', 'Very few values: the bins say little.'],
  },
};

export default histogram;
