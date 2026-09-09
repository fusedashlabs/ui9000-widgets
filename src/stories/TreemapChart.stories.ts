import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/treemap-chart/index.js';
import fusedashFixture from './fixtures/treemap.fusedash.json';

type TreemapChartArgs = {
  data: unknown;
  showLegend: boolean;
  showTooltip: boolean;
};

/**
 * The same widget mock without its second dimension — FuseDash then routes to
 * the single area-proportional treemap instead of the card mosaic (FUS-3868).
 */
const singleDimensionFixture = { ...fusedashFixture, subgroup: null };

const meta: Meta<TreemapChartArgs> = {
  title: 'Charts/TreemapChart',
  component: 'ui9000-treemap-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `treemapChart` — a card per `groupBy` value with a nested treemap when `subgroup` adds a second dimension, otherwise one area-proportional treemap colored by magnitude.',
      },
    },
  },
  args: {
    data: fusedashFixture,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:460px;background:#fff;">
      <ui9000-treemap-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-treemap-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<TreemapChartArgs>;

/** Grouped: one card per county, tiles per crop group. */
export const Default: Story = {};

/** Single dimension: area encodes the summed metric, color encodes its band. */
export const SingleDimension: Story = {
  args: { data: singleDimensionFixture },
};

/** Chat shorthand payload. */
export const LabelValueRows: Story = {
  args: {
    data: [
      { label: 'Storage', value: 453122972.61 },
      { label: 'Processing', value: 266274090.75 },
      { label: 'Fresh Market', value: 170254153.95 },
      { label: 'Fresh+ Processing', value: 158852150.5 },
      { label: 'Fresh or Spanish', value: 105602387.94 },
    ],
  },
};

/** Invalid payload falls back to the empty state instead of throwing. */
export const EmptyState: Story = {
  args: { data: [] },
};
