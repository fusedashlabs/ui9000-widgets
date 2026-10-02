import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/punchcard-chart/index.js';
import fusedashFixture from './fixtures/punchcard.fusedash.json';
import clientDiagonalFixture from './fixtures/punchcard-client.fusedash.json';

type PunchcardArgs = {
  data: unknown;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showTooltip: boolean;
  xLabel: string;
  yLabel: string;
};

const meta: Meta<PunchcardArgs> = {
  title: 'Two-way magnitude/Punchcard',
  component: 'ui9000-punchcard-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `punchcardChart` — sequential bubble matrix. Single is the client `DEFAULT_PUNCHCARD` (no groupBy, diagonal). Grouped uses `groupBy` as the Y categories (weekday × hour).',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    scale: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
  },
  args: {
    data: clientDiagonalFixture,
    scale: 'default',
    showGrid: true,
    showTooltip: true,
    xLabel: '',
    yLabel: '',
  },
  render: (args) => html`
    <div style="width:100%;height:520px;background:#fff;">
      <ui9000-punchcard-chart
        style="display:block;width:100%;height:100%;min-height:480px;"
        data=${JSON.stringify(args.data)}
        scale=${args.scale}
        ?show-grid=${args.showGrid}
        ?show-tooltip=${args.showTooltip}
        x-label=${args.xLabel}
        y-label=${args.yLabel}
      ></ui9000-punchcard-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<PunchcardArgs>;

/** Client `DEFAULT_PUNCHCARD` — `groupBy` null, one bubble per year on the diagonal. */
export const Single: Story = {
  name: 'Single',
};

/** `groupBy` is the Y axis — a row per weekday, a column per hour. */
export const Grouped: Story = {
  name: 'Grouped',
  args: {
    data: fusedashFixture,
    xLabel: 'Hour',
    yLabel: 'Weekday',
  },
};
