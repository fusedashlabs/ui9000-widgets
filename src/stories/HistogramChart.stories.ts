import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/histogram-chart/index.js';
import groupedFixture from './fixtures/histogram.fusedash.json';
import singleFixture from './fixtures/histogram-single.fusedash.json';
import satisfactionFixture from './fixtures/histogram-satisfaction.fusedash.json';

type HistogramArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<HistogramArgs> = {
  title: 'Distribution/Histogram',
  component: 'ui9000-histogram-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `histogramChart` — Single (no groupBy) and Grouped (uniqueValues / groupBy stacks). Visual parity with client HistogramChart.',
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
    data: groupedFixture,
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    xLabel: '',
    yLabel: 'Count',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-histogram-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-histogram-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<HistogramArgs>;

/** Aggregated `DEFAULT_HISTOGRAM` — one series, no groupBy. */
export const Single: Story = {
  name: 'Single',
  args: {
    data: singleFixture,
    showLegend: false,
    yLabel: 'Count',
  },
};

/** Client `DEFAULT_HISTOGRAM` — transaction bins stacked by weather-main. */
export const Grouped: Story = {
  name: 'Grouped',
  args: {
    data: { ...groupedFixture, groupBy: ['weather-main'] },
    showLegend: true,
    yLabel: 'Count',
  },
};

/** Client `DEFAULT_HISTOGRAM_SECOND` — satisfaction counts (groupBy). */
export const Satisfaction: Story = {
  name: 'Satisfaction',
  args: {
    data: satisfactionFixture,
    showLegend: true,
    yLabel: 'Count',
  },
};
