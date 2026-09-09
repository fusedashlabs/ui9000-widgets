import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/gini-impurity-entropy-chart/index.js';
import fixture from './fixtures/gini-impurity-entropy.fusedash.json';

type GiniArgs = {
  data: unknown;
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  showPHat: boolean;
  showCI: boolean;
  showSplit: boolean;
};

/** The client reads decision-tree annotations off `widget.meta`. */
const ANNOTATED = {
  ...fixture,
  meta: {
    pHat: 0.62,
    ci: [0.54, 0.7],
    split: { pLeft: 0.18, nLeft: 40, pRight: 0.81, nRight: 60 },
  },
};

const meta: Meta<GiniArgs> = {
  title: 'Charts/GiniImpurityEntropyChart',
  component: 'ui9000-gini-impurity-entropy-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `giniImpurityEntropyChart` — entropy / Gini impurity / misclassification error over the class probability p. Visual parity with the client GiniImpurityEntropyChart.',
      },
    },
  },
  args: {
    data: fixture,
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    showPHat: false,
    showCI: false,
    showSplit: false,
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-gini-impurity-entropy-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        ?show-p-hat=${args.showPHat}
        ?show-ci=${args.showCI}
        ?show-split=${args.showSplit}
      ></ui9000-gini-impurity-entropy-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<GiniArgs>;

/** Client `DEFAULT_GINI_IMPUITY_ENTROPY` — the three impurity curves. */
export const Default: Story = {
  name: 'Default',
  args: { data: fixture },
};

/** Same mock with `meta` annotations and every overlay switched on. */
export const WithAnnotations: Story = {
  name: 'With annotations',
  args: {
    data: ANNOTATED,
    showPHat: true,
    showCI: true,
    showSplit: true,
  },
};
