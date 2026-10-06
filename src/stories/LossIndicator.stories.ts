import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/loss-indicator/index.js';
import electricalLoss from './fixtures/loss-indicator.mock.json';

type LossArgs = {
  data: unknown;
  width: number;
  height: number;
};

const signalDegradation = {
  chartType: 'lossIndicator',
  name: 'Signal Degradation',
  yAxe: ['signalDegradation'],
  data: [{ signalDegradation: 8.4, trend: 'up', ticks: [0, 5, 10, 15, 20] }],
  axisDetails: {
    signalDegradation: {
      label: 'Signal Degradation',
      type: 'number',
      subtype: 'percent',
      measure_unit: '%',
    },
  },
  limitsDomains: [[0, 20]],
  domainsLimits: [
    { values: [0, 6], color: '#3ad07c', orientation: 'horizontal' as const },
    { values: [6, 12], color: '#f5c451', orientation: 'horizontal' as const },
    { values: [12, 20], color: '#ef3b4a', orientation: 'horizontal' as const },
  ],
};

function withoutTrend<T extends { data?: Array<Record<string, unknown>> }>(source: T): T {
  return {
    ...source,
    data: (source.data ?? []).map((row) => {
      const { trend: _trend, ...rest } = row;
      return rest;
    }),
  };
}

const frame = (args: LossArgs) => html`
  <div style="width:${args.width}px;height:${args.height}px;">
    <ui9000-loss-indicator
      style="display:block;width:100%;height:100%;"
      data=${JSON.stringify(args.data)}
    ></ui9000-loss-indicator>
  </div>
`;

const meta: Meta<LossArgs> = {
  title: 'Headline/Loss indicator',
  component: 'ui9000-loss-indicator',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'One metric on a threshold scale. The marker sits on the current value. Ticks after it stay grey. The trend arrow is omitted when there is no comparison.',
      },
    },
  },
  argTypes: {
    data: { control: 'object' },
    width: { control: 'number' },
    height: { control: 'number' },
  },
  args: {
    data: electricalLoss,
    width: 446,
    height: 240,
  },
  render: (args) => frame(args),
};

export default meta;
type Story = StoryObj<LossArgs>;

export const ElectricalLoss: Story = {
  name: 'Electrical Loss',
  args: { data: electricalLoss, width: 446, height: 240 },
};

export const NoTrend: Story = {
  name: 'No trend',
  args: {
    data: withoutTrend(electricalLoss),
    width: 446,
    height: 240,
  },
};

export const SignalDegradation: Story = {
  name: 'Signal Degradation',
  args: { data: signalDegradation, width: 446, height: 240 },
};
