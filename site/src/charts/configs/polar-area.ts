import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const polarArea: ChartConfig = {
  id: 'polar-area',
  title: 'Polar area',
  category: 'comparison',
  description: 'Compares categories as equal-angle sectors whose radius shows the value.',
  tag: 'ui9000-polar-area-chart',
  keywords: ['rose', 'nightingale', 'coxcomb'],
  load: async () => {
    await import('../../../../src/components/polar-area-chart/element/ui9000-polar-area-chart.js');
  },
  presets: [
    {
      id: 'by-category',
      label: 'By category',
      icon: 'polar',
      // The Storybook story's data (the fixture without groupBy, one sector per crop group) as one row per crop
      // group, with Leafy (was 44K) and Pepper (was 0.40M) raised: the smallest radius is now 27% of the largest.
      data: () => import('../data/polar-area-by-category.fusedash.json').then((m) => m.default),
      values: { chartTitle: 'Area by Crop Group' },
    },
    {
      id: 'by-category-and-group',
      label: 'By category and group',
      icon: 'polar-grouped',
      // The fixture with other values: each crop group split into 2–3 growing methods, every wedge 26–100% of the
      // largest. In the fixture only the Open F Fruit Crop and Open Field wedges showed.
      data: () => import('../data/polar-area-grouped.fusedash.json').then((m) => m.default),
      values: { chartTitle: 'Area by Crop Group and Growing Method' },
    },
  ],
  // No axes, no orientation, no layout: only the controls below change this chart (rendered).
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Rings and spokes behind the sectors.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend above the plot.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a sector.' },
    {
      property: 'scale',
      type: 'enum',
      options: ['compact', 'default', 'comfortable'],
      default: 'default',
      description: 'Padding around the plot.',
    },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the category: one sector per category.',
    yAxe: 'Field of a row with the value: the radius of the sector.',
    groupBy: 'Field that splits each sector into one wedge per group. Empty: one sector per category.',
    formatting:
      'Colour per category, or per group with groupBy. With more than one entry, rows of the same category add up into one sector.',
    uniqueValues: 'Order of the categories and groups. The legend lists the first field given here.',
    data: 'The rows.',
    points: 'One series: a list of points.',
    'points.x': 'The category.',
    'points.y': 'The value.',
  },
  whenToUse: {
    useFor: [
      'A handful of categories with a cyclical order, such as months or compass directions.',
      'Showing one category standing out, when the exact values matter less than the shape.',
    ],
    avoid: [
      'Precise comparisons: area grows with the square of the radius, so sectors exaggerate differences. A bar chart reads truer.',
      'More than about 12 categories, or categories with no natural order.',
    ],
  },
};

export default polarArea;
