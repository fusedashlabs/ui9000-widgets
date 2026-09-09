import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/area-grouped-bar-chart/index.js';
import fusedashFixture from './fixtures/area-grouped-bar.fusedash.json';

type AreaGroupedBarChartArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<AreaGroupedBarChartArgs> = {
  title: 'Charts/AreaGroupedBarChart',
  component: 'ui9000-area-grouped-bar-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `areaGroupedBarChart` — grouped bars + area/line (yAxe[0] line, yAxe[1] bars).',
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
    showGrid: true,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-area-grouped-bar-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-area-grouped-bar-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<AreaGroupedBarChartArgs>;

export const Default: Story = {};
