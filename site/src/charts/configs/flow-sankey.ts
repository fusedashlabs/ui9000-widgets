import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

/** A plain list of links has no summary to show (rendered). */
const linksOnly = ({ data }: { data: unknown }) => Array.isArray(data);

const flowSankey: ChartConfig = {
  id: 'flow-sankey',
  title: 'Flow sankey',
  category: 'flow',
  description: 'Traces quantities through several stages, from causes to outcomes.',
  tag: 'ui9000-flow-sankey-chart',
  keywords: ['stages', 'funnel'],
  load: async () => {
    await import('../../../../src/components/flow-sankey-chart/element/ui9000-flow-sankey-chart.js');
  },
  presets: [
    {
      id: 'stages',
      label: 'Stages',
      icon: 'flow',
      data: () => import('../../../../src/stories/fixtures/flow-sankey.figma.json').then((m) => m.default),
      values: {
        chartTitle: 'Tower Power Flow Analysis',
        chartSubtitle: 'Tracing power loss from root cause to output impact',
      },
    },
    {
      id: 'links-only',
      label: 'Links only',
      icon: 'flow-links',
      data: () => import('../../../../src/stories/FlowSankeyChart.stories.js').then((m) => m.LinksOnly.args?.data),
      values: { chartTitle: 'Tower Power Flow Analysis' },
    },
  ],
  // This element turns a toggle off only with the value "false" (show-legend="false"), like show-header.
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, falseAttribute: true, description: 'Stage columns behind the flows.' },
    { property: 'showLegend', type: 'boolean', default: true, falseAttribute: true, description: 'Legend of the severity colours.' },
    { property: 'showTooltip', type: 'boolean', default: true, falseAttribute: true, description: 'The flow and its value in a tooltip when hovering.' },
    {
      property: 'showSummary',
      type: 'boolean',
      default: true,
      falseAttribute: true,
      description: 'Summary figures beside the flows.',
      hiddenWhen: linksOnly,
    },
    { property: 'chartSubtitle', type: 'string', default: '', description: 'Line under the title.' },
    { property: 'legendLabel', type: 'string', default: '', description: 'Title of the legend.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    stages: 'The stages, in order: one column each.',
    nodes: 'The nodes, each in a stage.',
    links: 'The flows between nodes: source, target, value and an optional severity.',
    subtitle: 'Line under the title when chart-subtitle is not set.',
    legendLabel: 'Title of the legend when legend-label is not set.',
    valueLabel: 'Name of the value, for the tooltip.',
    summary: 'Figures for the summary.',
  },
  whenToUse: {
    useFor: ['How a quantity splits and recombines across ordered stages, such as cause, failure and impact.', 'Highlighting the paths that matter by severity.'],
    avoid: ['Two levels only: a plain sankey is simpler.', 'Flows that loop back: stages need an order.'],
  },
};

export default flowSankey;
