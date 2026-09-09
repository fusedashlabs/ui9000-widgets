import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/parallel-coordinates-chart/index.js';
import type { ParallelCoordinatesOrientation } from '../components/parallel-coordinates-chart/lib/types.js';
import fusedashFixture from './fixtures/parallel-coordinates.fusedash.json';

type ParallelCoordinatesArgs = {
  data: unknown;
  orientation: ParallelCoordinatesOrientation;
  showLegend: boolean;
  showTooltip: boolean;
  colorKey: string;
};

const meta: Meta<ParallelCoordinatesArgs> = {
  title: 'Charts/ParallelCoordinatesChart',
  component: 'ui9000-parallel-coordinates-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `parallelCoordinatesChart` — client HorizontalParallelCoordinatesChart / VerticalParallelCoordinatesChart. Click any axis to move the colour ramp onto it.\n\n' +
          '**Known divergence:** the vertical variant puts the maximum at the *top*. The client transposed its horizontal layout without flipping for SVG\'s downward y, so its vertical axes are mirrored and disagree with their own colour ramp — a side-by-side comparison will differ here on purpose.',
      },
    },
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    /** Same shape as client `DEFAULT_PARALLEL_COORDINATES_CHART`. */
    data: fusedashFixture,
    orientation: 'horizontal',
    showLegend: true,
    showTooltip: true,
    colorKey: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-parallel-coordinates-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        orientation=${args.orientation}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        color-key=${args.colorKey}
      ></ui9000-parallel-coordinates-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<ParallelCoordinatesArgs>;

export const Horizontal: Story = {
  name: 'Horizontal',
  args: { orientation: 'horizontal' },
};

export const Vertical: Story = {
  name: 'Vertical',
  args: { orientation: 'vertical' },
};

export const ChatRows: Story = {
  name: 'Chat rows',
  args: {
    orientation: 'vertical',
    data: {
      idKey: 'model',
      axes: ['accuracy', 'latencyMs', 'costPer1k', 'contextK'],
      rows: [
        { model: 'alpha', accuracy: 0.91, latencyMs: 240, costPer1k: 3.2, contextK: 128 },
        { model: 'beta', accuracy: 0.86, latencyMs: 120, costPer1k: 1.1, contextK: 32 },
        { model: 'gamma', accuracy: 0.94, latencyMs: 610, costPer1k: 9.4, contextK: 200 },
        { model: 'delta', accuracy: 0.79, latencyMs: 80, costPer1k: 0.4, contextK: 16 },
      ],
    },
  },
};
