import { html } from 'lit';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/component-asset-card/index.js';
import '../components/chart-renderer/index.js';
import figmaJson from './fixtures/component-asset.figma.json';

/** Vite bundles the image and resolves it against the Storybook base, locally and when hosted. */
const antennaUrl = new URL('./fixtures/images/sector-antenna.png', import.meta.url).href;
const figmaFixture = { ...figmaJson, image: { ...figmaJson.image, src: antennaUrl } };

type Appearance = 'light' | 'dark';

type ComponentAssetArgs = {
  data: unknown;
  width: number;
};

/** Done-when case: no image, delta or trend — name, id and value remain. */
const bare = {
  chartType: 'componentAssetCard',
  name: figmaFixture.name,
  assetId: figmaFixture.assetId,
  metric: { label: figmaFixture.metric.label, value: figmaFixture.metric.value, unit: '%' },
};

const noHistory = { ...figmaFixture, trend: null };

/** Same shell, another component: lower is worse, one point in warning. */
const rectifier = {
  chartType: 'componentAssetCard',
  name: 'Rectifier Shelf B',
  assetId: 'RECT-B-02',
  metric: {
    label: 'DC bus voltage',
    value: 50.4,
    unit: 'V',
    thresholds: { warning: 51, critical: 49, direction: 'below' },
  },
  delta: { value: -1.6, unit: 'V', label: 'vs 1h ago', better: 'up' },
  trend: [53.4, 53.2, 53.3, 52.9, 52.6, 52.1, 51.4, 50.9, 50.4],
};

/** The Storybook toolbar's Light/Dark switch drives the card's appearance. */
function appearanceOf(context: StoryContext): Appearance {
  return context.globals.theme === 'dark' ? 'dark' : 'light';
}

const frame = (args: ComponentAssetArgs, context: StoryContext) => html`
  <div style="width:${args.width}px;">
    <ui9000-component-asset-card
      .theme=${appearanceOf(context)}
      data=${JSON.stringify(args.data)}
    ></ui9000-component-asset-card>
  </div>
`;

const meta: Meta<ComponentAssetArgs> = {
  title: 'Widgets/Component asset card',
  component: 'ui9000-component-asset-card',
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'white' },
    docs: {
      description: {
        component:
          'Optivion component-asset card. One primary metric with an optional delta. The trend appears only when history exists; the status mark only when the metric has a level or thresholds. Reuse the shell by swapping the image, the id and the metric.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'number' },
  },
  args: { data: figmaFixture, width: 364 },
  render: frame,
};

export default meta;
type Story = StoryObj<ComponentAssetArgs>;

export const ImageDeltaTrend: Story = { name: 'Image with delta and trend' };

export const Bare: Story = { name: 'No image, delta or trend', args: { data: bare } };

export const NoHistory: Story = { name: 'No history', args: { data: noHistory } };

export const OtherComponent: Story = { name: 'Other component', args: { data: rectifier } };

export const Narrow: Story = { name: 'Narrow (trend hidden)', args: { width: 260 } };

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  render: (args, context) => html`
    <div style="width:${args.width}px;height:220px;--ui9000-mode:${appearanceOf(context)};">
      <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
    </div>
  `,
};
