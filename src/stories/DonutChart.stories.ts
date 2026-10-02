import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/donut-chart/index.js';
import fusedashFixture from './fixtures/donut.fusedash.json';

type DonutChartArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<DonutChartArgs> = {
  title: 'Part of a whole/Donut',
  component: 'ui9000-donut-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `donutChart` — pie slices with inner hole (30% thickness, min 25px).',
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
      <ui9000-donut-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-donut-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<DonutChartArgs>;

export const Default: Story = {};
