import { html } from 'lit';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/power-path-card/index.js';
import '../components/chart-renderer/index.js';
import figmaFixture from './fixtures/power-path.figma.json';

type Appearance = 'light' | 'dark';

type PowerPathArgs = {
  data: unknown;
  width: number;
};

const withoutFault = { ...figmaFixture, fault: null };

const withoutPoints = {
  ...figmaFixture,
  health: { ...figmaFixture.health, points: [] },
};

/** Another equipment type: no health score, status only where thresholds exist. */
const rectifierThresholds = {
  chartType: 'powerPathCard',
  name: 'Rectifier Shelf B',
  badge: 'RECT-B-02',
  data: [
    { label: 'DC Bus Voltage', value: 53.2, unit: 'V', thresholds: { warning: 51, critical: 49, direction: 'below' } },
    { label: 'Load Current', value: 41.8, unit: 'A', thresholds: { warning: 40, critical: 48 } },
    { label: 'Battery Temperature', value: 29, unit: '°C', thresholds: { warning: 35, critical: 45 } },
    { label: 'Module Count', value: 6 },
  ],
};

/** The Storybook toolbar's Light/Dark switch drives the card's appearance. */
function appearanceOf(context: StoryContext): Appearance {
  return context.globals.theme === 'dark' ? 'dark' : 'light';
}

const frame = (args: PowerPathArgs, context: StoryContext) => html`
  <div style="width:${args.width}px;">
    <ui9000-power-path-card
      .theme=${appearanceOf(context)}
      data=${JSON.stringify(args.data)}
    ></ui9000-power-path-card>
  </div>
`;

const meta: Meta<PowerPathArgs> = {
  title: 'Widgets/Power path card',
  component: 'ui9000-power-path-card',
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'white' },
    docs: {
      description: {
        component:
          'Optivion power-path card (Figma 34:23675). The health score and its compact line appear only when the payload carries a score; the fault banner only for an active fault; a row status only when the metric has a level, status or thresholds.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'number' },
  },
  args: { data: figmaFixture, width: 391 },
  render: frame,
};

export default meta;
type Story = StoryObj<PowerPathArgs>;

export const Fault: Story = { name: 'Fault' };

export const NoFault: Story = { name: 'No active fault', args: { data: withoutFault } };

export const NoPoints: Story = { name: 'Score without points', args: { data: withoutPoints } };

export const Thresholds: Story = {
  name: 'Thresholds, no score',
  args: { data: rectifierThresholds },
};

export const Narrow: Story = { name: 'Narrow (line hidden)', args: { width: 290 } };

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  render: (args, context) => html`
    <div style="width:${args.width}px;height:360px;--ui9000-mode:${appearanceOf(context)};">
      <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
    </div>
  `,
};
