import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/step-line-chart/index.js';
import type { StepLineGrafType } from '../components/step-line-chart/lib/types.js';
import ksFixture from './fixtures/step-line.fusedash.json';
import rocFixture from './fixtures/step-line-roc.fusedash.json';

type StepArgs = {
  data: unknown;
  grafType: StepLineGrafType;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<StepArgs> = {
  title: 'Ordered series/Step line',
  component: 'ui9000-step-line-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash KS / ROC step charts (`ksPlotChart` / `rocPlotChart`) via step-line.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    grafType: { control: 'select', options: ['none', 'curve', 'line'] },
    scale: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
  },
  args: {
    data: ksFixture,
    grafType: 'curve',
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-step-line-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        graf-type=${args.grafType}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-step-line-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<StepArgs>;

/** Client `DEFAULT_KS_PLOT`. */
export const KsPlot: Story = {
  name: 'KS Plot',
  args: { data: ksFixture, grafType: 'curve' },
};

/** Client `DEFAULT_ROC_PLOT` — three models. */
export const Roc: Story = {
  name: 'ROC',
  args: { data: rocFixture, grafType: 'line' },
};
