import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const pie: ChartConfig = {
  id: 'pie',
  title: 'Pie',
  category: 'part-of-a-whole',
  description: 'Shows each category as a share of a total: the angle of its slice.',
  tag: 'ui9000-pie-chart',
  keywords: ['share', 'percentage', 'proportion'],
  load: async () => {
    await import('../../../../src/components/pie-chart/element/ui9000-pie-chart.js');
  },
  presets: [
    {
      id: 'by-category',
      label: 'By category',
      icon: 'pie',
      // The Storybook fixture is 12 months of one unnamed column ("Column 4225"), every slice 6–12%. Invented
      // names instead, six slices from 31% down to 5%, with axis labels and a unit for the tooltip.
      data: () => import('../data/pie-by-category.fusedash.json').then((m) => m.default),
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
      reason: 'The pie never reads it: the disc and its gutter are the same at compact, default and comfortable (rendered).',
    },
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the category: one slice per category.',
    yAxe: 'Field of a row with the value: the angle of the slice.',
    formatting: 'Colour per category.',
    uniqueValues: 'Order of the categories. Categories missing here are left out of the legend.',
    axisDetails: 'Labels for the tooltip rows, and the unit after the value.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: [
      'A few categories that add up to a meaningful whole, such as a budget or a market.',
      'Showing that one or two parts dominate, when the exact values matter less.',
    ],
    avoid: [
      'Comparing parts of similar size: angles are hard to tell apart. A bar chart reads truer.',
      'More than about 6 categories, values that don’t add up to a whole, or negative values.',
    ],
  },
};

export default pie;
