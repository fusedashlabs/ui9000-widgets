import { html } from 'lit';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/goals-perimeter/index.js';
import '../components/chart-renderer/index.js';
import defaultFixture from './fixtures/goals-perimeter.default.json';
import agentsFixture from './fixtures/goals-perimeter.agents.json';

type GoalsPerimeterArgs = {
  data: unknown;
  width: string;
  height: string;
  problemsOnly: boolean;
};

/** Same goals with no positions: the automatic layout places them. */
const autoLayout = {
  ...defaultFixture,
  goals: defaultFixture.goals.map(({ position: _position, ...goal }) => goal),
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

/** On the docs page a frame wider than the column scrolls across in it rather than being cut off. */
const inColumn = (context: StoryContext, story: unknown) =>
  context.viewMode === 'docs' ? html`<div style="max-width: 100%; overflow-x: auto">${story}</div>` : story;

/** On the docs page the story's block is as tall as its frame, so the board is not cut off at the bottom, with what the story shows. */
const inDocs = (height: string, story?: string) => ({ docs: { story: { height }, ...(story ? { description: { story } } : {}) } });

const frame = (args: GoalsPerimeterArgs, context: StoryContext) =>
  inColumn(
    context,
    html`
      <div style="width:${args.width};height:${args.height};">
        <ui9000-goals-perimeter ?problems-only=${args.problemsOnly} data=${JSON.stringify(args.data)}></ui9000-goals-perimeter>
      </div>
    `,
  );

const meta: Meta<GoalsPerimeterArgs> = {
  title: 'Graph/Goals perimeter',
  component: 'ui9000-goals-perimeter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      story: { height: '720px' },
      description: {
        component:
          'AM-2 Goals perimeter, after the Agent operations design: every live goal as a cloud of its agents, one point an agent. Each goal has a progress ring, an orbit of the resource groups it draws on, lines to the goals that share a group, and a callout with its code, status and name. Held agents, and the groups that hold them, take the colour of what holds them. Drag to turn, scroll to zoom, shift-drag to pan, double-click to reset. It follows the page’s light or dark theme (toolbar Light/Dark).',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'text' },
    height: { control: 'text' },
    problemsOnly: { control: 'boolean' },
  },
  args: { data: defaultFixture, width: '100%', height: '720px', problemsOnly: false },
  render: frame,
};

export default meta;
type Story = StoryObj<GoalsPerimeterArgs>;

/** The six goals of the design, fitted to the panel like every other story. */
export const Default: Story = { name: 'Default' };

export const ProblemsOnly: Story = {
  name: 'Problems only',
  args: { problemsOnly: true },
  parameters: inDocs(
    '720px',
    'With `problems-only` set, only what is held stands out: the agents at work all but go out, and a goal with none of its agents held steps back, as do the lines and groups where traffic flows.',
  ),
};

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
  parameters: inDocs('600px'),
};

export const AgentNodes: Story = {
  name: 'Agent nodes around one goal',
  args: { data: agentsFixture, width: '100%', height: '620px' },
  parameters: inDocs(
    '620px',
    'One goal drawn from a list of its agents rather than their counts: each agent is a point in the cloud, in the colour of its state, with the goal’s resource groups on its orbit.',
  ),
};

export const ExtraAgents: Story = {
  name: 'Extra agents',
  args: { data: extraAgents, width: '100%', height: '620px' },
  parameters: inDocs('620px', '2,400 agents around one goal: the cloud draws a sample of them, while the counts on the board stay exact.'),
};

export const AutoLayout: Story = {
  name: 'Automatic layout',
  args: { data: autoLayout, width: '100%', height: '720px' },
  parameters: inDocs('720px', 'The six goals of the design sent without positions: the board lays them out itself.'),
};

export const Narrow: Story = {
  name: 'Narrow',
  args: { width: '420px', height: '560px' },
  parameters: inDocs('560px'),
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  args: { width: '100%', height: '640px' },
  parameters: inDocs(
    '640px',
    'The default payload passed to `<ui9000-chart-renderer>`, which picks this chart from its `chartType: "goalsPerimeter"`.',
  ),
  render: (args, context) =>
    inColumn(
      context,
      html`
        <div style="width:${args.width};height:${args.height};">
          <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
        </div>
      `,
    ),
};
