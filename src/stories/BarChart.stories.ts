import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/bar-chart/index.js';
import type { BarLayout, BarOrientation } from '../components/bar-chart/lib/types.js';
import fusedashFixture from './fixtures/bar.fusedash.json';
import groupedFusedashFixture from './fixtures/bar-grouped.fusedash.json';
import { BAR_FIXTURE_DIVERGENT } from '../components/bar-chart/tests/fixtures.js';

type BarArgs = {
  data: unknown;
  orientation: BarOrientation;
  layout: BarLayout;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  cumulativeLine: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<BarArgs> = {
  title: 'Comparison/Bar',
  component: 'ui9000-bar-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `barChart` — vertical / horizontal × plain / grouped / stacked. Default story uses the FuseDash mock.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal'],
    },
    layout: {
      control: 'select',
      options: ['grouped', 'stacked'],
      description: 'Multi-series only — one series always renders as a plain bar chart',
    },
    scale: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
    cumulativeLine: {
      description: 'Running-total overlay. Vertical single-series only.',
    },
  },
  args: {
    data: fusedashFixture,
    orientation: 'vertical',
    layout: 'grouped',
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    cumulativeLine: false,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-bar-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        orientation=${args.orientation}
        layout=${args.layout}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        ?cumulative-line=${args.cumulativeLine}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-bar-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<BarArgs>;

export const Default: Story = {
  args: { yLabel: 'Count' },
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const Grouped: Story = {
  args: { data: groupedFusedashFixture, orientation: 'horizontal' },
};

export const Stacked: Story = {
  args: {
    data: { ...groupedFusedashFixture, stacked: true },
    orientation: 'horizontal',
    layout: 'stacked',
  },
};

export const HorizontalGrouped: Story = {
  args: { data: groupedFusedashFixture, orientation: 'horizontal' },
};

export const HorizontalStacked: Story = {
  args: {
    data: { ...groupedFusedashFixture, stacked: true },
    orientation: 'horizontal',
    layout: 'stacked',
  },
};

export const Divergent: Story = {
  name: 'Positive and negative values',
  args: { data: BAR_FIXTURE_DIVERGENT, yLabel: 'Net change' },
};

export const CumulativeLine: Story = {
  args: { data: fusedashFixture, cumulativeLine: true, yLabel: 'Count' },
};
