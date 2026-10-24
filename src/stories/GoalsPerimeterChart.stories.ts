import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/goals-perimeter/index.js';
import '../components/chart-renderer/index.js';
import defaultFixture from './fixtures/goals-perimeter.default.json';
import agentsFixture from './fixtures/goals-perimeter.agents.json';

type GoalsPerimeterArgs = {
  data: unknown;
  width: string;
  height: string;
};

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

const frame = (args: GoalsPerimeterArgs) => html`
  <div style="width:${args.width};height:${args.height};">
    <ui9000-goals-perimeter data=${JSON.stringify(args.data)}></ui9000-goals-perimeter>
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
          'Agents Management goals perimeter (AM-2), after the Agent operations design. The goals are clouds of their agents — one point an agent, white at work, grey idle, a periwinkle ring awaiting, an orange dot blocked, a red cross failed, an amber triangle degraded — drawn in WebGL with smoke, glass and bloom (a plain canvas where WebGL 2 is missing). Each goal has a progress ring on a tick scale, an orbit of the resource groups it draws on (a diamond empty when traffic flows, dotted when slowed, solid in the held agents’ colour with their count), links to the goals that share a group (in a held colour when the same trouble holds both ends) and a callout with its code, status and name, plus AGENTS / PROGRESS / BURN / HELD when the board is drawn at 90% of its design size or more. Drag to turn the board, shift-drag to pan, scroll to zoom, double-click to reset; the legend button sits at the bottom left. Hover any mark or control for its detail; the tip follows the pointer. Clicking a goal does nothing for now: it is a standalone chart. A free-form node–link graph stays network-graph. It fills the card and follows the page’s light or dark theme: by day the picture is laid down in ink on a pale room. Use the toolbar for light or dark. Its colours follow the page style like every other chart: SequentialColors1 lights the scene (glow, glass, healthy agents, hairlines, floor) and the secondary colour carries the traffic; held states keep their own hues.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  args: { data: defaultFixture, width: '100%', height: '720px' },
  render: frame,
};

export default meta;
type Story = StoryObj<GoalsPerimeterArgs>;

/** The six goals of the design, fitted to the panel like every other story. */
export const Default: Story = { name: 'Default' };

/**
 * Room for the design's full callouts: the board fills the visible canvas (less
 * the canvas padding) and is drawn at its design size or more once that is about
 * 1,250 × 640 or larger. In the docs it gets a frame of its own, as tall as the design.
 */
export const Spacious: Story = {
  name: 'Spacious (readouts)',
  args: { width: 'calc(100vw - 2rem)', height: 'calc(100vh - 2rem)' },
  parameters: { docs: { story: { inline: false, height: '820px' } } },
};

/** A smaller board: callouts keep to their heads, and show their readout under the pointer. */
export const Compact: Story = {
  name: 'Compact',
  args: { width: '960px', height: '600px' },
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
