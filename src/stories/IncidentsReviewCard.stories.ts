import { html } from 'lit';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/incidents-review-card/index.js';
import '../components/chart-renderer/index.js';
import figmaFixture from './fixtures/incidents-review.figma.json';

type Appearance = 'light' | 'dark';

type IncidentsReviewArgs = {
  data: unknown;
  width: number;
};

/** Same layout, four states, scoped by site instead of distance. */
const fourStates = {
  chartType: 'incidentsReviewCard',
  title: 'Incidents review',
  filter: { label: 'Site North-07', kind: 'site' },
  counts: [
    { label: 'New', value: 14, tone: 'amber' },
    { label: 'Active', value: 89, tone: 'green' },
    { label: 'In progress', value: 46, tone: 'red' },
    { label: 'Resolved', value: 31, tone: 'blue' },
  ],
  total: 180,
  track: true,
};

/** Done-when case: no filter, the title stands alone. */
const noFilter = { ...figmaFixture, filter: null };

/** Done-when case: no lifecycle, the numbers remain. */
const noTrack = { ...figmaFixture, track: false };

/** The Storybook toolbar's Light/Dark switch drives the card's appearance. */
function appearanceOf(context: StoryContext): Appearance {
  return context.globals.theme === 'dark' ? 'dark' : 'light';
}

const frame = (args: IncidentsReviewArgs, context: StoryContext) => html`
  <div style="width:${args.width}px;">
    <ui9000-incidents-review-card
      .theme=${appearanceOf(context)}
      data=${JSON.stringify(args.data)}
    ></ui9000-incidents-review-card>
  </div>
`;

const meta: Meta<IncidentsReviewArgs> = {
  title: 'Widgets/Incidents review card',
  component: 'ui9000-incidents-review-card',
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'white' },
    docs: {
      description: {
        component:
          'Optivion incidents summary. A title, an optional filter, aggregated counts by state and a total. The counts are headlines: they need not sum to the total. The lifecycle track sits under the numbers: one segment per state, sized by its count, and grey ticks under the total. It shows only when incidents have a lifecycle. Two to six states use the same layout.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'number' },
  },
  args: { data: figmaFixture, width: 322 },
  render: frame,
};

export default meta;
type Story = StoryObj<IncidentsReviewArgs>;

export const TwoStates: Story = { name: 'Two states (Figma)' };

export const FourStates: Story = { name: 'Four states', args: { data: fourStates, width: 420 } };

export const NoFilter: Story = { name: 'No filter', args: { data: noFilter } };

export const NoTrack: Story = { name: 'No track', args: { data: noTrack } };

export const Narrow: Story = { name: 'Narrow', args: { data: fourStates, width: 270 } };

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  render: (args, context) => html`
    <div style="width:${args.width}px;height:160px;--ui9000-mode:${appearanceOf(context)};">
      <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
    </div>
  `,
};
