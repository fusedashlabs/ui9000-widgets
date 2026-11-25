import type { ControlConfig, HiddenControl } from './types.js';

/** Controls the agent operations graphs share (Bipartite, Goal burst, Goals & insights, Goals dependencies, Goals perimeter). */
export const AGENT_GRAPH_SWITCHES: ControlConfig[] = [
  {
    property: 'problemsOnly',
    attribute: 'problems-only',
    type: 'boolean',
    default: false,
    description: 'Only what is held stands out; what flows steps back.',
  },
  { property: 'showLegend', type: 'boolean', default: true, description: 'The button, bottom left, that opens the key to the agent states.' },
  { property: 'showTooltip', type: 'boolean', default: true, description: 'A mark’s detail in a tooltip when hovering.' },
];

/** Goal burst and Goals & insights: seen from straight overhead, without turning. */
export const FLAT: ControlConfig = {
  property: 'flat',
  attribute: 'flat',
  type: 'boolean',
  default: false,
  description: 'Seen from straight overhead, without turning.',
};

/** `show-header` on a chart that draws its header whatever it is set to (rendered: show-header="false" changes nothing). */
export const HEADER_ALWAYS: HiddenControl = {
  property: 'showHeader',
  attribute: 'show-header',
  reason: 'The chart draws its header whatever it is set to: show-header="false" changes nothing (rendered).',
};
