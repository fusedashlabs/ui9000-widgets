import { HEADER_CONTROLS, noGroupBy, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const radar: ChartConfig = {
  id: 'radar',
  title: 'Radar',
  category: 'many-metrics',
  description: 'Plots several metrics on spokes from a centre, joined into one shape per item.',
  tag: 'ui9000-radar-chart',
  keywords: ['spider', 'web', 'star'],
  load: async () => {
    await import('../../../../src/components/radar-chart/element/ui9000-radar-chart.js');
  },
  presets: [
    {
      id: 'single',
      label: 'Single',
      icon: 'radar',
      data: () => import('../../../../src/stories/fixtures/radar.fusedash.json').then((m) => m.default),
    },
    {
      id: 'grouped',
      label: 'Grouped',
      icon: 'radar-grouped',
      data: () => import('../../../../src/stories/fixtures/radar-grouped.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Rings and spokes behind the shapes.' },
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend above the plot, one entry per group.',
      hiddenWhen: noGroupBy,
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a point.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [SCALE_INERT],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the spoke: one spoke per value.',
    yAxe: 'Field of a row with the value: the distance from the centre.',
    groupBy: 'Field that splits the rows into one shape per group. Empty: one shape.',
    formatting: 'Colour per group.',
    uniqueValues: 'Order of the spokes and groups.',
    axisDetails: 'Labels and units for the tooltip.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: ['Profiles of a few items across the same handful of metrics.', 'Cyclical categories, such as days of the week.'],
    avoid: ['More than about four shapes: they hide each other.', 'Precise comparisons: a bar chart reads truer.'],
  },
};

export default radar;
