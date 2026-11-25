import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';
import { AGENT_GRAPH_SWITCHES, FLAT, HEADER_ALWAYS } from '../agent-graphs.js';

const story = (name: string) => () => import('../../../../src/stories/GoalsInsights.stories.js').then((m) => m[name as 'Alone'].args?.data);

const goalsInsights: ChartConfig = {
  id: 'goals-insights',
  title: 'Goals & insights',
  category: 'graph',
  description: 'Shows the evidence behind one goal as a column: each claim its agents filed, on the ring of the hour it came in.',
  tag: 'ui9000-goals-insights',
  keywords: ['evidence', 'claims', 'column'],
  stageHeight: 760,
  load: async () => {
    await import('../../../../src/components/goals-insights/element/ui9000-goals-insights.js');
  },
  presets: [
    {
      id: 'default',
      label: 'Two connected',
      icon: 'column',
      data: () => import('../../../../src/stories/fixtures/goals-insights.default.json').then((m) => m.default),
    },
    { id: 'one-connected', label: 'One connected', icon: 'column-one', data: story('OneConnected') },
    { id: 'alone', label: 'Alone', icon: 'column-alone', data: story('Alone') },
  ],
  controls: [FLAT, ...AGENT_GRAPH_SWITCHES, HEADER_CONTROLS[0]],
  hidden: [HEADER_ALWAYS],
  dataFields: {
    title: 'Title of the chart.',
    goal: 'The goal: its name, status, confidence and agents by state.',
    connected: 'The goals it shares evidence with, stood either side.',
    claims: 'The claims: the goal each was filed under, its polarity, state, sources and age.',
  },
  whenToUse: {
    useFor: ['How well a goal’s evidence holds up, and what argues against it.', 'Claims that more than one goal relies on.'],
    avoid: ['A plain list of claims: a table reads faster.', 'Comparing many goals: it shows one at a time.'],
  },
};

export default goalsInsights;
