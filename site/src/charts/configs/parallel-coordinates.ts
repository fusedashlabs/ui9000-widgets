import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const parallelCoordinates: ChartConfig = {
  id: 'parallel-coordinates',
  title: 'Parallel coordinates',
  category: 'many-metrics',
  description: 'Draws each item as a line across parallel axes, one axis per metric.',
  tag: 'ui9000-parallel-coordinates-chart',
  keywords: ['multivariate', 'parallel axes'],
  load: async () => {
    await import('../../../../src/components/parallel-coordinates-chart/element/ui9000-parallel-coordinates-chart.js');
  },
  presets: [
    {
      id: 'by-group',
      label: 'By group',
      icon: 'parallel',
      data: () => import('../../../../src/stories/fixtures/parallel-coordinates.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    {
      property: 'orientation',
      type: 'enum',
      options: ['horizontal', 'vertical'],
      // The element's own default is '' (the payload's orientation, else horizontal): horizontal with this data.
      default: 'horizontal',
      description: 'Axes side by side across the width (horizontal) or stacked down the page (vertical).',
    },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend above the plot, one entry per group.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The item’s values in a tooltip when hovering its line.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    orientation: 'Horizontal or vertical axes, when the orientation attribute is not set.',
    xAxe: 'Field of a row with the item id.',
    yAxe: 'The metric fields: one axis each.',
    formatting: 'Colour per group.',
    uniqueValues: 'The axes, in order.',
    data: 'The rows: one line each.',
  },
  whenToUse: {
    useFor: ['Comparing items across four or more metrics at once.', 'Finding groups of items with similar profiles.'],
    avoid: ['Many items: the lines become a tangle.', 'Only two metrics: a scatter plot reads better.'],
  },
};

export default parallelCoordinates;
