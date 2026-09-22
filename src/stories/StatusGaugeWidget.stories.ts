import { html } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import type { Meta, StoryObj } from '@storybook/web-components';

import { contextToCssVars, type PartialWidgetContext } from '../context/widget-context.js';
import { DEFAULT_CONTEXT, DEFAULT_THEME, type WidgetTheme } from '../types/index.js';
import '../components/status-gauge-widget/index.js';
import antennaFixture from './fixtures/status-gauge.mock.json';
import manyFixture from './fixtures/status-gauge-many.mock.json';

type GaugeTheme = 'light' | 'dark';

type StatusGaugeArgs = {
  data: unknown;
  appearance: GaugeTheme;
  width: number;
  height: number;
};

const DARK_THEME: WidgetTheme = {
  primary: '#473DD9',
  secondary: '#36C4A5',
  background: 'transparent',
  grid: '#444b57',
  text: '#eff0f1',
  textMuted: '#a4a9b1',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
};

const LIGHT_THEME: WidgetTheme = {
  ...DEFAULT_THEME,
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
};

function frameStyle(appearance: GaugeTheme, width: number, height: number): Record<string, string> {
  const ctx: PartialWidgetContext =
    appearance === 'dark'
      ? { mode: 'dark', theme: DARK_THEME }
      : { mode: 'light', theme: LIGHT_THEME };
  const merged = {
    ...DEFAULT_CONTEXT,
    ...ctx,
    theme: { ...DEFAULT_THEME, ...ctx.theme },
  };
  return {
    ...contextToCssVars(merged),
    width: `${width}px`,
    height: `${height}px`,
    boxSizing: 'border-box',
    background: 'transparent',
  };
}

const frame = (args: StatusGaugeArgs) => html`
  <div style=${styleMap(frameStyle(args.appearance, args.width, args.height))}>
    <ui9000-status-gauge-widget
      style="display:block;width:100%;height:100%;"
      .theme=${args.appearance}
      data=${JSON.stringify(args.data)}
    ></ui9000-status-gauge-widget>
  </div>
`;

const meta: Meta<StatusGaugeArgs> = {
  title: 'Widgets/Status gauge',
  component: 'ui9000-status-gauge-widget',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Same qualitative palette and type as the other charts. `theme="light"` is the white card; `theme="dark"` follows the dark surface tokens. Inside the client, `data-theme` and `--colors-*` drive it without this attribute.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    appearance: { control: 'inline-radio', options: ['light', 'dark'] },
    width: { control: 'number' },
    height: { control: 'number' },
  },
  args: {
    data: antennaFixture,
    appearance: 'light',
    width: 380,
    height: 640,
  },
  render: (args) => frame(args),
};

export default meta;
type Story = StoryObj<StatusGaugeArgs>;

export const Light: Story = {
  name: 'White',
  args: { data: antennaFixture, appearance: 'light', width: 380, height: 640 },
};

export const Dark: Story = {
  name: 'Dark',
  args: { data: antennaFixture, appearance: 'dark', width: 380, height: 640 },
};

export const SixCards: Story = {
  name: 'Six cards',
  args: { data: manyFixture, appearance: 'light', width: 380, height: 640 },
};

export const Narrow: Story = {
  name: 'Narrow (one column)',
  args: { data: antennaFixture, appearance: 'light', width: 260, height: 720 },
};
