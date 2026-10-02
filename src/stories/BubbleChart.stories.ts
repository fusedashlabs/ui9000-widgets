import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/bubble-chart/index.js';
import singleFixture from './fixtures/bubble.fusedash.json';
import groupedFixture from './fixtures/bubble-grouped.fusedash.json';

type BubbleChartArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<BubbleChartArgs> = {
  title: 'Two measures/Bubble',
  component: 'ui9000-bubble-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `bubbleChart` — Single (no groupBy) and Grouped (groupBy). Numeric X/Y with abs(y) bubble size.',
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
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-bubble-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-bubble-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<BubbleChartArgs>;

/** Client `DEFAULT_BUBBLE` — income vs outcome, no groupBy. */
export const Single: Story = {
  name: 'Single',
  args: { data: singleFixture, showLegend: false },
};

/** Quantity vs price, colored by market segment. */
export const Grouped: Story = {
  name: 'Grouped',
  args: { data: groupedFixture, showLegend: true },
};
