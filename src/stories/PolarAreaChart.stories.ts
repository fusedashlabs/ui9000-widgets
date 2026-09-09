import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/polar-area-chart/index.js';
import fusedashFixture from './fixtures/polar-area.fusedash.json';

/** Client PolarAreaChart ignores `groupBy` and aggregates — one wedge per category. */
const singleFixture = { ...fusedashFixture, groupBy: [] };

type PolarAreaChartArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<PolarAreaChartArgs> = {
  title: 'Charts/PolarAreaChart',
  component: 'ui9000-polar-area-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `polarAreaChart` — equal-angle wedges whose radius encodes the metric. Legend sits above the plot.',
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
    data: singleFixture,
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:520px;background:#fff;">
      <ui9000-polar-area-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        .showGrid=${args.showGrid}
        .showLegend=${args.showLegend}
        .showTooltip=${args.showTooltip}
      ></ui9000-polar-area-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<PolarAreaChartArgs>;

export const Default: Story = {};
