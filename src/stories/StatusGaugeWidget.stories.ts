import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/status-gauge-widget/index.js';
import antennaFixture from './fixtures/status-gauge.mock.json';
import manyFixture from './fixtures/status-gauge-many.mock.json';

type StatusGaugeArgs = {
  data: unknown;
  width: number;
  height: number;
};

const frame = (args: StatusGaugeArgs) => html`
  <div style="width:${args.width}px;height:${args.height}px;">
    <ui9000-status-gauge-widget
      style="display:block;width:100%;height:100%;"
      data=${JSON.stringify(args.data)}
    ></ui9000-status-gauge-widget>
  </div>
`;

const meta: Meta<StatusGaugeArgs> = {
  title: 'Headline/Status gauge',
  component: 'ui9000-status-gauge-widget',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'One gauge plus metric cards. Card chrome follows the host theme tokens, the same switch as the other charts. The dial stays a fixed health spectrum.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'number' },
    height: { control: 'number' },
  },
  args: {
    data: antennaFixture,
    width: 380,
    height: 640,
  },
  render: (args) => frame(args),
};

export default meta;
type Story = StoryObj<StatusGaugeArgs>;

export const Antenna: Story = {
  name: 'Antenna',
  args: { data: antennaFixture, width: 380, height: 640 },
};

export const SixCards: Story = {
  name: 'Six cards',
  args: { data: manyFixture, width: 380, height: 640 },
};

export const Narrow: Story = {
  name: 'Narrow (one column)',
  args: { data: antennaFixture, width: 260, height: 720 },
};
