import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/radial-bar-chart/index.js';
import fusedashFixture from './fixtures/radial-bar.fusedash.json';

type RadialBarChartArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<RadialBarChartArgs> = {
  title: 'Charts/RadialBarChart',
  component: 'ui9000-radial-bar-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `radialBarChart` — one ring per category over a 270° sweep, innermost ring last in `uniqueValues` order.',
      },
    },
  },
  argTypes: {
    scale: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
  },
  args: {
    data: fusedashFixture,
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:520px;background:#fff;">
      <ui9000-radial-bar-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-radial-bar-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<RadialBarChartArgs>;

export const Default: Story = {};

export const WithNegativeValues: Story = {
  args: {
    data: [
      { label: 'Refunds', value: -420 },
      { label: 'Fees', value: -110 },
      { label: 'Deposits', value: 780 },
      { label: 'Transfers', value: 1240 },
    ],
  },
};

export const Empty: Story = {
  args: { data: [] },
};
