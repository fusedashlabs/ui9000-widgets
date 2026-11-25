import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';
import { AGENT_GRAPH_SWITCHES } from '../agent-graphs.js';

const goalsPerimeter: ChartConfig = {
  id: 'goals-perimeter',
  title: 'Goals perimeter',
  category: 'graph',
  description: 'Draws every live goal as a cloud of its agents, ringed by its progress and orbited by its resource groups.',
  tag: 'ui9000-goals-perimeter',
  keywords: ['agents', 'clouds', 'orbit'],
  stageHeight: 720,
  load: async () => {
    await import('../../../../src/components/goals-perimeter/element/ui9000-goals-perimeter.js');
  },
  presets: [
    {
      id: 'default',
      label: 'Goals',
      icon: 'clouds',
      data: () => import('../../../../src/stories/fixtures/goals-perimeter.default.json').then((m) => m.default),
    },
    {
      id: 'agents',
      label: 'One goal’s agents',
      icon: 'cloud-agents',
      data: () => import('../../../../src/stories/fixtures/goals-perimeter.agents.json').then((m) => m.default),
    },
    {
      id: 'auto-layout',
      label: 'Automatic layout',
      icon: 'clouds-auto',
      data: () => import('../../../../src/stories/GoalsPerimeterChart.stories.js').then((m) => m.AutoLayout.args?.data),
    },
  ],
  controls: [...AGENT_GRAPH_SWITCHES, ...HEADER_CONTROLS],
  dataFields: {
    name: 'Title of the board.',
    goals: 'The goals: code, name, status, agents by state, the resource groups each draws on, and an optional position.',
    goal: 'One goal, drawn from a list of its agents instead of counts.',
    agents: 'That goal’s agents, each with its state and, when held, why.',
    links: 'Agents held by something outside the goal, and what holds them.',
    exceptionCount: 'Open exceptions, for the count in the corner.',
  },
  whenToUse: {
    useFor: ['The state of every live goal at a glance, and which ones share a resource.', 'One goal’s agents, each a point in the colour of its state.'],
    avoid: ['Exact numbers: the callouts carry them, the clouds only show their shape.'],
  },
};

export default goalsPerimeter;
