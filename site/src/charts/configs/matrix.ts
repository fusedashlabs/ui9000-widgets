import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const matrix: ChartConfig = {
  id: 'matrix',
  title: 'Matrix',
  category: 'two-way-magnitude',
  description: 'A grid of two categories where the shade of each cell shows the value.',
  tag: 'ui9000-matrix-chart',
  keywords: ['heatmap', 'heat map', 'grid'],
  load: async () => {
    await import('../../../../src/components/matrix-chart/element/ui9000-matrix-chart.js');
  },
  presets: [
    {
      id: 'small-grid',
      label: 'Small grid',
      icon: 'matrix',
      data: () => import('../../../../src/stories/MatrixChart.stories.js').then((m) => m.CompactGrid.args?.data),
    },
    {
      id: 'large-grid',
      label: 'Large grid',
      icon: 'matrix-dense',
      data: () => import('../../../../src/stories/fixtures/matrix.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showLegend', type: 'boolean', default: true, description: 'Colour scale with the value range.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The two categories and the value in a tooltip when hovering a cell.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the column category.',
    yAxe: 'Field of a row with the value: the shade of the cell.',
    groupBy: 'Field of a row with the row category.',
    uniqueValues: 'Order of the columns and rows. Pairs with no row stay empty.',
    axisDetails: 'Labels and units for the tooltip.',
    data: 'The rows: one cell each.',
  },
  whenToUse: {
    useFor: ['Patterns where two categories cross, such as day by channel.', 'Large grids, where a bar chart would need too many bars.'],
    avoid: ['Precise values: shades are read only roughly.', 'Only one category: a bar chart fits.'],
  },
};

export default matrix;
