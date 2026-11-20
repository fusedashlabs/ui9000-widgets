import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

/** With a subgroup, every tile card is its own group and the legend draws nothing (rendered). */
const grouped = ({ data }: { data: unknown }) =>
  Boolean(data && typeof data === 'object' && (data as { subgroup?: unknown }).subgroup);

const treemap: ChartConfig = {
  id: 'treemap',
  title: 'Treemap',
  category: 'part-of-a-whole',
  description: 'Shows magnitude, or a share of a total, as the area of nested tiles.',
  tag: 'ui9000-treemap-chart',
  keywords: ['hierarchy', 'nested'],
  load: async () => {
    await import('../../../../src/components/treemap-chart/element/ui9000-treemap-chart.js');
  },
  presets: [
    {
      id: 'by-category',
      label: 'By category',
      icon: 'treemap',
      data: () => import('../../../../src/stories/TreemapChart.stories.js').then((m) => m.SingleDimension.args?.data),
    },
    {
      id: 'by-category-and-group',
      label: 'By category and group',
      icon: 'treemap-grouped',
      data: () => import('../../../../src/stories/fixtures/treemap.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend under the tiles, one entry per colour band.',
      hiddenWhen: grouped,
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a tile.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the category: one tile per category.',
    yAxe: 'Field of a row with the value: the area of the tile.',
    groupBy: 'Field that groups the tiles.',
    subgroup: 'Field that splits the chart into one card of tiles per group. Null: one set of tiles.',
    formatting: 'Colour per category.',
    axisDetails: 'Labels and units for the tooltip.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: [
      'Many parts of a whole, where a pie would have too many slices.',
      'A second level of grouping, as one card of tiles per group.',
    ],
    avoid: [
      'Precise comparisons: areas are harder to compare than bar lengths.',
      'Values that do not add up to a meaningful total, or negative values.',
    ],
  },
};

export default treemap;
