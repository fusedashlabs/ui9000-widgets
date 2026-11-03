import { html } from 'lit';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/goal-burst/index.js';
import '../components/chart-renderer/index.js';
import defaultFixture from './fixtures/goal-burst.default.json';

type GoalBurstArgs = {
  data: unknown;
  width: string;
  height: string;
  flat: boolean;
  problemsOnly: boolean;
};

/** Every call answered, nothing held: the spikes all white, the labels all flowing. */
const allFlowing = {
  ...defaultFixture,
  goal: { ...defaultFixture.goal, awaiting: 0, blocked: 0, failed: 0, overBudget: 0, working: 820, status: 'on track', progress: 0.78 },
  categories: defaultFixture.categories.map(({ hold: _hold, problems: _problems, ...category }) => ({ ...category, traffic: { flowing: 1 } })),
};

/** The same goal with no fleet total and no kinds: the corner counts only the groups drawn, and each group's kind is read from its name. */
const bare = {
  chartType: 'goalBurst',
  goal: defaultFixture.goal,
  categories: defaultFixture.categories.map(({ kind: _kind, unit: _unit, unitOne: _unitOne, bytes: _bytes, sharedWith: _shared, ...category }) => category),
};

/** On the docs page a frame wider than the column scrolls across in it rather than being cut off. */
const inColumn = (context: StoryContext, story: unknown) =>
  context.viewMode === 'docs' ? html`<div style="max-width: 100%; overflow-x: auto">${story}</div>` : story;

/** On the docs page the story's block is as tall as its frame, so the burst is not cut off at the bottom, with what the story shows. */
const inDocs = (height: string, story?: string) => ({ docs: { story: { height }, ...(story ? { description: { story } } : {}) } });

const frame = (args: GoalBurstArgs, context: StoryContext) =>
  inColumn(
    context,
    html`
      <div style="width:${args.width};height:${args.height};">
        <ui9000-goal-burst ?flat=${args.flat} ?problems-only=${args.problemsOnly} data=${JSON.stringify(args.data)}></ui9000-goal-burst>
      </div>
    `,
  );

const meta: Meta<GoalBurstArgs> = {
  title: 'Graph/Goal burst',
  component: 'ui9000-goal-burst',
  tags: ['autodocs'],
  parameters: {
    docs: {
      story: { height: '720px' },
      description: {
        component:
          'Goal burst, after the Agent operations design: one goal drawn as its traffic. Its agents are a cloud in the middle with the progress ring round it; out of the cloud its calls are thrown as spikes into one sector per resource group it draws on — as long as each call took to be answered, on the dotted rings of the time scale, white where it got through, amber where it was throttled, and in the held agents’ colour where it did not get through, running on to the asset that stops it. An arc marks where 95% of a sector’s calls are answered; a band round it carries the group’s assets. It takes the asset health overview’s payload. Drag to turn, scroll to zoom, shift-drag to pan, double-click to reset, click a sector to pick it out. It follows the page’s light or dark theme (toolbar Light/Dark).',
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
  args: { data: defaultFixture, width: '100%', height: '720px', flat: false, problemsOnly: false },
  render: frame,
};

export default meta;
type Story = StoryObj<GoalBurstArgs>;

/** Onboarding Velocity and the five groups it draws on, fitted to the panel like every other story. */
export const Default: Story = { name: 'Default' };

export const ProblemsOnly: Story = {
  name: 'Problems only',
  args: { problemsOnly: true },
  parameters: inDocs(
    '720px',
    'With `problems-only` set, only what is held stands out: the agents at work and the calls that get through all but go out, and a sector where every call flows steps back.',
  ),
};

export const Flat: Story = {
  name: 'Plan',
  args: { flat: true },
  parameters: inDocs('720px', 'With `flat` set, the burst is seen from straight overhead, without turning: a drag pans it.'),
};

/**
 * Room for the labels' readouts: the burst fills the visible canvas (less the
 * canvas padding) and is drawn at its design size or more once that is about
 * 1,240 × 640 or larger. In the docs it gets a frame of its own.
 */
export const Spacious: Story = {
  name: 'Spacious (readouts)',
  args: { width: 'calc(100vw - 2rem)', height: 'calc(100vh - 2rem)' },
  parameters: { docs: { story: { inline: false, height: '820px' } } },
};

/** A smaller card: labels keep to their heads, and show their readout under the pointer. */
export const Compact: Story = {
  name: 'Compact',
  args: { width: '960px', height: '600px' },
  parameters: inDocs('600px'),
};

/** Too narrow for labels beside the burst: they fold away, and every mark still explains itself under the pointer. */
export const Narrow: Story = {
  name: 'Narrow',
  args: { width: '420px', height: '560px' },
  parameters: inDocs('560px'),
};

export const AllFlowing: Story = {
  name: 'Nothing held',
  args: { data: allFlowing },
  parameters: inDocs('720px', 'Every call answered and no agent held: the spikes are all white, and only the clock says how quickly each group answers.'),
};

export const Bare: Story = {
  name: 'Without kinds or a fleet total',
  args: { data: bare },
  parameters: inDocs(
    '720px',
    'No `kind` on the groups and no `resourceGroupTotal`: each group’s kind, and so its answer time and what its assets are called, is read from its name, and the corner counts only the groups drawn.',
  ),
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  args: { width: '100%', height: '640px' },
  parameters: inDocs('640px', 'The default payload passed to `<ui9000-chart-renderer>`, which picks this chart from its `chartType: "goalBurst"`.'),
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
