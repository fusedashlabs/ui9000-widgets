import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';
import { AGENT_GRAPH_SWITCHES, FLAT, HEADER_ALWAYS } from '../agent-graphs.js';

const story = (name: string) => () => import('../../../../src/stories/GoalBurst.stories.js').then((m) => m[name as 'Bare'].args?.data);

const goalBurst: ChartConfig = {
  id: 'goal-burst',
  title: 'Goal burst',
  category: 'graph',
  description: 'Draws one goal as its traffic: each call a spike, as long as it took to answer, in a sector per resource group.',
  tag: 'ui9000-goal-burst',
  keywords: ['radial', 'calls', 'latency', 'agents'],
  stageHeight: 720,
  load: async () => {
    await import('../../../../src/components/goal-burst/element/ui9000-goal-burst.js');
  },
  presets: [
    {
      id: 'default',
      label: 'Default',
      icon: 'burst',
      data: () => import('../../../../src/stories/fixtures/goal-burst.default.json').then((m) => m.default),
    },
    { id: 'nothing-held', label: 'Nothing held', icon: 'burst-clear', data: story('AllFlowing') },
    { id: 'bare', label: 'Without kinds', icon: 'burst-plain', data: story('Bare') },
  ],
  controls: [FLAT, ...AGENT_GRAPH_SWITCHES, HEADER_CONTROLS[0]],
  hidden: [HEADER_ALWAYS],
  dataFields: {
    goal: 'The goal: its name, its agents by state and its progress.',
    categories: 'The resource groups it draws on: each with its kind, its calls and their answer times, its assets and what holds them.',
    resourceGroupTotal: 'How many groups there are in all, for the count in the corner.',
  },
  whenToUse: {
    useFor: ['Where one goal’s calls are slow or held, group by group.', 'How quickly each resource answers, against its usual time.'],
    avoid: ['Comparing several goals: Goals perimeter or Bipartite shows them together.'],
  },
};

export default goalBurst;
