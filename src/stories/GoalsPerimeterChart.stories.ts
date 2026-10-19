import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/goals-perimeter/index.js';
import '../components/chart-renderer/index.js';
import type { GoalOpenDetail, Ui9000GoalsPerimeterChart } from '../components/goals-perimeter/index.js';
import defaultFixture from './fixtures/goals-perimeter.default.json';
import agentsFixture from './fixtures/goals-perimeter.agents.json';

type GoalsPerimeterArgs = {
  data: unknown;
  width: string;
  height: string;
  /** Goal id to open once the board is drawn, as a click on its cluster would. */
  open?: string;
};

/** Opens `goalId` after the first draw, the way a click on its cluster does. */
function openOnMount(goalId: string | undefined) {
  return ref((node) => {
    if (!goalId || !node) return;
    const chart = node as Ui9000GoalsPerimeterChart;
    setTimeout(() => chart.openGoalById(goalId), 120);
  });
}

/** Same goals with no positions: the automatic layout places them. */
const autoLayout = {
  ...defaultFixture,
  goals: defaultFixture.goals.map(({ position: _position, ...goal }) => goal),
};

/** Two states only (healthy and failed): same layout, the legend shows two swatches. */
const fewerStates = {
  chartType: 'goalsPerimeter',
  name: 'Release agents',
  goal: { name: 'Pipeline Quality', health: 0.94, multiplier: 0.9 },
  agents: Array.from({ length: 48 }, (_, i) => ({
    id: `build-${String(i + 1).padStart(2, '0')}`,
    state: i % 12 === 5 ? 'failed' : 'healthy',
    ...(i % 12 === 5 ? { reason: 'Release stage timed out' } : {}),
  })),
};

/** 2,400 agents around one goal: the cloud samples them, the counts stay exact. */
const extraAgents = {
  chartType: 'goalsPerimeter',
  name: 'Claims agents',
  goal: {
    name: 'Claims Triage',
    multiplier: 2.4,
    resourceGroups: [
      { name: 'Scoring model', kind: 'model', state: 'degraded' },
      { name: 'Case queue', kind: 'queue', state: 'healthy' },
      { name: 'Policy engine', kind: 'policy', state: 'healthy' },
    ],
  },
  agents: Array.from({ length: 2400 }, (_, i) => {
    const state = i % 50 === 0 ? 'failed' : i % 37 === 0 ? 'blocked' : i % 19 === 0 ? 'degraded' : 'healthy';
    return {
      id: `claims-${i + 1}`,
      state,
      ...(state === 'failed' ? { reason: 'Scoring model timeout' } : {}),
      ...(state === 'blocked' ? { reason: 'Waiting for adjuster approval', blocker: 'human' } : {}),
      ...(state === 'degraded' ? { reason: 'Slow document OCR' } : {}),
    };
  }),
  links: [{ source: 'claims-1', target: 'Fraud bureau API', status: 'degraded', reason: 'Rate limited' }],
};

function logOpen(event: CustomEvent<GoalOpenDetail>): void {
  const log = (event.currentTarget as HTMLElement).parentElement?.querySelector('output');
  if (!log) return;
  const { goalName, resourceGroupId } = event.detail;
  log.textContent = `goal-open → ${goalName}${resourceGroupId ? ` · ${resourceGroupId}` : ''}`;
}

const frame = (args: GoalsPerimeterArgs) => html`
  <div style="width:${args.width};height:${args.height};">
    <ui9000-goals-perimeter
      data=${JSON.stringify(args.data)}
      @goal-open=${logOpen}
      ${openOnMount(args.open)}
    ></ui9000-goals-perimeter>
    <output style="display:block;margin-top:8px;font:12px system-ui;color:#737373;"></output>
  </div>
`;

const meta: Meta<GoalsPerimeterArgs> = {
  title: 'Graph/Goals perimeter',
  component: 'ui9000-goals-perimeter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Agents Management goals perimeter (AM-2): many agents arranged around a shared goal. Each goal is a cloud of its agents inside a perimeter: the arc is the goal health, clockwise from 12 o’clock, green above 80%, amber below, rose below 25%. Healthy, degraded, blocked and failed agents differ by colour and by marker (△, ⊘, ✕). Diamonds at the centre are resource groups coloured by state, and red ticks outside the ring grow with the exception count. Lines join goals, agents and external dependencies, red with a ⊘ where a connection is down. The state legend and the exception count sit in the shell. Hover any mark for its detail. Click a cluster (“click to open”) and it expands: the goal fills the plot, its agents regroup into one sector per health state with the reasons beside each, its resource groups are named, and the goals and dependencies it is joined to sit around it — click one to open it. “← All goals” or Esc zooms back out. Opening fires `goal-open`, closing `goal-close`. A free-form node–link graph stays network-graph. Use the toolbar for light or dark.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    open: { control: 'text' },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  args: { data: defaultFixture, width: '100%', height: '720px' },
  render: frame,
};

export default meta;
type Story = StoryObj<GoalsPerimeterArgs>;

/** Five goals on one board, fitted to the panel like every other story. */
export const Default: Story = { name: 'Default' };

export const OpenGoal: Story = {
  name: 'Open goal (Perimeter Watch)',
  args: { width: '100%', height: '720px', open: 'perimeter-watch' },
};

export const OpenDegradedGoal: Story = {
  name: 'Open goal (Onboarding Velocity)',
  args: { width: '100%', height: '720px', open: 'onboarding-velocity' },
};

export const OpenAgentNodes: Story = {
  name: 'Open goal from agent nodes',
  args: { data: agentsFixture, width: '100%', height: '720px', open: 'incident-response' },
};

export const AgentNodes: Story = {
  name: 'Agent nodes around one goal',
  args: { data: agentsFixture, width: '100%', height: '620px' },
};

export const FewerStates: Story = {
  name: 'Fewer states',
  args: { data: fewerStates, width: '100%', height: '560px' },
};

export const ExtraAgents: Story = {
  name: 'Extra agents',
  args: { data: extraAgents, width: '100%', height: '620px' },
};

export const AutoLayout: Story = {
  name: 'Automatic layout',
  args: { data: autoLayout, width: '100%', height: '720px' },
};

export const Narrow: Story = {
  name: 'Narrow',
  args: { width: '420px', height: '560px' },
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  args: { width: '100%', height: '640px' },
  render: (args) => html`
    <div style="width:${args.width};height:${args.height};">
      <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
    </div>
  `,
};
