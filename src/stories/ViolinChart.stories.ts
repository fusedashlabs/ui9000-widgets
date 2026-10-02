import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/violin-chart/index.js';
import type { ViolinOrientation } from '../components/violin-chart/lib/types.js';
import fusedashFixture from './fixtures/violin.fusedash.json';

type ViolinArgs = {
  data: unknown;
  orientation: ViolinOrientation;
  showGrid: boolean;
  showLegend: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<ViolinArgs> = {
  title: 'Distribution/Violin',
  component: 'ui9000-violin-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `violinChart` — Horizontal and Vertical (client HorizontalViolinChart / VerticalViolinChart). KDE violin + box overlay; legend off.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    data: fusedashFixture,
    orientation: 'horizontal',
    showGrid: true,
    showLegend: false,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-violin-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        orientation=${args.orientation}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-violin-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<ViolinArgs>;

export const Horizontal: Story = {
  name: 'Horizontal',
  args: { orientation: 'horizontal' },
};

export const Vertical: Story = {
  name: 'Vertical',
  args: { orientation: 'vertical' },
};
