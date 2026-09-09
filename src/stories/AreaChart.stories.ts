import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/area-chart/index.js';
import groupedFixture from './fixtures/area.fusedash.json';

type AreaRow = {
  year: string;
  price: number;
  MD_Market_segment: string;
};

/** Same FuseDash mock with groupBy removed — one series (price summed by year). */
const singleFixture = (() => {
  const years = groupedFixture.uniqueValues.year;
  const byYear = new Map<string, number>();
  for (const row of groupedFixture.data as AreaRow[]) {
    byYear.set(row.year, (byYear.get(row.year) ?? 0) + row.price);
  }
  return {
    ...groupedFixture,
    name: 'Average Price Over Years',
    stacked: false,
    groupBy: [] as string[],
    markers: [{ key: 'default', shape: 'donut' }],
    formatting: [{ key: 'default', color: '1' }],
    uniqueValues: { year: years },
    data: years.map((year) => ({ year, price: byYear.get(year) ?? 0 })),
  };
})();

const stackedFixture = { ...groupedFixture, stacked: true };

type AreaChartArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  showPoints: boolean;
};

const meta: Meta<AreaChartArgs> = {
  title: 'Charts/AreaChart',
  component: 'ui9000-area-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `areaChart` — Single (no groupBy), Grouped (overlapping areas), and Stacked. Visual parity with client AreaChart.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    scale: { control: 'select', options: ['compact', 'default', 'comfortable'] },
  },
  args: {
    data: groupedFixture,
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    showPoints: true,
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-area-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        ?show-points=${args.showPoints}
      ></ui9000-area-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<AreaChartArgs>;

/** No groupBy — one filled series. */
export const Single: Story = {
  name: 'Single',
  args: { data: singleFixture, showLegend: false },
};

/** Client `DEFAULT_AREA` — overlapping grouped areas. */
export const Grouped: Story = {
  name: 'Grouped',
  args: { data: groupedFixture },
};

/** Client `DEFAULT_STACKED_AREA` — stacked areas (`stacked: true`). */
export const Stacked: Story = {
  name: 'Stacked',
  args: { data: stackedFixture },
};
