import { html } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/asset-health-overview/index.js';
import '../components/chart-renderer/index.js';
import goalRings from './fixtures/asset-health.goal-rings.json';

type Appearance = 'light' | 'dark';

type Args = {
  data: unknown;
  width: string;
  height: string;
  flat: boolean;
  problemsOnly: boolean;
};

/** The Storybook toolbar's Light/Dark switch drives the chart's appearance. */
function appearanceOf(context: StoryContext): Appearance {
  return context.globals.theme === 'dark' ? 'dark' : 'light';
}

/** The size the stories fill the canvas at. */
const FILL = { width: 'calc(100vw - 2rem)', height: 'calc(100vh - 2rem)' };
/** On the docs page a story that fills the canvas fills the docs column instead, at a height its labels have room in. */
const DOCS_FILL = { width: '100%', height: '640px' };

function frameStyle(args: Args, context: StoryContext): Record<string, string> {
  const appearance = appearanceOf(context);
  const docs = context.viewMode === 'docs';
  return {
    width: docs && args.width === FILL.width ? DOCS_FILL.width : args.width,
    height: docs && args.height === FILL.height ? DOCS_FILL.height : args.height,
    boxSizing: 'border-box',
    background: appearance === 'dark' ? '#000000' : '#f3f4f6',
    padding: '12px',
  };
}

/** Every agent at work, nothing held: the gates all white, the walls without colour. */
const allFlowing = {
  ...goalRings,
  goal: { ...goalRings.goal, awaiting: 0, blocked: 0, failed: 0, overBudget: 0, working: 820, status: 'on track', progress: 0.78 },
  categories: goalRings.categories.map(({ hold: _hold, problems: _problems, ...category }) => ({
    ...category,
    traffic: { flowing: 1 },
    day: category.day.map((bin) => ({ ...bin, away: 0 })),
  })),
};

/** FuseDash WidgetItem: one row per category, the goal's agent columns on a row, no 24-hour day. */
const widgetItem = {
  chartType: 'assetHealthOverview',
  name: 'Onboarding Velocity',
  data: [
    { category: 'Applications', total: 12, agents: 842, awaiting: 33, blocked: 94, failed: 27, calls: 3300 },
    { category: 'Databases', total: 9, calls: 5400, problems: [{ name: 'crm-prod', why: 'writes blocked by R-047', sev: 'blocked', agents: 94 }] },
    { category: 'Tools', total: 24, calls: 1800, problems: [{ name: 'browser runner', why: 'crash-loops on cold start', sev: 'failed', agents: 27 }] },
    { category: 'AI models', total: 6, calls: 6200, problems: [{ name: 'sonnet v4.2', why: 'p95 2.1s over 1.2s', sev: 'awaiting', agents: 33 }] },
    { category: 'People', total: 5, calls: 14, problems: [{ name: 'Security on-call', why: 'owes a credential grant', sev: 'degraded' }] },
  ],
};

/** On the docs page a frame wider than the column scrolls across in it rather than being cut off. */
const inColumn = (context: StoryContext, story: unknown) =>
  context.viewMode === 'docs' ? html`<div style="max-width: 100%; overflow-x: auto">${story}</div>` : story;

const frame = (args: Args, context: StoryContext) =>
  inColumn(
    context,
    html`
      <div style=${styleMap(frameStyle(args, context))}>
        <ui9000-asset-health-overview
          theme=${appearanceOf(context)}
          ?flat=${args.flat}
          ?problems-only=${args.problemsOnly}
          data=${JSON.stringify(args.data)}
        ></ui9000-asset-health-overview>
      </div>
    `,
  );

const meta: Meta<Args> = {
  title: 'Widgets/Asset health overview',
  component: 'ui9000-asset-health-overview',
  tags: ['autodocs'],
  parameters: {
    docs: {
      // on the page itself, as the other charts are, so it follows the toolbar's Light/Dark: a frame of its own would not
      story: { height: `${DOCS_FILL.height}` },
      description: {
        component:
          'AM-6 Asset Health Overview, after the Agent operations design’s goal rings: one goal opened as an arena. Agents sit in rows in the section of the asset category their work is with, the held ones against its gate; behind it stand the category’s assets, a cell each, and the wall of its last 24 hours. Drag to turn, scroll to zoom, shift-drag to pan, double-click to reset, click a section to pick it out. `theme` switches light/dark (toolbar Light/Dark).',
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
  // the arena fills the visible canvas (less its padding), where its labels have room for their readouts
  args: { data: goalRings, ...FILL, flat: false, problemsOnly: false },
  render: frame,
};

export default meta;
type Story = StoryObj<Args>;

export const GoalRings: Story = { name: 'Goal rings' };

/**
 * Whole labels need a chart 1,082px wide: two labels, their pads and leaders
 * (2 × 293) beside the tilted arena at 1.12 × its 442. The frame's padding and
 * the card's border take 58px more. A pixel narrower and they keep to their heads.
 */
export const MinWidthForSubLabels: Story = {
  name: 'Min-width for sub-labels',
  // tall enough for whole labels whatever the canvas, as on the docs page
  args: { width: '1140px', height: DOCS_FILL.height },
  parameters: {
    docs: {
      description: {
        story:
          'The narrowest the chart can be and still show every label in full, with its readout and problem rows: 1,140px. Any narrower and the labels shrink to their heads. It is wider than this page, so scroll it sideways to see the labels on the right.',
      },
    },
  },
};

export const Plan: Story = {
  name: 'Plan view',
  args: { flat: true },
};

export const ProblemsOnly: Story = {
  name: 'Problems only',
  args: { problemsOnly: true },
  parameters: {
    docs: {
      description: {
        story:
          'With `problems-only` set, only what is wrong stands out: the agents at work fade almost away and the sections where all traffic flows step back. The held agents, the lit assets and their beams stay at full strength.',
      },
    },
  },
};

export const AllFlowing: Story = {
  name: 'All flowing',
  args: { data: allFlowing },
  parameters: {
    docs: {
      description: {
        story:
          'The same goal with nothing held: every agent at work, every gate white and the walls without colour. This is how a healthy goal reads.',
      },
    },
  },
};

export const WidgetItemRows: Story = {
  name: 'WidgetItem data rows',
  args: { data: widgetItem },
  parameters: {
    docs: {
      description: {
        story:
          'A FuseDash WidgetItem payload: one row per category in `data`, with the goal’s agent counts on a row instead of a `goal` object. Each category’s agents are shared out by its calls, and with no 24-hour day sent the walls stand empty.',
      },
    },
  },
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  parameters: {
    docs: {
      description: {
        story:
          'The goal rings payload passed to `<ui9000-chart-renderer>`, which picks this chart from its `chartType: "assetHealthOverview"`.',
      },
    },
  },
  render: (args, context) => html`
    <div style=${styleMap(frameStyle(args, context))}>
      <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
    </div>
  `,
};

/**
 * The panel every chart story is shown in, at the chart's own height — the
 * size of a card, whatever the screen. Under ~1,080px the labels keep to their
 * heads and show their readout under the pointer; the other stories fill the
 * canvas, so only on a wide screen do they show the full labels.
 */
export const CardSize: Story = {
  name: 'Card size',
  args: { width: '100%', height: 'auto' },
  parameters: {
    docs: {
      story: { height: '444px' },
      description: { story: 'The size of a card: under ~1,080px wide the labels keep to their heads and show their readout on hover.' },
    },
  },
};
