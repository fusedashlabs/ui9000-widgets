import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';
import type { DataContext } from '../../lib/chart-state.js';
import { HEADER_ALWAYS } from '../agent-graphs.js';

/** Candidate paths to pick from: the payload names more than the active path (rendered: one path, nothing to pick). */
const noCandidates = ({ data }: DataContext) => {
  const paths = data && typeof data === 'object' ? (data as { paths?: unknown }).paths : undefined;
  return !Array.isArray(paths) || paths.length < 2;
};

const story = (name: string) => () =>
  import('../../../../src/stories/ReasoningOrchestrationGraph.stories.js').then((m) => m[name as 'Minimal'].args?.data);

const reasoningOrchestration: ChartConfig = {
  id: 'reasoning-orchestration',
  title: 'Reasoning orchestration',
  category: 'graph',
  description: 'Shows a reasoning search: stages, the candidate paths through them, the models that took each step, and the path chosen.',
  tag: 'ui9000-reasoning-orchestration-graph',
  keywords: ['reasoning', 'paths', 'models', 'tree search'],
  stageHeight: 720,
  load: async () => {
    await import('../../../../src/components/reasoning-orchestration-graph/element/ui9000-reasoning-orchestration-graph.js');
  },
  presets: [
    {
      id: 'default',
      label: 'Default',
      icon: 'fan',
      data: () => import('../../../../src/stories/fixtures/reasoning-orchestration.default.json').then((m) => m.default),
    },
    { id: 'extra-stages', label: 'Extra stages', icon: 'fan-stages', data: story('ExtraStages') },
    { id: 'minimal', label: 'Nodes and links', icon: 'fan-plain', data: story('Minimal') },
  ],
  // This element turns a toggle off only with the value "false" (show-panels="false"), like show-header.
  controls: [
    {
      property: 'selectedPath',
      type: 'enum',
      options: ['', 'refine', 'critic-b', 'vote', 'breadth'],
      optionLabels: { '': 'Active path', 'critic-b': 'Critic B' },
      default: '',
      description: 'The candidate path highlighted; empty, the active path.',
      hiddenWhen: noCandidates,
    },
    { property: 'showPanels', type: 'boolean', default: true, falseAttribute: true, description: 'The step entropy and benchmarks panel under the plot.' },
    { property: 'showAnnotations', type: 'boolean', default: true, falseAttribute: true, description: 'The refinement notes hung off their nodes.' },
    { property: 'showLegend', type: 'boolean', default: true, falseAttribute: true, description: 'Legend of the node states and link kinds.' },
    { property: 'showTooltip', type: 'boolean', default: true, falseAttribute: true, description: 'A node’s, a path’s or a stage’s detail in a tooltip when hovering.' },
    HEADER_CONTROLS[0],
  ],
  hidden: [HEADER_ALWAYS],
  dataFields: {
    title: 'Title of the graph.',
    metadata: 'Short facts shown under the title.',
    models: 'The models, each with its colour, name and role.',
    stages: 'The stages: the depths each spans, its model, its status and its metrics.',
    stageMetric: 'The metric shown beside each stage name.',
    paths: 'The candidate paths: their nodes, their model and their score.',
    activePath: 'The path chosen: a path id, or its nodes.',
    annotations: 'Notes hung off nodes, up to three.',
    benchmarks: 'Figures for the panel under the plot.',
    entropy: 'The step entropy series for the panel under the plot.',
    nodes: 'The steps: id, label, depth, state and score.',
    links: 'The links between steps, with an optional kind.',
  },
  whenToUse: {
    useFor: ['How a model searched for an answer: what it tried, what it pruned and what it kept.', 'Comparing candidate paths and the models behind them.'],
    avoid: ['A free-form network with no root or depth: use Network.'],
  },
};

export default reasoningOrchestration;
