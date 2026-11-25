import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';
import { AGENT_GRAPH_SWITCHES } from '../agent-graphs.js';

const story = (name: string) => () => import('../../../../src/stories/GoalsDependencyGraph.stories.js').then((m) => m[name as 'FewerGoals'].args?.data);

const goalsDependencies: ChartConfig = {
  id: 'goals-dependencies',
  title: 'Goals dependencies',
  category: 'graph',
  description: 'Grows every goal as a tree of its agents, with a line from its root to each resource group it draws on.',
  tag: 'ui9000-goals-dependency-graph',
  keywords: ['tree', 'dependency graph', 'resources'],
  stageHeight: 720,
  load: async () => {
    await import('../../../../src/components/goals-dependency-graph/element/ui9000-goals-dependency-graph.js');
  },
  presets: [
    {
      id: 'default',
      label: 'Default',
      icon: 'trees',
      data: () => import('../../../../src/stories/fixtures/goals-dependency-graph.default.json').then((m) => m.default),
    },
    { id: 'other-centre', label: 'Another centre', icon: 'trees-shifted', data: story('OtherCentre') },
    { id: 'fewer-goals', label: 'Fewer goals', icon: 'trees-few', data: story('FewerGoals') },
  ],
  controls: [...AGENT_GRAPH_SWITCHES, ...HEADER_CONTROLS],
  dataFields: {
    name: 'Title of the graph.',
    goals: 'The goals: code, name, status, agents by state, progress and the resource groups each draws on.',
    resourceGroups: 'The groups, in the order they line up, with their asset counts by health.',
    center: 'The code of the goal grown in full at the centre. Without it, the goal that holds the most agents.',
    exceptionCount: 'Open exceptions, for the count in the corner.',
  },
  whenToUse: {
    useFor: ['Tracing which resource holds up a goal, from the goal down to the cause.', 'Seeing every goal’s size and state side by side.'],
    avoid: ['Traffic between goals and resources: Bipartite sizes the links by calls.'],
  },
};

export default goalsDependencies;
