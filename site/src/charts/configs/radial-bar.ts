import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const radialBar: ChartConfig = {
  id: 'radial-bar',
  title: 'Radial bar',
  category: 'comparison',
  description: 'Bars bent into concentric rings: each category is a ring whose arc length shows its value.',
  tag: 'ui9000-radial-bar-chart',
  keywords: ['circular bar', 'ring'],
  load: async () => {
    await import('../../../../src/components/radial-bar-chart/element/ui9000-radial-bar-chart.js');
  },
  // The Empty story is not a preset: it only shows "No data".
  presets: [
    {
      id: 'positive-values',
      label: 'Positive values',
      icon: 'radial',
      data: () => import('../../../../src/stories/fixtures/radial-bar.fusedash.json').then((m) => m.default),
      // The fixture's own name ("Average Weather Main Distribution by Total Balance") reads backwards.
      values: { chartTitle: 'Total Balance by Weather Type' },
    },
    {
      id: 'positive-and-negative',
      label: 'Positive and negative',
      icon: 'radial-diverging',
      // The Storybook story's data: a list of { label, value }, with no title of its own.
      data: () => import('../../../../src/stories/RadialBarChart.stories.js').then((m) => m.WithNegativeValues.args?.data),
      values: { chartTitle: 'Account Movements by Type' },
    },
  ],
  // Checked by rendering the three stories: every control changes the chart when there is data.
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Rings and value ticks behind the bars.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend above the plot, one entry per category.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a ring.' },
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
    xAxe: 'Field of a row with the category: one ring per category.',
    yAxe: 'Field of a row with the value: the length of the ring\'s arc.',
    formatting: 'Colour per category: key, and the step in the palette (1-based).',
    uniqueValues: 'Order of the categories. Rings go inwards in reverse order; the legend keeps this order.',
    axisDetails: 'Unit and label per field, for the tooltips.',
    data: 'The rows.',
    'points.label': 'The category: one ring each.',
    'points.value': 'The value. A negative value draws its arc the other way from zero.',
    'points.color': 'Optional colour for this ring.',
    'points.x': 'The category: one ring each.',
    'points.y': 'The value.',
  },
  whenToUse: {
    useFor: [
      'A handful of categories where a compact, round form fits the layout better than bars.',
      'Showing progress of a few items against the same scale.',
    ],
    avoid: [
      'Precise comparisons: outer rings are longer than inner ones for the same value, so they look larger. A bar chart reads truer.',
      'More than about 8 categories: the inner rings get too short to read.',
    ],
  },
};

export default radialBar;
