import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/radar-chart/index.js';
import fusedashFixture from './fixtures/radar.fusedash.json';
import groupedFixture from './fixtures/radar-grouped.fusedash.json';

type RadarChartArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<RadarChartArgs> = {
  title: 'Many metrics/Radar',
  component: 'ui9000-radar-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `radarChart` / `radarGroupedChart` — polar radar with radial grid, markers, and grouped legend.',
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
      <ui9000-radar-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-radar-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<RadarChartArgs>;

export const Single: Story = {
  name: 'Single',
  args: { data: fusedashFixture },
};

export const Grouped: Story = {
  name: 'Grouped',
  args: { data: groupedFixture },
};
