import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/pie-chart/index.js';
import fusedashFixture from './fixtures/pie.fusedash.json';

type PieChartArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<PieChartArgs> = {
  title: 'Part of a whole/Pie',
  component: 'ui9000-pie-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'FuseDash `pieChart` — full disc. Donut lives on `ui9000-donut-chart`.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    scale: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
  },
  args: {
    data: fusedashFixture,
    scale: 'default',
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-pie-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-pie-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<PieChartArgs>;

export const Default: Story = {};
