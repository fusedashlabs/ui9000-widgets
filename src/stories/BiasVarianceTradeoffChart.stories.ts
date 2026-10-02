import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/bias-variance-tradeoff-chart/index.js';
import fusedashFixture from './fixtures/bias-variance-tradeoff.fusedash.json';
import limitsFixture from './fixtures/bias-variance-tradeoff-limits.fusedash.json';

type BiasVarianceArgs = {
  data: unknown;
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<BiasVarianceArgs> = {
  title: 'Model error/Bias and variance',
  component: 'ui9000-bias-variance-tradeoff-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `biasVarianceTradeoffChart` — monotone curves over a continuous complexity axis, with optional `domainsLimits` reference bands.',
      },
    },
  },
  args: {
    data: fusedashFixture,
    showGrid: true,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-bias-variance-tradeoff-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-bias-variance-tradeoff-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<BiasVarianceArgs>;

export const Default: Story = {};

/**
 * Same widget with the `domainsLimits` block the client mock ships commented
 * out: underfit / optimal / overfit reference bands over the complexity axis.
 */
export const WithDomainsLimits: Story = {
  args: { data: limitsFixture },
};

export const Empty: Story = {
  args: { data: [] },
};
