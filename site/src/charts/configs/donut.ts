import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const donut: ChartConfig = {
  id: 'donut',
  title: 'Donut',
  category: 'part-of-a-whole',
  description: 'Shows each category as a share of a total, as arcs around an open centre.',
  tag: 'ui9000-donut-chart',
  keywords: ['doughnut', 'ring'],
  load: async () => {
    await import('../../../../src/components/donut-chart/element/ui9000-donut-chart.js');
  },
  presets: [
    {
      id: 'by-category',
      label: 'By category',
      icon: 'donut',
      // The Storybook fixture is 12 months of one volume, every slice 6–11%. Invented names instead, five slices
      // from 42% down to 9%, with axis labels and a unit for the tooltip.
      data: () => import('../data/donut-by-category.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend with each share as a percentage.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Value and share in a tooltip when hovering a slice.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [
    {
      property: 'scale',
      attribute: 'scale',
      reason: 'The donut never reads it: the ring and its gutter are the same at compact, default and comfortable (rendered).',
    },
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the category: one slice per category.',
    yAxe: 'Field of a row with the value: the length of the slice around the ring.',
    formatting: 'Colour per category.',
    uniqueValues: 'Order of the categories. Categories missing here are left out of the legend.',
    axisDetails: 'Labels for the tooltip rows, and the unit after the value.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: [
      'A few categories that add up to a meaningful whole, such as traffic sources or a budget.',
      'The same shares as a pie, where a lighter shape sits better beside other charts.',
    ],
    avoid: [
      'Comparing parts of similar size: arc lengths are hard to tell apart. A bar chart reads truer.',
      'More than about 6 categories, values that don’t add up to a whole, or negative values.',
    ],
  },
};

export default donut;
