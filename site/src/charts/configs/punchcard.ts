import { HEADER_CONTROLS, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const punchcard: ChartConfig = {
  id: 'punchcard',
  title: 'Punchcard',
  category: 'two-way-magnitude',
  description: 'A grid of circles where two categories cross; the size and shade show the value.',
  tag: 'ui9000-punchcard-chart',
  keywords: ['dot matrix', 'calendar'],
  load: async () => {
    await import('../../../../src/components/punchcard-chart/element/ui9000-punchcard-chart.js');
  },
  presets: [
    {
      id: 'single',
      label: 'Single',
      icon: 'punchcard',
      data: () => import('../../../../src/stories/fixtures/punchcard-client.fusedash.json').then((m) => m.default),
    },
    {
      id: 'grouped',
      label: 'Grouped',
      icon: 'punchcard-grouped',
      data: () => import('../../../../src/stories/fixtures/punchcard.fusedash.json').then((m) => m.default),
      values: { yLabel: 'Weekday' },
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines through the rows and columns.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The two categories and the value in a tooltip when hovering a circle.' },
    { property: 'yLabel', type: 'string', default: '', description: 'Title beside the vertical axis.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [
    SCALE_INERT,
    { property: 'xLabel', attribute: 'x-label', reason: 'The title is drawn over the labels under the horizontal axis: the axis leaves it no room (rendered).' },
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the column category.',
    yAxe: 'Field of a row with the value: the size of the circle.',
    groupBy: 'Field of a row with the row category. Empty: one row.',
    uniqueValues: 'Order of the columns and rows.',
    data: 'The rows: one circle each.',
  },
  whenToUse: {
    useFor: ['Activity by two cycles, such as weekday by hour.', 'Showing where values concentrate in a grid.'],
    avoid: ['Precise values: circle sizes are read only roughly.', 'Large grids: a matrix packs more cells.'],
  },
};

export default punchcard;
