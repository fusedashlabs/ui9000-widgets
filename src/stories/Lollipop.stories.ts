import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/lollipop/index.js';
import type {
  LollipopLayout,
  LollipopOrientation,
} from '../components/lollipop/lib/types.js';
import singleFixture from './fixtures/lollipop.fusedash.json';
import groupedFixture from './fixtures/lollipop-grouped.fusedash.json';

const stackedFixture = { ...groupedFixture, stacked: true };

type LollipopArgs = {
  data: unknown;
  orientation: LollipopOrientation;
  layout: LollipopLayout;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<LollipopArgs> = {
  title: 'Charts/Lollipop',
  component: 'ui9000-lollipop',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `lollipopChart` — Single / Grouped / Stacked × Vertical / Horizontal. Visual parity with client Lollipop Vertical / Horizontal.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    layout: {
      control: 'select',
      options: ['grouped', 'stacked'],
      description: 'Multi-series only — one series always renders as a plain lollipop',
    },
    scale: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
  },
  args: {
    data: singleFixture,
    orientation: 'vertical',
    layout: 'grouped',
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:420px;background:#fff;">
      <ui9000-lollipop
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        orientation=${args.orientation}
        layout=${args.layout}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-lollipop>
    </div>
  `,
};

export default meta;
type Story = StoryObj<LollipopArgs>;

/** Client `DEFAULT_LOLLIPOP` — one series, no groupBy. */
export const Single: Story = {
  name: 'Single',
  args: {
    data: singleFixture,
    orientation: 'vertical',
    showLegend: false,
  },
};

export const SingleHorizontal: Story = {
  name: 'Single Horizontal',
  args: {
    data: singleFixture,
    orientation: 'horizontal',
    showLegend: false,
  },
};

/** Client `DEFAULT_GROUPED_LOLLIPOP` — year × market segment, offset stems. */
export const Grouped: Story = {
  name: 'Grouped',
  args: {
    data: groupedFixture,
    orientation: 'vertical',
    layout: 'grouped',
    showLegend: true,
  },
};

export const GroupedHorizontal: Story = {
  name: 'Grouped Horizontal',
  args: {
    data: groupedFixture,
    orientation: 'horizontal',
    layout: 'grouped',
    showLegend: true,
  },
};

/** Client `DEFAULT_STACKED_LOLLIPOP` — same data, stacked stems. */
export const Stacked: Story = {
  name: 'Stacked',
  args: {
    data: stackedFixture,
    orientation: 'vertical',
    layout: 'stacked',
    showLegend: true,
  },
};

export const StackedHorizontal: Story = {
  name: 'Stacked Horizontal',
  args: {
    data: stackedFixture,
    orientation: 'horizontal',
    layout: 'stacked',
    showLegend: true,
  },
};
