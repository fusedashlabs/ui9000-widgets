import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/matrix-chart/index.js';
import fusedashFixture from './fixtures/matrix.fusedash.json';

type MatrixArgs = {
  data: unknown;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<MatrixArgs> = {
  title: 'Two-way magnitude/Matrix',
  component: 'ui9000-matrix-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `matrixChart` — sequential-palette cell grid (DEFAULT_MATRIX).',
      },
    },
  },
  args: {
    data: fusedashFixture,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:560px;background:#fff;">
      <ui9000-matrix-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-matrix-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<MatrixArgs>;

export const Default: Story = {
  name: 'Default',
};

/** Seven rows or fewer keep the column header inside the plot, no scrolling. */
export const CompactGrid: Story = {
  name: 'Compact grid (inline header)',
  args: {
    data: {
      chartType: 'matrixChart',
      name: 'Weekly Orders by Channel',
      xAxe: ['day'],
      yAxe: ['orders'],
      groupBy: ['channel'],
      uniqueValues: {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        channel: ['Web', 'Mobile', 'Retail'],
      },
      data: [
        { day: 'Mon', channel: 'Web', orders: 120 },
        { day: 'Mon', channel: 'Mobile', orders: 80 },
        { day: 'Tue', channel: 'Web', orders: 210 },
        { day: 'Tue', channel: 'Retail', orders: 45 },
        { day: 'Wed', channel: 'Mobile', orders: 160 },
        { day: 'Thu', channel: 'Web', orders: 320 },
        { day: 'Fri', channel: 'Retail', orders: 95 },
      ],
    },
  },
};
