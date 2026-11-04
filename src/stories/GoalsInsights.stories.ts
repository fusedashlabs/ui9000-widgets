import { html } from 'lit';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/goals-insights/index.js';
import '../components/chart-renderer/index.js';
import defaultFixture from './fixtures/goals-insights.default.json';

type GoalsInsightsArgs = {
  data: unknown;
  width: string;
  height: string;
  flat: boolean;
  problemsOnly: boolean;
};

/** Incident Response's column, with the one goal of the payload it shares evidence with beside it. */
const incidentResponse = {
  ...defaultFixture,
  title: 'Incident Response',
  goal: defaultFixture.connected[1],
  connected: [defaultFixture.goal],
  claims: defaultFixture.claims.filter((c) => c.goal === 'G-052' || c.goal === 'G-014'),
};

/** The goal alone: no connected goals, no `connected` list, and claims that name no other goal. */
const alone = {
  chartType: 'goalsInsights',
  goal: defaultFixture.goal,
  claims: defaultFixture.claims.filter((c) => c.goal === 'G-014').map(({ also: _also, ...c }) => c),
};

/** On the docs page a frame wider than the column scrolls across in it rather than being cut off. */
const inColumn = (context: StoryContext, story: unknown) =>
  context.viewMode === 'docs' ? html`<div style="max-width: 100%; overflow-x: auto">${story}</div>` : story;

/** On the docs page the story's block is as tall as its frame, so the column is not cut off at the bottom, with what the story shows. */
const inDocs = (height: string, story?: string) => ({ docs: { story: { height }, ...(story ? { description: { story } } : {}) } });

const frame = (args: GoalsInsightsArgs, context: StoryContext) =>
  inColumn(
    context,
    html`
      <div style="width:${args.width};height:${args.height};">
        <ui9000-goals-insights ?flat=${args.flat} ?problems-only=${args.problemsOnly} data=${JSON.stringify(args.data)}></ui9000-goals-insights>
      </div>
    `,
  );

const meta: Meta<GoalsInsightsArgs> = {
  title: 'Graph/Goals & insights',
  component: 'ui9000-goals-insights',
  tags: ['autodocs'],
  parameters: {
    docs: {
      story: { height: '760px' },
      description: {
        component:
          'Goals & insights, after the Agent operations design: the evidence behind one goal, drawn as a column. The goal stands over the apex with its agents in a glass sphere and its confidence lit on the ring; under it a ring every two hours, now at the top. Each claim its agents filed is a diamond on the ring of the hour it was filed — in ink when it supports the goal, grey on a single source, yellow when disputed, orange when it argues against it. The goals it shares evidence with stand either side, and claims with three or more sources run up to the goal they were filed under. It turns slowly on its own; drag to turn it and open or close its rings, scroll to zoom, double-click to reset, click a claim or a connected goal to pick it out. It follows the page’s light or dark theme (toolbar Light/Dark).',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'text' },
    height: { control: 'text' },
    flat: { control: 'boolean' },
    problemsOnly: { control: 'boolean' },
  },
  args: { data: defaultFixture, width: '100%', height: '760px', flat: false, problemsOnly: false },
  render: frame,
};

export default meta;
type Story = StoryObj<GoalsInsightsArgs>;

/** Perimeter Watch, with the two goals it shares evidence with, fitted to the panel like every other story. */
export const Default: Story = { name: 'Default' };

export const ProblemsOnly: Story = {
  name: 'Problems only',
  args: { problemsOnly: true },
  parameters: inDocs('760px', 'With `problems-only` set, only the claims that argue against the goal or are disputed stand out; the rest, and their lines, all but go out.'),
};

export const Flat: Story = {
  name: 'Flat',
  args: { flat: true },
  parameters: inDocs('760px', 'With `flat` set, every ring is laid flat and the column does not turn.'),
};

/** The column fills the visible canvas (less the canvas padding); the connected goals stand further out with room for their readouts. */
export const Spacious: Story = {
  name: 'Spacious',
  args: { width: 'calc(100vw - 2rem)', height: 'calc(100vh - 2rem)' },
  parameters: { docs: { story: { inline: false, height: '860px' } } },
};

/** A smaller card: the connected goals keep to their names, without their readouts. */
export const Compact: Story = {
  name: 'Compact',
  args: { width: '860px', height: '600px' },
  parameters: inDocs('600px'),
};

/** Too narrow for labels beside the connected goals: they fold away, and every mark still explains itself under the pointer. */
export const Narrow: Story = {
  name: 'Narrow',
  args: { width: '440px', height: '560px' },
  parameters: inDocs('560px'),
};

export const OneConnected: Story = {
  name: 'One connected goal',
  args: { data: incidentResponse },
  parameters: inDocs('760px', 'Incident Response, with Perimeter Watch the one goal in the payload it shares evidence with: one goal stands beside it, on the left.'),
};

export const Alone: Story = {
  name: 'Without connected goals',
  args: { data: alone },
  parameters: inDocs('760px', 'No `connected` list and no claim that names another goal: the column stands alone under its goal.'),
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  args: { width: '100%', height: '680px' },
  parameters: inDocs('680px', 'The default payload passed to `<ui9000-chart-renderer>`, which picks this chart from its `chartType: "goalsInsights"`.'),
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
