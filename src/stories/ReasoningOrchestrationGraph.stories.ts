import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/reasoning-orchestration-graph/index.js';
import '../components/chart-renderer/index.js';
import type { PathSelectDetail } from '../components/reasoning-orchestration-graph/index.js';
import defaultFixture from './fixtures/reasoning-orchestration.default.json';

type ReasoningArgs = {
  data: unknown;
  width: string;
  height: string;
  selectedPath: string;
  showLegend: boolean;
  showTooltip: boolean;
  showTopChart: boolean;
  showPanels: boolean;
  showAnnotations: boolean;
};

/** Same graph, six stages instead of four: the bands and the top chart split, the layout holds. */
const extraStages = {
  ...defaultFixture,
  stages: [
    { id: 'sample', label: 'Sample', depth: [0, 2], model: 'astra', status: 'done', metrics: { accuracy: 0.308 } },
    { id: 'draft', label: 'Draft', depth: [3, 4], model: 'astra', status: 'done', metrics: { accuracy: 0.344 } },
    { id: 'explore', label: 'Explore', depth: [5, 8], model: 'astra', status: 'done', metrics: { accuracy: 0.412 } },
    { id: 'verify', label: 'Verify', depth: [9, 10], model: 'opus', status: 'done', metrics: { accuracy: 0.497 } },
    { id: 'critique', label: 'Critique', depth: [11, 12], model: 'opus', status: 'active', metrics: { accuracy: 0.551 } },
    { id: 'repair', label: 'Repair', depth: [13, 14], model: 'opus', status: 'pending', metrics: { accuracy: 0.588 } },
  ],
};

/** Only the active path: no candidate paths to compare, same layout. */
const fewerPaths = {
  ...defaultFixture,
  paths: defaultFixture.paths.filter((path) => path.id === 'refine'),
};

/** Nodes, links and an active path only: depths come from the links, readouts from the graph. */
const minimal = {
  chartType: 'reasoningOrchestrationGraph',
  title: 'Proof search',
  models: [
    { id: 'drafter', name: 'Drafter', role: 'Explore' },
    { id: 'checker', name: 'Checker', role: 'Verify' },
  ],
  nodes: [
    { id: 'q', label: 'Question' },
    ...['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, label: `Draft ${id.toUpperCase()}`, model: 'drafter' })),
    ...['a', 'b', 'c', 'd', 'e'].flatMap((id) => [
      { id: `${id}1`, label: `Step ${id.toUpperCase()}1`, model: 'drafter', state: id === 'b' ? 'pruned' : 'candidate' },
      { id: `${id}2`, label: `Step ${id.toUpperCase()}2`, model: 'checker', state: id === 'c' ? 'verified' : 'pruned' },
    ]),
  ],
  links: ['a', 'b', 'c', 'd', 'e'].flatMap((id) => [
    { source: 'q', target: id },
    { source: id, target: `${id}1` },
    { source: `${id}1`, target: `${id}2`, kind: 'verify' },
  ]),
  activePath: ['q', 'c', 'c1', 'c2'],
  annotations: [{ node: 'c2', title: 'Proof verified', lines: ['Checker accepts step C2'] }],
};

function logSelect(event: CustomEvent<PathSelectDetail>): void {
  const log = (event.currentTarget as HTMLElement).parentElement?.querySelector('output');
  if (!log) return;
  const { pathId, nodeId, nodes } = event.detail;
  log.textContent = pathId || nodeId
    ? `path-select → ${pathId ?? `to ${nodeId}`} (${nodes.length} nodes)`
    : 'path-select → active path';
}

const frame = (args: ReasoningArgs) => html`
  <div style="width:${args.width};height:${args.height};">
    <ui9000-reasoning-orchestration-graph
      data=${JSON.stringify(args.data)}
      selected-path=${args.selectedPath}
      .showLegend=${args.showLegend}
      .showTooltip=${args.showTooltip}
      .showTopChart=${args.showTopChart}
      .showPanels=${args.showPanels}
      .showAnnotations=${args.showAnnotations}
      @path-select=${logSelect}
    ></ui9000-reasoning-orchestration-graph>
    <output style="display:block;margin-top:8px;font:12px system-ui;color:#737373;"></output>
  </div>
`;

const meta: Meta<ReasoningArgs> = {
  title: 'Graph/Reasoning orchestration',
  component: 'ui9000-reasoning-orchestration-graph',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Agents Management reasoning orchestration graph (AM-1): reasoning stages, candidate paths, models and refinement steps. The root sits at the bottom centre and depth grows outward; the widest stage (the exploration frontier) spans the plot as an arc, and deeper stages climb toward the top. Links are hairlines in their model’s colour, red and dashed into a pruned node. Candidate paths sit above them, subordinate; the active path glows from the root and warms to its model’s colour. Independent resamples grow as small fans on the baseline. Model labels sit in the top corners, the legend bottom right, and up to three refinement notes hang off their nodes. The top chart compares a stage metric across depth over the breadth at each depth; step entropy, the refinement pipeline and compute scaling sit in panels under the plot. Hover a node, a path or a stage for its detail. Click a path (or a node, for the path to it) to highlight it; “← Active path” or Esc returns. Selecting fires `path-select`. A free-form node–link graph stays network-graph. Use the toolbar for light or dark.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    selectedPath: { control: 'select', options: ['', 'refine', 'critic-b', 'vote', 'breadth'] },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  args: {
    data: defaultFixture,
    width: '100%',
    height: '860px',
    selectedPath: '',
    showLegend: true,
    showTooltip: true,
    showTopChart: true,
    showPanels: true,
    showAnnotations: true,
  },
  render: frame,
};

export default meta;
type Story = StoryObj<ReasoningArgs>;

/** Four stages, the refine path to depth 14 highlighted, three candidate paths and three resamples. */
export const Default: Story = { name: 'Default' };

export const SelectedPath: Story = {
  name: 'Selected candidate path',
  args: { selectedPath: 'critic-b' },
};

export const ExtraStages: Story = {
  name: 'Extra stages',
  args: { data: extraStages },
};

export const FewerPaths: Story = {
  name: 'Fewer paths',
  args: { data: fewerPaths },
};

export const Minimal: Story = {
  name: 'Nodes and links only',
  args: { data: minimal, height: '560px' },
};

export const Compact: Story = {
  name: 'Compact',
  args: { width: '520px', height: '720px' },
};

export const WithoutPanels: Story = {
  name: 'Graph only',
  args: { showTopChart: false, showPanels: false, height: '620px' },
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  render: (args) => html`
    <div style="width:${args.width};height:${args.height};">
      <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
    </div>
  `,
};
