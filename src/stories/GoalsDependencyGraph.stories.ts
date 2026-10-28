import { html } from 'lit';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/goals-dependency-graph/index.js';
import '../components/chart-renderer/index.js';
import defaultFixture from './fixtures/goals-dependency-graph.default.json';

type GoalsDependencyGraphArgs = {
  data: unknown;
  width: string;
  height: string;
  problemsOnly: boolean;
};

/** Three goals, no row given: the groups line up in the order the goals name them. */
const fewerGoals = {
  chartType: 'goalsDependencyGraph',
  name: 'Claims operations',
  goals: [
    {
      code: 'G-101',
      name: 'Claims Triage',
      status: 'at risk',
      agents: { total: 640, healthy: 588, idle: 12, blocked: 31, failed: 9 },
      progress: 0.62,
      multiplier: 1.8,
      resourceGroups: [
        { name: 'Scoring model', kind: 'model', state: 'failed', held: 9, calls: 5200, cause: 'scoring model timeout', since: '6m', owner: 'ML on-call' },
        { name: 'Case queue', kind: 'queue', state: 'blocked', held: 31, calls: 1400, cause: 'adjuster approval required', rule: 'R-112', owner: 'Claims desk' },
        { name: 'Policy engine', kind: 'policy', state: 'healthy', calls: 2600 },
      ],
    },
    {
      code: 'G-102',
      name: 'Fraud Review',
      status: 'on track',
      agents: { total: 280, healthy: 272, idle: 8 },
      progress: 0.84,
      resourceGroups: [
        { name: 'Scoring model', kind: 'model', state: 'degraded', calls: 3100, detail: 'p95 latency above threshold' },
        { name: 'Fraud bureau API', kind: 'api', state: 'healthy', calls: 900 },
      ],
    },
    {
      code: 'G-103',
      name: 'Payout Reconciliation',
      status: 'on track',
      agents: { total: 120, healthy: 117, idle: 3 },
      progress: 0.93,
      resourceGroups: [
        { name: 'Policy engine', kind: 'policy', state: 'healthy', calls: 700 },
        { name: 'Ledger', kind: 'store', state: 'healthy', calls: 420 },
      ],
    },
  ],
};

/** On the docs page a frame wider than the column scrolls across in it rather than being cut off. */
const inColumn = (context: StoryContext, story: unknown) =>
  context.viewMode === 'docs' ? html`<div style="max-width: 100%; overflow-x: auto">${story}</div>` : story;

/** On the docs page the story's block is as tall as its frame, so the graph — and its legend — is not cut off at the bottom, with what the story shows. */
const inDocs = (height: string, story?: string) => ({ docs: { story: { height }, ...(story ? { description: { story } } : {}) } });

const frame = (args: GoalsDependencyGraphArgs, context: StoryContext) =>
  inColumn(
    context,
    html`
      <div style="width:${args.width};height:${args.height};">
        <ui9000-goals-dependency-graph ?problems-only=${args.problemsOnly} data=${JSON.stringify(args.data)}></ui9000-goals-dependency-graph>
      </div>
    `,
  );

const meta: Meta<GoalsDependencyGraphArgs> = {
  title: 'Graph/Goals dependencies',
  component: 'ui9000-goals-dependency-graph',
  tags: ['autodocs'],
  parameters: {
    docs: {
      story: { height: '720px' },
      description: {
        component:
          'The Agent operations Graph view: every goal a tree rooted on a baseline, one tip an agent in its state’s mark, with a line rising from its root to each resource group it draws on, in the colour of the agents held there. The goal at the centre grows its full tree and has its worst line traced. Click a goal to bring it to the centre, a group or a line to trace it; drag to pan, scroll to zoom, double-click to reset. It takes the goals perimeter’s payload and follows the page’s light or dark theme (toolbar Light/Dark).',
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
type Story = StoryObj<GoalsDependencyGraphArgs>;

/** The six goals of the design: Onboarding Velocity, which holds the most agents, at the centre. */
export const Default: Story = { name: 'Default' };

export const OtherCentre: Story = {
  name: 'Another goal at the centre',
  args: { data: { ...defaultFixture, center: 'G-061' } },
  parameters: inDocs(
    '720px',
    'With `center` set to `G-061`, Model Drift Watch grows its full tree in the middle; it draws on the model group alone, and nothing of it is held, so no line is traced.',
  ),
};

export const ProblemsOnly: Story = {
  name: 'Problems only',
  args: { problemsOnly: true },
  parameters: inDocs(
    '720px',
    'With `problems-only` set, only what is held stands out: the agents at work all but go out, and a goal with none of its agents held steps back, as do the lines and groups where traffic flows.',
  ),
};

export const FewerGoals: Story = {
  name: 'Fewer goals',
  args: { data: fewerGoals, height: '640px' },
  parameters: inDocs('640px', 'Three goals and the groups they name, lined up in the order the goals name them.'),
};

/** A smaller graph: the labels off the centre keep to their heads, and show their line under the pointer. */
export const Compact: Story = {
  name: 'Compact',
  args: { width: '960px', height: '600px' },
  parameters: inDocs('600px'),
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  args: { height: '640px' },
  parameters: inDocs(
    '640px',
    'The default payload passed to `<ui9000-chart-renderer>`, which picks this chart from its `chartType: "goalsDependencyGraph"`.',
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
