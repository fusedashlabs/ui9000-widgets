import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/band-utilization-chart/index.js';
import fixture from './fixtures/band-utilization.json';

type BandArgs = {
  data: unknown;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<BandArgs> = {
  title: 'Part of a whole/Band utilization',
  component: 'ui9000-band-utilization-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'WidgetItem rows. yAxe is the entity, xAxe is the share, groupBy is the segment. Width is the share of 100. A short row is not rescaled.',
      },
    },
  },
  args: {
    data: fixture,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:360px;background:#fff;">
      <ui9000-band-utilization-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-band-utilization-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<BandArgs>;

export const Default: Story = {};

export const ExtraRow: Story = {
  args: {
    data: {
      ...fixture,
      uniqueValues: {
        ...fixture.uniqueValues,
        sector: [...fixture.uniqueValues.sector, 'D1'],
      },
      data: [
        ...fixture.data,
        { sector: 'D1', band: 'Low', share: 10 },
        { sector: 'D1', band: 'Medium', share: 40 },
        { sector: 'D1', band: 'High', share: 50 },
      ],
    },
  },
};

export const TwoSegments: Story = {
  args: {
    data: {
      ...fixture,
      uniqueValues: {
        sector: ['A1', 'B1', 'C1'],
        band: ['Low', 'High'],
      },
      data: [
        { sector: 'A1', band: 'Low', share: 40 },
        { sector: 'A1', band: 'High', share: 60 },
        { sector: 'B1', band: 'Low', share: 25 },
        { sector: 'B1', band: 'High', share: 75 },
        { sector: 'C1', band: 'Low', share: 55 },
        { sector: 'C1', band: 'High', share: 45 },
      ],
    },
  },
};

/** E1 sums to 75 and stays at 75% of the track. */
export const IncompleteRow: Story = {
  args: {
    data: {
      ...fixture,
      uniqueValues: {
        ...fixture.uniqueValues,
        sector: ['A1', 'E1'],
      },
      data: [
        { sector: 'A1', band: 'Low', share: 22 },
        { sector: 'A1', band: 'Medium', share: 48 },
        { sector: 'A1', band: 'High', share: 30 },
        { sector: 'E1', band: 'Low', share: 40 },
        { sector: 'E1', band: 'Medium', share: 25 },
        { sector: 'E1', band: 'High', share: 10 },
      ],
    },
  },
};
