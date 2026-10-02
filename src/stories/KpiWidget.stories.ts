import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/kpi-widget/index.js';
import '../components/chart-renderer/index.js';
import kpisFixture from './fixtures/kpis.fusedash.json';
import kpiSingleFixture from './fixtures/kpi-single.fusedash.json';
import kpiTrendFixture from './fixtures/kpi-trend.fusedash.json';
import kpiOverallFixture from './fixtures/kpi-overall.fusedash.json';
import kpiComparisonFixture from './fixtures/kpi-comparison.fusedash.json';
import kpiHighLowFixture from './fixtures/kpi-high-low.fusedash.json';
import kpiHighLowPairFixture from './fixtures/kpi-high-low-pair.fusedash.json';
import kpiHighLowTrendFixture from './fixtures/kpi-high-low-trend.fusedash.json';
import kpiAdvancedLineFixture from './fixtures/kpi-advanced-line.fusedash.json';
import kpiAdvancedBarFixture from './fixtures/kpi-advanced-bar.fusedash.json';
import kpiAdvancedLollipopFixture from './fixtures/kpi-advanced-lollipop.fusedash.json';
import kpiAdvancedAreaFixture from './fixtures/kpi-advanced-area.fusedash.json';

type KpiWidgetArgs = {
  data: unknown;
  height: number;
};

const frame = (args: KpiWidgetArgs) => html`
  <div style="width:100%;height:${args.height}px;background:var(--ui9000-color-surface, #fff);border:1px solid var(--ui9000-color-border, #e5e7eb);">
    <ui9000-kpi-widget
      style="display:block;width:100%;height:100%;"
      data=${JSON.stringify(args.data)}
    ></ui9000-kpi-widget>
  </div>
`;

const meta: Meta<KpiWidgetArgs> = {
  title: 'Widgets/Kpis',
  component: 'ui9000-kpi-widget',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash KPI types from the client: `single_value`, `trend`, `overall`, `comparison`, `high/low`, `high/low_overall`, `high/low_trend`. Advanced is the same types with a nested chart and supporting KPIs underneath.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    height: { control: 'number' },
  },
  args: {
    data: kpiSingleFixture,
    height: 180,
  },
  render: (args) => frame(args),
};

export default meta;
type Story = StoryObj<KpiWidgetArgs>;

export const SingleValue: Story = {
  name: 'single_value',
  args: { data: kpiSingleFixture, height: 180 },
};

/** Client `DEFAULT_KPIS` — four `single_value` cards. */
export const SingleValueGrid: Story = {
  name: 'single_value (grid)',
  args: { data: kpisFixture, height: 280 },
};

export const Trend: Story = {
  name: 'trend',
  args: { data: kpiTrendFixture, height: 180 },
};

export const Overall: Story = {
  name: 'overall',
  args: { data: kpiOverallFixture, height: 180 },
};

export const Comparison: Story = {
  name: 'comparison',
  args: { data: kpiComparisonFixture, height: 180 },
};

export const HighLow: Story = {
  name: 'high/low',
  args: { data: kpiHighLowPairFixture, height: 180 },
};

/** Client `DEFAULT_KPI`. */
export const HighLowOverall: Story = {
  name: 'high/low_overall',
  args: { data: kpiHighLowFixture, height: 180 },
};

export const HighLowTrend: Story = {
  name: 'high/low_trend',
  args: { data: kpiHighLowTrendFixture, height: 180 },
};

export const AdvancedLine: Story = {
  name: 'advanced (line) + supporting KPIs',
  args: { data: kpiAdvancedLineFixture, height: 520 },
};

export const AdvancedBar: Story = {
  name: 'advanced (bar) + supporting KPIs',
  args: { data: kpiAdvancedBarFixture, height: 520 },
};

export const AdvancedLollipop: Story = {
  name: 'advanced (lollipop) + supporting KPIs',
  args: { data: kpiAdvancedLollipopFixture, height: 520 },
};

export const AdvancedArea: Story = {
  name: 'advanced (area) + supporting KPIs',
  args: { data: kpiAdvancedAreaFixture, height: 520 },
};
