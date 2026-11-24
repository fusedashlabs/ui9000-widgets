import { HEADER_CONTROLS, noGroupBy } from '../shared.js';
import type { ChartConfig } from '../types.js';

const boxPlot: ChartConfig = {
  id: 'box-plot',
  title: 'Box plot',
  category: 'distribution',
  description: 'Summarises each distribution by its median, quartiles and whiskers, with outliers as dots.',
  tag: 'ui9000-box-plot-chart',
  keywords: ['box and whisker', 'quartiles'],
  load: async () => {
    await import('../../../../src/components/box-plot-chart/element/ui9000-box-plot-chart.js');
  },
  // The stories Grouped and Horizontal render the same pixels (same data, same orientation): one preset.
  presets: [
    {
      id: 'single',
      label: 'Single',
      icon: 'boxes',
      data: () => import('../../../../src/stories/fixtures/boxplot-single.fusedash.json').then((m) => m.default),
      values: { yLabel: 'Hours' },
    },
    {
      id: 'grouped',
      label: 'Grouped',
      icon: 'boxes-grouped',
      data: () => import('../../../../src/stories/fixtures/boxplot.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    {
      property: 'orientation',
      type: 'enum',
      options: ['vertical', 'horizontal'],
      default: 'vertical',
      description: 'Boxes stand up from the category axis (vertical) or lie across it (horizontal).',
    },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the boxes.' },
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend above the plot, one entry per group.',
      hiddenWhen: noGroupBy,
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The statistics in a tooltip when hovering a box.' },
    { property: 'xLabel', type: 'string', default: '', description: 'Title under the horizontal axis.' },
    { property: 'yLabel', type: 'string', default: '', description: 'Title beside the vertical axis.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field with the category: one box per category.',
    groupBy: 'Field that splits each category into one box per group. Empty: one box per category.',
    uniqueValues: 'Order of the categories and groups.',
    data: 'One row of precomputed statistics per box: minimum, quartiles, median, maximum and outliers.',
  },
  whenToUse: {
    useFor: ['Comparing the spread and centre of several distributions side by side.', 'Spotting outliers.'],
    avoid: ['Audiences new to box plots: a histogram is easier to read.', 'Distributions with several peaks: the box hides them.'],
  },
};

export default boxPlot;
