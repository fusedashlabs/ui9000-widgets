import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/network-graph/index.js';
import fusedashFixture from './fixtures/network-graph.fusedash.json';

type NetworkGraphArgs = {
  data: unknown;
  showHeader: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const meta: Meta<NetworkGraphArgs> = {
  title: 'Graph/Network',
  component: 'ui9000-network-graph',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `networkGraphChart` — d3-force layout. Click a node to focus its links, drag to reposition, drag the background to pan, ctrl/cmd + wheel to zoom, and use the legend handles to filter by node size.',
      },
    },
  },
  args: {
    data: fusedashFixture,
    showHeader: true,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => html`
    <div style="width:100%;height:560px;background:#fff;">
      <ui9000-network-graph
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        ?show-header=${args.showHeader}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
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

export const NoLegend: Story = {
  args: { showLegend: false },
};

export const EmptyState: Story = {
  args: { data: { nodes: [], links: [] } },
};
