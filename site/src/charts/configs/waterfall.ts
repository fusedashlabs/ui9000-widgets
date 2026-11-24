import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const waterfall: ChartConfig = {
  id: 'waterfall',
  title: 'Waterfall',
  category: 'contribution',
  description: 'Walks from a starting value to an end value through each increase and decrease.',
  tag: 'ui9000-waterfall-chart',
  keywords: ['bridge', 'cascade', 'variance'],
  load: async () => {
    await import('../../../../src/components/waterfall-chart/element/ui9000-waterfall-chart.js');
  },
  presets: [
    {
      id: 'balance',
      label: 'Balance',
      icon: 'waterfall',
      data: () => import('../../../../src/stories/fixtures/waterfall.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    {
      property: 'orientation',
      type: 'enum',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'Steps across the width (horizontal) or down the page (vertical).',
    },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the steps.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend of increase, decrease and total.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The step and its value in a tooltip when hovering a bar.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [
    { property: 'xLabel', attribute: 'x-label', reason: 'No axis title is drawn, in either orientation (rendered).' },
    { property: 'yLabel', attribute: 'y-label', reason: 'No axis title is drawn, in either orientation (rendered).' },
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the step name.',
    yAxe: 'Field of a row with the change, or the total.',
    formatting: 'Colours for increase, decrease and total.',
    uniqueValues: 'Order of the steps.',
    data: 'The rows: one step each. isTotal: true makes a row a total that starts from zero.',
  },
  whenToUse: {
    useFor: ['How a starting value became an end value: a budget, a balance, a variance.', 'Which changes contributed most.'],
    avoid: ['Unrelated categories with no running total: a bar chart fits.', 'Many tiny steps.'],
  },
};

export default waterfall;
