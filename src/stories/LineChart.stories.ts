import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/line-chart/index.js';
import singleFixture from './fixtures/line.fusedash.json';
import groupedFixture from './fixtures/line-grouped.fusedash.json';

type LineArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showPoints: boolean;
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<LineArgs> = {
  title: 'Comparison/Line',
  component: 'ui9000-line-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `lineChart` — Single (no groupBy) and Grouped (groupBy) only. Visual parity with client SingleLineChart / GroupedLineChart.',
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
    showPoints: true,
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-line-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        curve="linear"
        scale=${args.scale}
        ?show-points=${args.showPoints}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-line-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<LineArgs>;

/** Client `DEFAULT_LINE` — SingleLineChart (groupBy null). */
export const Single: Story = {
  name: 'Single',
  args: { data: singleFixture },
};

/** Client `DEFAULT_GROUPED_LINE` — GroupedLineChart. */
export const Grouped: Story = {
  name: 'Grouped',
  args: {
    data: groupedFixture,
    showLegend: true,
  },
};
