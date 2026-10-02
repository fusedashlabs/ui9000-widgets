import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/spark-area-chart/index.js';
import sparkFixture from './fixtures/spark-area.fusedash.json';

type SparkArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<SparkArgs> = {
  title: 'Ordered series/Spark area',
  component: 'ui9000-spark-area-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash SparkAreaChart (`sparkAreaChart`) — datetime x, multi-series weather income with filled area to y=0.',
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
    data: sparkFixture,
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-spark-area-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-spark-area-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<SparkArgs>;

/** Client `DEFAULT_SPARKAREA` — five weather series over seven days. */
export const Default: Story = {
  name: 'FuseDash mock',
  args: { data: sparkFixture },
};
