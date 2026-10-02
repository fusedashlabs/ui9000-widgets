import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/scatter-plot-chart/index.js';
import fusedashFixture from './fixtures/scatter.fusedash.json';

type ScatterPlotArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  showReferenceLine: boolean;
};

const meta: Meta<ScatterPlotArgs> = {
  title: 'Two measures/Scatter',
  component: 'ui9000-scatter-plot',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'FuseDash `scatterplotChart` — numeric X/Y with groupBy markers.',
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
    showReferenceLine: false,
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-scatter-plot
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        ?show-reference-line=${args.showReferenceLine}
      ></ui9000-scatter-plot>
    </div>
  `,
};

export default meta;
type Story = StoryObj<ScatterPlotArgs>;

export const Default: Story = {};

export const ReferenceLine: Story = {
  args: { showReferenceLine: true },
};
