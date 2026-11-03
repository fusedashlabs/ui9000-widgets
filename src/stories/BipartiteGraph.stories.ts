import { html } from 'lit';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/bipartite-graph/index.js';
import '../components/chart-renderer/index.js';
import defaultFixture from './fixtures/bipartite.default.json';

type BipartiteGraphArgs = {
  data: unknown;
  width: string;
  height: string;
  problemsOnly: boolean;
};

/** The same goals with no catalog: the groups are the ones the goals name, labelled by name. */
const noCatalog = (({ resourceGroups: _groups, resourceGroupTotal: _total, ...rest }) => rest)(defaultFixture);

/** On the docs page a frame wider than the column scrolls across in it rather than being cut off. */
const inColumn = (context: StoryContext, story: unknown) =>
  context.viewMode === 'docs' ? html`<div style="max-width: 100%; overflow-x: auto">${story}</div>` : story;

/** On the docs page the story's block is as tall as its frame, so the map is not cut off at the bottom, with what the story shows. */
const inDocs = (height: string, story?: string) => ({ docs: { story: { height }, ...(story ? { description: { story } } : {}) } });

const frame = (args: BipartiteGraphArgs, context: StoryContext) =>
  inColumn(
    context,
    html`
      <div style="width:${args.width};height:${args.height};">
        <ui9000-bipartite-graph ?problems-only=${args.problemsOnly} data=${JSON.stringify(args.data)}></ui9000-bipartite-graph>
      </div>
    `,
  );

const meta: Meta<BipartiteGraphArgs> = {
  title: 'Graph/Bipartite',
  component: 'ui9000-bipartite-graph',
  tags: ['autodocs'],
  parameters: {
    docs: {
      story: { height: '720px' },
      description: {
        component:
          'Bipartite graph, after the Agent operations design: the goals on the left, each a cloud of its agents with its progress ring, against the resource groups they draw on on the right. A ribbon joins each goal to each of its groups — the wider, the more calls a minute; in the held agents’ colour, yellow where traffic is only slowed — and light runs along it. Pointing at a goal or a group lights what it is tied to. Drag to pan, scroll to zoom, double-click to reset. It follows the page’s light or dark theme (toolbar Light/Dark).',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'text' },
    height: { control: 'text' },
    problemsOnly: { control: 'boolean' },
  },
  args: { data: defaultFixture, width: '100%', height: '720px', problemsOnly: false },
  render: frame,
};

export default meta;
type Story = StoryObj<BipartiteGraphArgs>;

/** The six goals of the design and the seven groups they draw on, fitted to the panel like every other story. */
export const Default: Story = { name: 'Default' };

export const ProblemsOnly: Story = {
  name: 'Problems only',
  args: { problemsOnly: true },
  parameters: inDocs(
    '720px',
    'With `problems-only` set, only what is held stands out: the agents at work all but go out, and a goal with none of its agents held steps back, as do the ribbons and groups where traffic flows.',
  ),
};

/**
 * Room for the design's full labels: the map fills the visible canvas (less
 * the canvas padding) and is drawn at its design size or more once that is about
 * 1,250 × 640 or larger. In the docs it gets a frame of its own, as tall as the design.
 */
export const Spacious: Story = {
  name: 'Spacious (readouts)',
  args: { width: 'calc(100vw - 2rem)', height: 'calc(100vh - 2rem)' },
  parameters: { docs: { story: { inline: false, height: '820px' } } },
};

/** A smaller map: labels keep to their heads, and show their readout under the pointer. */
export const Compact: Story = {
  name: 'Compact',
  args: { width: '960px', height: '600px' },
  parameters: inDocs('600px'),
};

export const NoCatalog: Story = {
  name: 'Without a catalog',
  args: { data: noCatalog },
  parameters: inDocs(
    '720px',
    'The goals alone, with no `resourceGroups` catalog: the groups are the ones the goals name, each labelled by its name, and the corner counts only those.',
  ),
};

export const Narrow: Story = {
  name: 'Narrow',
  args: { width: '420px', height: '560px' },
  parameters: inDocs('560px'),
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  args: { width: '100%', height: '640px' },
  parameters: inDocs(
    '640px',
    'The default payload passed to `<ui9000-chart-renderer>`, which picks this chart from its `chartType: "bipartiteGraph"`.',
  ),
  render: (args, context) =>
    inColumn(
      context,
      html`
        <div style="width:${args.width};height:${args.height};">
          <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
        </div>
      `,
    ),
};
