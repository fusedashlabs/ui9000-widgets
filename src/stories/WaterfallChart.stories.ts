import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/waterfall-chart/index.js';
import type { WaterfallOrientation } from '../components/waterfall-chart/lib/types.js';
import fusedashFixture from './fixtures/waterfall.fusedash.json';

type WaterfallArgs = {
  data: unknown;
  orientation: WaterfallOrientation;
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<WaterfallArgs> = {
  title: 'Charts/WaterfallChart',
  component: 'ui9000-waterfall-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `waterfallChart` — Horizontal (default mock) and Vertical. Fixture rows are signed deltas with `isTotal`/`isPositive`/`isNegative`; normalize converts them to cumulative levels (`sourcePath: delta-flags`). Client paint colors `#938CFF` / `#FF8C47` / `#BDBCC8`.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  args: {
    data: fusedashFixture,
    orientation: 'horizontal',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-waterfall-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        orientation=${args.orientation}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-waterfall-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<WaterfallArgs>;

export const Horizontal: Story = {
  name: 'Horizontal',
  args: { orientation: 'horizontal' },
};

export const Vertical: Story = {
  name: 'Vertical',
  args: { orientation: 'vertical' },
};
