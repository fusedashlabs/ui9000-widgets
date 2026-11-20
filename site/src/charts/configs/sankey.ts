import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const sankey: ChartConfig = {
  id: 'sankey',
  title: 'Sankey',
  category: 'flow',
  description: 'Shows how quantities flow from one set of categories to another, as bands of matching width.',
  tag: 'ui9000-sankey-chart',
  keywords: ['alluvial', 'flow diagram'],
  load: async () => {
    await import('../../../../src/components/sankey-chart/element/ui9000-sankey-chart.js');
  },
  presets: [
    {
      id: 'two-levels',
      label: 'Two levels',
      icon: 'sankey',
      data: () => import('../../../../src/stories/fixtures/sankey.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend of the colours.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The flow and its value in a tooltip when hovering a band.' },
    { property: 'sourceLabel', type: 'string', default: '', description: 'Title over the source column.' },
    { property: 'targetLabel', type: 'string', default: '', description: 'Title over the target column.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    groupBy: 'The source field and the target field.',
    axisDetails: 'Labels and units for the tooltip.',
    data: 'The rows: one flow each, with its value.',
  },
  whenToUse: {
    useFor: ['How totals redistribute from sources to targets, such as region to product.', 'The biggest flows among many.'],
    avoid: ['More than one step: a flow sankey shows stages.', 'Many tiny flows: they become hairlines.'],
  },
};

export default sankey;
