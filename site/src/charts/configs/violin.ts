import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const violin: ChartConfig = {
  id: 'violin',
  title: 'Violin',
  category: 'distribution',
  description: 'Shows the full shape of each distribution as a mirrored density curve.',
  tag: 'ui9000-violin-chart',
  keywords: ['density', 'kde'],
  load: async () => {
    await import('../../../../src/components/violin-chart/element/ui9000-violin-chart.js');
  },
  presets: [
    {
      id: 'by-group',
      label: 'By group',
      icon: 'violin',
      data: () => import('../../../../src/stories/fixtures/violin.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    {
      property: 'orientation',
      type: 'enum',
      options: ['vertical', 'horizontal'],
      default: 'vertical',
      description: 'Violins stand up from the group axis (vertical) or lie across it (horizontal).',
    },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the violins.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [
    {
      property: 'showTooltip',
      attribute: 'show-tooltip',
      reason: 'The element declares it but has no tooltip: hovering shows nothing, on or off (rendered).',
    },
    { property: 'showLegend', attribute: 'show-legend', reason: 'No legend is drawn, on or off (rendered).' },
    { property: 'xLabel', attribute: 'x-label', reason: 'No axis title is drawn, in either orientation (rendered).' },
    { property: 'yLabel', attribute: 'y-label', reason: 'No axis title is drawn, in either orientation (rendered).' },
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    yAxe: 'Field of a row with the group: one violin per group.',
    xAxe: 'Field of a row with the value.',
    uniqueValues: 'Order of the groups.',
    data: 'The rows: one per value.',
  },
  whenToUse: {
    useFor: ['Distributions with more than one peak, which a box plot would hide.', 'Comparing shapes across a few groups.'],
    avoid: ['Small samples: the density curve invents a shape.', 'Audiences that need exact quartiles: a box plot shows them.'],
  },
};

export default violin;
