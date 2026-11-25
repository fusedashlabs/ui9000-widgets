import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';
import { AGENT_GRAPH_SWITCHES } from '../agent-graphs.js';

const bipartite: ChartConfig = {
  id: 'bipartite',
  title: 'Bipartite',
  category: 'graph',
  description: 'Sets the goals against the resource groups they draw on, joined by ribbons as wide as their traffic.',
  tag: 'ui9000-bipartite-graph',
  keywords: ['two-sided', 'goals', 'resources', 'ribbons'],
  stageHeight: 720,
  load: async () => {
    await import('../../../../src/components/bipartite-graph/element/ui9000-bipartite-graph.js');
  },
  presets: [
    {
      id: 'default',
      label: 'With catalog',
      icon: 'bipartite',
      data: () => import('../../../../src/stories/fixtures/bipartite.default.json').then((m) => m.default),
    },
    {
      id: 'no-catalog',
      label: 'Without catalog',
      icon: 'bipartite-named',
      data: () => import('../../../../src/stories/BipartiteGraph.stories.js').then((m) => m.NoCatalog.args?.data),
    },
  ],
  controls: [...AGENT_GRAPH_SWITCHES, ...HEADER_CONTROLS],
  dataFields: {
    name: 'Title of the graph.',
    goals: 'The goals, on the left: code, name, status, agent counts and the resource groups each draws on with its calls.',
    resourceGroups: 'The catalog of groups, on the right, with their asset counts by health. Without it, the groups the goals name.',
    resourceGroupTotal: 'How many groups there are in all, for the count in the corner.',
    exceptionCount: 'Open exceptions, for the count in the corner.',
  },
  whenToUse: {
    useFor: ['Which goals lean on which resources, and where traffic is held.', 'Seeing one resource group that holds up several goals.'],
    avoid: ['A plain list of links between two sets: a sankey is simpler.', 'Chat-sized panels: the labels need about 1,250 × 640 to show in full.'],
  },
};

export default bipartite;
