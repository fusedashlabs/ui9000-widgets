import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/box-plot-chart/index.js';
import type { BoxPlotOrientation } from '../components/box-plot-chart/lib/types.js';
import groupedFixture from './fixtures/boxplot.fusedash.json';
import singleFixture from './fixtures/boxplot-single.fusedash.json';

type BoxPlotArgs = {
  data: unknown;
  orientation: BoxPlotOrientation;
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<BoxPlotArgs> = {
  title: 'Charts/BoxPlotChart',
  component: 'ui9000-box-plot-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `boxplotChart` — Single (no groupBy) and Grouped (groupBy), each Horizontal or Vertical. Visual parity with client HorizontalBoxPlotChart / VerticalBoxPlotChart.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal'],
    },
  },
  args: {
    data: groupedFixture,
    orientation: 'horizontal',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-box-plot-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        orientation=${args.orientation}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-box-plot-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<BoxPlotArgs>;

/** No groupBy — one box per weekday (delivery hours). */
export const Single: Story = {
  name: 'Single',
  args: {
    data: singleFixture,
    orientation: 'horizontal',
    showLegend: false,
    yLabel: 'Hours',
  },
};

/** Client `DEFAULT_BOXPLOT` — year × crop groups. */
export const Grouped: Story = {
  name: 'Grouped',
  args: {
    data: groupedFixture,
    orientation: 'horizontal',
  },
};

export const Horizontal: Story = {
  name: 'Horizontal',
  args: { orientation: 'horizontal' },
};

export const Vertical: Story = {
  name: 'Vertical',
  args: { orientation: 'vertical' },
};
