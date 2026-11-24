import { HEADER_CONTROLS, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const areaAndBars: ChartConfig = {
  id: 'area-and-bars',
  title: 'Area and bars',
  category: 'comparison',
  description: 'One measure as a line with a filled area, and a second measure as grouped bars, on the same horizontal axis.',
  tag: 'ui9000-area-grouped-bar-chart',
  // Not "dual axis": the line and the bars share one value axis.
  keywords: ['combo', 'mixed', 'line and bars'],
  load: async () => {
    await import('../../../../src/components/area-grouped-bar-chart/element/ui9000-area-grouped-bar-chart.js');
  },
  // One preset: the only story. The element reads FuseDash payloads only, so there is no simple-shape preset.
  presets: [
    {
      id: 'default',
      label: 'Line and grouped bars',
      icon: 'area-bars',
      data: () => import('../../../../src/stories/fixtures/area-grouped-bar.fusedash.json').then((m) => m.default),
      // The fixture's own name ("Sum of Average Price by Large Bags") does not describe its columns.
      values: { chartTitle: 'Oldpeak and Resting Blood Pressure by Age' },
    },
  ],
  // Checked by rendering the story: only these change the chart.
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the plot.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend above the plot: the line, then one entry per bar group.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering the plot.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [SCALE_INERT],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the position along the horizontal axis, in the order of uniqueValues when given.',
    yAxe: 'Two fields: yAxe[0] is drawn as the line and area, yAxe[1] as the bars.',
    display: 'When set, replaces yAxe as the list of the two value fields.',
    groupBy: 'Field that splits the bars: one bar per group at each position.',
    formatting: 'Colour per bar group: key, and the step in the palette (1-based). The line takes the first colour.',
    uniqueValues: 'Order of the positions and of the bar groups, per field.',
    axisDetails: 'Unit and label per field: the line\'s legend label and the units in the axes and tooltips.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: [
      'A measure over an ordered axis, broken down by group as bars, with a second measure as a line for context.',
      'Showing whether two measures move together, without a second chart.',
    ],
    avoid: [
      'Measures on very different scales read against one axis: one of them flattens.',
      'More than a few bar groups: the bars get too thin to compare.',
    ],
  },
};

export default areaAndBars;
