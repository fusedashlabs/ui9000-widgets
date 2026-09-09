import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/scatter-sparkline-chart/index.js';
import scatterSparklineFixture from './fixtures/scatter-sparkline.fusedash.json';

type ScatterSparkArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<ScatterSparkArgs> = {
  title: 'Charts/ScatterSparklineChart',
  component: 'ui9000-scatter-sparkline-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash ScatterSparklineChart (`scatterSparklineChart`) — daily average line with jittered price markers.',
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
    data: scatterSparklineFixture,
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-scatter-sparkline-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-scatter-sparkline-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<ScatterSparkArgs>;

/** Client `DEFAULT_SCATTER_SPARKLINE_CHART` — average price line + scatter points. */
export const Default: Story = {
  name: 'FuseDash mock',
  args: { data: scatterSparklineFixture },
};
