import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/inspector/index.js';
import spatialTrace from './fixtures/spatial.trace.json';
import spatialTraceV2 from './fixtures/spatial.trace.v2.json';

type InspectorArgs = {
  trace: unknown;
  panelLabel: string;
  height: number;
};

const frame = (args: InspectorArgs) => html`
  <div style="width:100%;height:${args.height}px;background:#fff;border:1px solid #eee;">
    <ui9000-inspector
      style="display:block;width:100%;height:100%;"
      trace=${JSON.stringify(args.trace)}
      panel-label=${args.panelLabel}
    ></ui9000-inspector>
  </div>
`;

const meta: Meta<InspectorArgs> = {
  title: 'Host/Inspector',
  component: 'ui9000-inspector',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Tier **host** — display only, and not in the engine catalog.',
          '',
          'Renders one frozen decision trace against `trace.v2.json`',
          '(`src/components/inspector/trace.v2.json`) until S4-03 publishes the shape.',
          'A v1 trace still renders: `winner`, `riskBand` and `outcome` read',
          '"not recorded". A trace carrying dataset rows is refused, not rendered.',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    trace: { control: false, table: { disable: true } },
    panelLabel: { control: 'text' },
    height: { control: 'number' },
  },
  args: {
    trace: spatialTrace,
    panelLabel: '',
    height: 720,
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

/** A trace is a decision record: rows are refused rather than rendered. */
export const RowsRefused: Story = {
  name: 'refuses dataset rows',
  args: {
    trace: { ...spatialTrace, rows: [{ region: 'North', incidents: 12 }] },
    height: 120,
  },
};
