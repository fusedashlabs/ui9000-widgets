import { html } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/flow-sankey-chart/index.js';
import figmaFixture from './fixtures/flow-sankey.figma.json';

type Appearance = 'light' | 'dark';

type FlowSankeyArgs = {
  data: unknown;
  chartTitle: string;
  chartSubtitle: string;
  legendLabel: string;
  showLegend: boolean;
  showTooltip: boolean;
  showGrid: boolean;
  showSummary: boolean;
  selectedNode: string;
  width: string;
  height: string;
};

/** The Storybook toolbar's Light/Dark switch drives the chart's appearance. */
function appearanceOf(context: StoryContext): Appearance {
  return context.globals.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Only the page behind the chart — no `--ui9000-color-*` variables, so the
 * widget is resolving the whole palette from its own `theme` attribute.
 */
function frameStyle(args: FlowSankeyArgs, appearance: Appearance): Record<string, string> {
  return {
    width: args.width,
    height: args.height,
    boxSizing: 'border-box',
    // A page tone either side of the widget's own panel, so its edge shows.
    background: appearance === 'dark' ? '#000000' : '#f3f4f6',
    padding: '12px',
  };
}

const frame = (args: FlowSankeyArgs, context: StoryContext) => html`
  <div style=${styleMap(frameStyle(args, appearanceOf(context)))}>
    <ui9000-flow-sankey-chart
      style="display:block;width:100%;height:100%;"
      theme=${appearanceOf(context)}
      data=${JSON.stringify(args.data)}
      chart-title=${args.chartTitle}
      chart-subtitle=${args.chartSubtitle ?? ''}
      legend-label=${args.legendLabel ?? ''}
      .showLegend=${args.showLegend}
      .showTooltip=${args.showTooltip}
      .showGrid=${args.showGrid}
      .showSummary=${args.showSummary}
      selected-node=${args.selectedNode}
    ></ui9000-flow-sankey-chart>
  </div>
`;

const meta: Meta<FlowSankeyArgs> = {
  title: 'Flow/Flow sankey',
  component: 'ui9000-flow-sankey-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Multi-stage flow Sankey — stage columns joined by ' +
          'severity-coloured ribbons. The percentage gutter measures each ' +
          'column against the busiest stage; a node fed by exactly one parent ' +
          'shows its share of that parent instead. Click a node to highlight ' +
          'its full cause-to-impact path. `theme` switches the appearance (here, ' +
          'the toolbar\'s Light/Dark switch); ' +
          'left empty it follows a `data-theme="dark"` ancestor and then the ' +
          '`--ui9000-mode` variable.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
  },
  args: {
    data: figmaFixture,
    chartTitle: 'Tower Power Flow Analysis',
    // Prefilled from the payload's own subtitle; clearing the control renders
    // the chart with no subtitle at all.
    chartSubtitle: 'Tracing power loss from root cause to output impact',
    // Left empty so it falls back to the payload's key label ("Severity").
    legendLabel: '',
    showLegend: true,
    showTooltip: true,
    showGrid: true,
    showSummary: true,
    selectedNode: '',
    width: '100%',
    height: '640px',
  },
  render: frame,
};

export default meta;
type Story = StoryObj<FlowSankeyArgs>;

/** The Figma frame: four stages, 685 events, severity legend. */
export const Default: Story = {};

/** `Power Loss` selected — the Figma "Selected Flow Highlight" state. */
export const SelectedPath: Story = {
  args: { selectedNode: 'power-loss' },
};

/** Chat-sized frame: labels drop out on the bands that get too thin. */
export const Compact: Story = {
  args: { width: '520px', height: '340px', showSummary: false },
};

/** Bare link list, no stages declared — columns come from the graph shape. */
export const LinksOnly: Story = {
  args: {
    data: [
      { source: 'Input Voltage', target: 'AC Main Low', value: 62 },
      { source: 'Input Voltage', target: 'AC Main High', value: 28 },
      { source: 'AC Main Low', target: 'Output Voltage Low', value: 62, severity: 'high' },
      { source: 'AC Main High', target: 'Output Voltage High', value: 28 },
    ],
    showSummary: false,
  },
};
