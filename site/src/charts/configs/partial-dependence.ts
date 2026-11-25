import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const partialDependence: ChartConfig = {
  id: 'partial-dependence',
  title: 'Partial dependence',
  category: 'model-dependence',
  description: 'Shows how a model’s prediction moves with one feature: a curve per row under their average.',
  tag: 'ui9000-partial-dependence-chart',
  keywords: ['pdp', 'ice', 'feature effect'],
  load: async () => {
    await import('../../../../src/components/partial-dependence-chart/element/ui9000-partial-dependence-chart.js');
  },
  presets: [
    {
      id: 'ice',
      label: 'Curves and average',
      icon: 'ice',
      data: () => import('../../../../src/stories/fixtures/partial-dependence.fusedash.json').then((m) => m.default),
    },
    {
      id: 'single-curve',
      label: 'Single curve',
      icon: 'line',
      data: () => import('../../../../src/stories/PartialDependenceChart.stories.js').then((m) => m.SingleCurve.args?.data),
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the curves.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend of the curves.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The feature value and the prediction in a tooltip when hovering.' },
    {
      property: 'scale',
      type: 'enum',
      options: ['compact', 'default', 'comfortable'],
      default: 'default',
      description: 'Density of the text and the spacing around the plot.',
    },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title of the chart.',
    xAxe: 'The feature, along the horizontal axis.',
    yAxe: 'The prediction, up the vertical axis.',
    groupBy: 'The field that names each row’s curve.',
    data: 'One row per point: the feature value, the prediction and the curve it belongs to.',
    axisDetails: 'Labels and formats of the fields.',
  },
  whenToUse: {
    useFor: ['How one feature moves a model’s prediction, on average and row by row.', 'Spotting rows that react differently from the average.'],
    avoid: ['Features that move together: the curves then show combinations that never happen.', 'Two features at once: this shows one.'],
  },
};

export default partialDependence;
