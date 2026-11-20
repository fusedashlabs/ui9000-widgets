import { HEADER_CONTROLS, noGroupBy, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const bubble: ChartConfig = {
  id: 'bubble',
  title: 'Bubble',
  category: 'two-measures',
  description: 'A scatter plot whose dot size adds a third measure.',
  tag: 'ui9000-bubble-chart',
  keywords: ['size', 'third measure'],
  load: async () => {
    await import('../../../../src/components/bubble-chart/element/ui9000-bubble-chart.js');
  },
  presets: [
    {
      id: 'single',
      label: 'Single',
      icon: 'bubbles',
      data: () => import('../../../../src/stories/fixtures/bubble.fusedash.json').then((m) => m.default),
    },
    {
      id: 'grouped',
      label: 'Grouped',
      icon: 'bubbles-grouped',
      data: () => import('../../../../src/stories/fixtures/bubble-grouped.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the bubbles.' },
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend above the plot, one entry per group.',
      hiddenWhen: noGroupBy,
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a bubble.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [SCALE_INERT],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the horizontal value.',
    yAxe: 'Field of a row with the vertical value.',
    groupBy: 'Field that colours the bubbles by group. Empty: one colour.',
    uniqueValues: 'Order of the groups.',
    axisDetails: 'Labels and units for the axes and the tooltip.',
    data: 'The rows: one bubble each.',
  },
  whenToUse: {
    useFor: ['Two measures and a third as size, such as quantity, price and revenue.', 'A few dozen items, labelled by group.'],
    avoid: ['Precise reading of the third measure: areas are hard to compare.', 'Many overlapping bubbles.'],
  },
};

export default bubble;
