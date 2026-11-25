import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const story = (name: string) => () => import('../../../../src/stories/NetworkGraph.stories.js').then((m) => m[name as 'ChatGraph'].args?.data);

const network: ChartConfig = {
  id: 'network',
  title: 'Network',
  category: 'graph',
  description: 'Shows nodes and the links between them, laid out by force, with a heatmap view.',
  tag: 'ui9000-network-graph',
  keywords: ['node link', 'force', 'relationships'],
  stageHeight: 640,
  load: async () => {
    const [, metadata] = await Promise.all([
      import('../../../../src/components/network-graph/element/ui9000-network-graph.js'),
      import('../../../../src/components/network-graph/metadata.json'),
    ]);
    return { dataRoles: metadata.dataRoles };
  },
  presets: [
    {
      id: 'default',
      label: 'Default',
      icon: 'network',
      data: () => import('../../../../src/stories/fixtures/network-graph.fusedash.json').then((m) => m.default),
    },
    { id: 'chat-graph', label: 'Nodes and links', icon: 'network-small', data: story('ChatGraph') },
    {
      id: 'panels',
      label: 'With panels',
      icon: 'network-panels',
      data: () => import('../../../../src/stories/fixtures/network-graph.panels.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend of the node sizes, with handles to filter by size.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Tooltips on the Heatmap view’s cells and the panels’ charts. Nodes show their links on click instead.' },
    { property: 'wheelZoom', type: 'boolean', default: false, description: 'Zoom with the plain mouse wheel; otherwise ctrl or cmd and the wheel.' },
    { property: 'message', type: 'string', default: '', description: 'A note shown over the graph, such as why it is empty.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title of the graph.',
    data: 'The graph: nodes and links, and optionally topics, ranking and labels for the panels around it.',
    nodes: 'The nodes: an id, a label, a type and a value that sizes them.',
    links: 'The links: source, target, a value and an optional kind.',
    legend: 'Shows the legend when show-legend is not set.',
  },
  whenToUse: {
    useFor: ['Who or what is connected to what, and how strongly.', 'Finding the hubs and the clusters in a set of relationships.'],
    avoid: ['A flow with a direction and stages: a sankey reads better.', 'Hundreds of nodes at chat size: the labels cannot fit.'],
  },
};

export default network;
