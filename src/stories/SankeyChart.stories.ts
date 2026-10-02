import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/sankey-chart/index.js';
import fusedashFixture from './fixtures/sankey.fusedash.json';

type SankeyArgs = {
  data: unknown;
  showLegend: boolean;
  showTooltip: boolean;
  sourceLabel: string;
  targetLabel: string;
};

const meta: Meta<SankeyArgs> = {
  title: 'Flow/Sankey',
  component: 'ui9000-sankey-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `sankeyChart` — two dimension columns joined by value-coloured ribbons. Palette legend (Low → High) sits above the plot, as in the client.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
  },
  args: {
    /** Same shape as client `DEFAULT_SANKEY` (apps/charts constants). */
    data: fusedashFixture,
    showLegend: true,
    showTooltip: true,
    sourceLabel: '',
    targetLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:460px;background:#fff;">
      <ui9000-sankey-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        .showLegend=${args.showLegend}
        .showTooltip=${args.showTooltip}
        source-label=${args.sourceLabel}
        target-label=${args.targetLabel}
      ></ui9000-sankey-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<SankeyArgs>;

export const Default: Story = {};
