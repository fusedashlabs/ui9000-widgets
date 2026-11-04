import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/network-graph/index.js';
import fusedashFixture from './fixtures/network-graph.fusedash.json';
import panelsFixture from './fixtures/network-graph.panels.json';

type NetworkGraphArgs = {
  data: unknown;
  showHeader: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  wheelZoom: boolean;
  message: string;
  width: string;
};

const meta: Meta<NetworkGraphArgs> = {
  title: 'Graph/Network',
  component: 'ui9000-network-graph',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `networkGraphChart` — d3-force layout on a dashed circle, with a Heatmap view. Click a node to see its connections, use its "+" for the focus view, drag to reposition, drag the background to pan, ctrl/cmd + wheel to zoom (`wheel-zoom` for a plain wheel), and use the legend handles to filter by node size. Data with `topics`, `ranking`, `labels` and dates adds the topic list, the details column and the timeline.',
      },
    },
  },
  args: {
    data: fusedashFixture,
    showHeader: true,
    showLegend: true,
    showTooltip: true,
    wheelZoom: false,
    message: '',
    width: '100%',
  },
  render: (args) => html`
    <div style="width:${args.width};height:640px;background:var(--ui9000-color-surface, #fff);">
      <ui9000-network-graph
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        ?show-header=${args.showHeader}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
        ?wheel-zoom=${args.wheelZoom}
        .message=${args.message}
      ></ui9000-network-graph>
    </div>
  `,
};

export default meta;
type Story = StoryObj<NetworkGraphArgs>;

export const Default: Story = {};

/** Chat payload: a bare `{ nodes, links }` graph with explicit link kinds. */
export const ChatGraph: Story = {
  args: {
    data: {
      nodes: [
        { id: 'aws', label: 'AWS', type: 'cloud', value: 2400 },
        { id: 'azure', label: 'Azure', type: 'cloud', value: 1800 },
        { id: 'gcp', label: 'Google Cloud', type: 'cloud', value: 1100 },
        { id: 'salesforce', label: 'Salesforce', type: 'saas', value: 620 },
        { id: 'slack', label: 'Slack', type: 'saas', value: 310 },
        { id: 'zoom', label: 'Zoom', type: 'saas', value: 280 },
        { id: 'zapier', label: 'Zapier', type: 'integration', value: 140 },
        { id: 'mulesoft', label: 'MuleSoft', type: 'integration', value: 95 },
      ],
      links: [
        { id: 'l1', source: 'aws', target: 'salesforce', value: 1900, type: 'primary' },
        { id: 'l2', source: 'aws', target: 'slack', value: 1200, type: 'primary' },
        { id: 'l3', source: 'azure', target: 'zoom', value: 860 },
        { id: 'l4', source: 'gcp', target: 'zapier', value: 430, type: 'secondary' },
        { id: 'l5', source: 'salesforce', target: 'mulesoft', value: 320 },
        { id: 'l6', source: 'slack', target: 'zapier', value: 210, type: 'secondary' },
        { id: 'l7', source: 'aws', target: 'azure', value: 1500 },
      ],
    },
  },
};

/** Topics, ranking, dates and metrics: the panels around the graph. */
export const Panels: Story = {
  args: { data: panelsFixture },
};

/** Below 900 px the details go under the graph, folded. */
export const PanelsCompact: Story = {
  args: { data: panelsFixture, width: '640px' },
};

/** The width of the chat. */
export const InChat: Story = {
  args: { data: panelsFixture, width: '520px' },
};

export const NoLegend: Story = {
  args: { showLegend: false },
};

export const EmptyState: Story = {
  args: { data: { nodes: [], links: [] } },
};
