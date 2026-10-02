import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/partial-dependence-chart/index.js';
import fusedashFixture from './fixtures/partial-dependence.fusedash.json';

type PartialDependenceArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<PartialDependenceArgs> = {
  title: 'Model dependence/Partial dependence',
  component: 'ui9000-partial-dependence-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `partialDependenceChart` — faint ICE curves under a dashed average that is always computed locally.',
      },
    },
  },
  argTypes: {
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
      <ui9000-partial-dependence-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-partial-dependence-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<PartialDependenceArgs>;

export const Default: Story = {};

export const SingleCurve: Story = {
  args: {
    data: {
      ...fusedashFixture,
      data: (fusedashFixture.data as Array<{ series: string }>).filter(
        (row) => row.series === 'id-1',
      ),
    },
  },
};

export const Empty: Story = {
  args: { data: [] },
};
