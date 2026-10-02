import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/inspector/index.js';
import '../components/pie-chart/index.js';
import pieFixture from './fixtures/pie.fusedash.json';
import spatialTrace from './fixtures/spatial.trace.json';
import spatialTraceV2 from './fixtures/spatial.trace.v2.json';

type InspectorArgs = {
  trace: unknown;
  panelLabel: string;
};

const frame = (args: InspectorArgs) => html`
  <div style="width:100%;background:var(--ui9000-color-surface, #fff);border:1px solid var(--ui9000-color-border, #e5e7eb);">
    <ui9000-inspector
      style="display:block;width:100%;height:auto;"
      trace=${JSON.stringify(args.trace)}
      panel-label=${args.panelLabel}
    ></ui9000-inspector>
  </div>
`;

const meta: Meta<InspectorArgs> = {
  title: 'Playground/Inspector',
  component: 'ui9000-inspector',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Tier **host** — display only, and not in the engine catalog.',
          '',
          'Shows the chart that was drawn, who chose it, why, the other scores,',
          'and the ruled-out charts grouped by reason. A trace carrying',
          'dataset rows is refused, not rendered.',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    trace: { control: false, table: { disable: true } },
    panelLabel: { control: 'text' },
  },
  args: {
    trace: spatialTrace,
    panelLabel: '',
  },
  render: (args) => frame(args),
};

export default meta;
type Story = StoryObj<InspectorArgs>;

/** Recorded S3-21 demo trace, `spatial` intent — v1 fields only, no rows. */
export const Playground: Story = {
  name: 'S3-21 spatial.trace.json',
  args: { trace: spatialTrace },
};

/** The same decision under `trace.v2.json` — winner, risk band and outcome filled in. */
export const TraceV2: Story = {
  name: 'trace.v2 (winner, risk band, outcome)',
  args: { trace: spatialTraceV2 },
};

const jevTrace = {
  objective: 'comparison',
  profile: { hasCategory: true, hasNumericMetric: true, hasTemporal: true, categoryCardinality: 6, rowCount: 6 },
  chosen: {
    id: 'line-chart',
    by: 'jev',
    why: 'Jev selected line-chart. The months are ordered, so the slope is the reading.',
  },
  candidates: [
    { id: 'bar-chart', score: 12, reasons: ['Highest engine score for one category and one metric.'] },
    { id: 'line-chart', score: 9, reasons: ['The category is ordered, so the slope means something.'] },
    { id: 'area-chart', score: 6, reasons: ['Same order, with the region under the line filled.'] },
  ],
  rejections: [
    { id: 'pie-chart', reason: 'The months are a sequence, not shares of one total.' },
    { id: 'scatter-plot-chart', reason: 'Needs two numeric measures. This table has one.' },
    { id: 'sankey-chart', reason: 'Needs a source, a target, and a value.' },
    { id: 'map-chart', reason: 'Component intents do not include this objective.' },
    { id: 'network-graph', reason: 'Component intents do not include this objective.' },
    { id: 'kpi-widget', reason: 'Component intents do not include this objective.' },
  ],
  actions: ['hover', 'resize'],
  outcome: 'rendered',
  tieBreak: 'Jev selected line-chart. The months are ordered, so the slope is the reading.',
};

const namedTrace = {
  objective: 'comparison',
  profile: { hasCategory: true, hasNumericMetric: true, categoryCardinality: 4, rowCount: 4 },
  chosen: {
    id: 'pie-chart',
    by: 'named',
    why: 'You asked for pie-chart. Drawing it. Jev would have picked bar-chart, and that stays a suggestion.',
  },
  candidates: [
    { id: 'bar-chart', score: 14, reasons: ['Compare discrete groups on one metric.'] },
    { id: 'pie-chart', score: 4, reasons: ['Few categories, and the metric can be read as shares.'] },
  ],
  rejections: [
    { id: 'map-chart', reason: 'No region, latitude, or longitude.' },
    { id: 'sankey-chart', reason: 'Needs a source, a target, and a value.' },
  ],
  actions: ['hover'],
  outcome: 'rendered',
  tieBreak: 'You asked for pie-chart. Drawing it.',
};

/** Jev picked the drawing. The engine scores stay underneath, and the ruled-out charts share reasons. */
export const JevChoice: Story = {
  name: 'Jev chose line-chart',
  args: { trace: jevTrace },
};

/** The user named the chart. It stays the drawing even when another score is higher. */
export const NamedChoice: Story = {
  name: 'You asked for pie-chart',
  args: { trace: namedTrace },
};

/** Pie above the decision, the same stack the chart app uses. Hide and Show sit on the panel. */
export const WithChart: Story = {
  name: 'Chart with inspector',
  args: { trace: namedTrace },
  render: (args) => html`
    <div style="width:100%;max-width:760px;background:var(--ui9000-color-surface, #fff);border:1px solid var(--ui9000-color-border, #e5e7eb);">
      <div style="height:380px;">
        <ui9000-pie-chart
          style="display:block;width:100%;height:100%;"
          data=${JSON.stringify(pieFixture)}
          scale="default"
          show-legend
          show-tooltip
        ></ui9000-pie-chart>
      </div>
      <div style="border-top:1px solid var(--ui9000-color-border, #e5e7eb);">
        <ui9000-inspector
          style="display:block;width:100%;height:auto;"
          trace=${JSON.stringify(args.trace)}
          panel-label=${args.panelLabel}
        ></ui9000-inspector>
      </div>
    </div>
  `,
};

/** A trace is a decision record: rows are refused rather than rendered. */
export const RowsRefused: Story = {
  name: 'refuses dataset rows',
  args: {
    trace: { ...spatialTrace, rows: [{ region: 'North', incidents: 12 }] },
  },
};
