import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const bandUtilization: ChartConfig = {
  id: 'band-utilization',
  title: 'Band utilization',
  category: 'part-of-a-whole',
  description: 'Splits each row into bands that add up to its full width, such as low, medium and high use.',
  tag: 'ui9000-band-utilization-chart',
  keywords: ['capacity', 'usage'],
  load: async () => {
    await import('../../../../src/components/band-utilization-chart/element/ui9000-band-utilization-chart.js');
  },
  presets: [
    {
      id: 'by-sector',
      label: 'By sector',
      icon: 'bands',
      data: () => import('../../../../src/stories/fixtures/band-utilization.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend with one entry per band.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The band and its share in a tooltip when hovering a segment.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    yAxe: 'Field of a row with the entity: one row of bands per entity.',
    xAxe: 'Field of a row with the share of that band.',
    groupBy: 'Field with the band: one segment per band in each row.',
    formatting: 'Colour per band.',
    uniqueValues: 'Order of the entities and of the bands.',
    axisDetails: 'Label and unit of the share, for the tooltip.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: [
      'How the capacity of each entity, such as a sector or a server, is split across levels of use.',
      'Comparing that split across a handful of entities.',
    ],
    avoid: ['Absolute amounts: every row is stretched to the full width.', 'Many bands: more than about five are hard to tell apart.'],
  },
};

export default bandUtilization;
