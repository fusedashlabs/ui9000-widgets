import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/network-graph/index.js';
import '../components/map-chart/index.js';
import '../components/kpi-widget/index.js';
import '../components/bar-chart/index.js';
import '../components/histogram-chart/index.js';
import '../components/table/index.js';
import '../components/text/index.js';
import '../components/image/index.js';
import '../components/event-timeline/index.js';
import '../components/evidence-panel/index.js';
import '../components/entity-detail/index.js';
import '../components/text-input/index.js';
import '../components/number-input/index.js';
import '../components/select/index.js';
import '../components/multi-select/index.js';
import '../components/checkbox/index.js';
import '../components/date-input/index.js';
import '../components/button/index.js';
import '../components/form/index.js';
import '../components/approval-bar/index.js';
import networkFixture from './fixtures/network-graph.fusedash.json';
import mapFixture from './fixtures/map.fusedash.json';
import kpiFixture from './fixtures/kpi-single.fusedash.json';
import barFixture from './fixtures/bar.fusedash.json';
import histogramFixture from './fixtures/histogram-single.fusedash.json';
import { storybookAssetUrl } from './storybook-public-base.js';

const meta: Meta = {
  title: 'Playground/Engine',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const NetworkGraph: Story = {
  name: 'network-graph',
  render: () =>
    html`<div style="height: 320px;">
      <ui9000-network-graph
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(networkFixture)}
      ></ui9000-network-graph>
    </div>`,
};

export const MapChart: Story = {
  name: 'map-chart',
  render: () =>
    html`<div style="height: 320px;">
      <ui9000-map-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(mapFixture)}
        geojson-base-url=${storybookAssetUrl('geojson')}
        pmtiles-base-url=${storybookAssetUrl('pmtiles')}
      ></ui9000-map-chart>
    </div>`,
};

export const KpiWidget: Story = {
  name: 'kpi-widget',
  render: () =>
    html`<div style="height: 160px;">
      <ui9000-kpi-widget
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(kpiFixture)}
      ></ui9000-kpi-widget>
    </div>`,
};

export const BarChart: Story = {
  name: 'bar-chart',
  render: () =>
    html`<div style="height: 280px;">
      <ui9000-bar-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(barFixture)}
      ></ui9000-bar-chart>
    </div>`,
};

export const HistogramChart: Story = {
  name: 'histogram-chart',
  render: () =>
    html`<div style="height: 280px;">
      <ui9000-histogram-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(histogramFixture)}
      ></ui9000-histogram-chart>
    </div>`,
};

export const Table: Story = {
  name: 'table',
  render: () =>
    html`<div style="height: 280px;">
      <ui9000-table
        data=${JSON.stringify({
          columns: [
            { key: 'host', label: 'Host' },
            { key: 'sev', label: 'Severity' },
          ],
          cells: [
            [{ text: 'web-1' }, { text: 'high', badge: 'error' }],
            [{ text: 'web-2' }, { text: 'Optimal', badge: 'success' }],
          ],
        })}
      ></ui9000-table>
    </div>`,
};

export const Text: Story = {
  name: 'text',
  render: () =>
    html`<ui9000-text
      data=${JSON.stringify({ text: '## Note\n\nSee [runbook](https://example.com).' })}
    ></ui9000-text>`,
};

export const Image: Story = {
  name: 'image',
  render: () =>
    html`<div style="height: 200px;">
      <ui9000-image
        data=${JSON.stringify({
          src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png',
          alt: 'Sample',
        })}
      ></ui9000-image>
    </div>`,
};

export const EventTimeline: Story = {
  name: 'event-timeline',
  render: () =>
    html`<ui9000-event-timeline
      data=${JSON.stringify({
        events: [
          { ts: '2026-09-01T10:00:00Z', actor: 'siem', action: 'alert', severity: 'high', id: 'e1' },
          { ts: '2026-09-01T10:05:00Z', actor: 'ada', action: 'acked', severity: 'medium', id: 'e2' },
        ],
      })}
    ></ui9000-event-timeline>`,
};

export const EvidencePanel: Story = {
  name: 'evidence-panel',
  render: () =>
    html`<ui9000-evidence-panel
      data=${JSON.stringify({
        claim: 'Lateral movement from web-1',
        severity: 'high',
        sources: [{ label: 'SIEM', href: 'https://example.com/alert/1', excerpt: 'RDP burst' }],
        text: 'Host isolated pending review.',
      })}
    ></ui9000-evidence-panel>`,
};

export const EntityDetail: Story = {
  name: 'entity-detail',
  render: () =>
    html`<ui9000-entity-detail
      data=${JSON.stringify({
        id: 'host-web-1',
        title: 'web-1',
        fields: [{ label: 'IP', value: '10.0.0.8' }],
        links: [{ label: 'CMDB', href: 'https://example.com/cmdb/web-1' }],
        actions: ['isolate'],
      })}
    ></ui9000-entity-detail>`,
};

export const TextInput: Story = {
  name: 'text-input',
  render: () =>
    html`<ui9000-text-input data=${JSON.stringify({ label: 'Assignee', name: 'assignee' })}></ui9000-text-input>`,
};

export const NumberInput: Story = {
  name: 'number-input',
  render: () =>
    html`<ui9000-number-input data=${JSON.stringify({ label: 'Threshold', name: 'n', value: '5' })}></ui9000-number-input>`,
};

export const Select: Story = {
  name: 'select',
  render: () =>
    html`<ui9000-select
      data=${JSON.stringify({ label: 'Severity', name: 'sev', value: 'high', options: ['low', 'high'] })}
    ></ui9000-select>`,
};

export const MultiSelect: Story = {
  name: 'multi-select',
  render: () =>
    html`<ui9000-multi-select
      data=${JSON.stringify({
        label: 'Tags',
        name: 'tags',
        value: 'prod',
        options: ['prod', 'pci', 'linux'],
      })}
    ></ui9000-multi-select>`,
};

export const Checkbox: Story = {
  name: 'checkbox',
  render: () =>
    html`<ui9000-checkbox data=${JSON.stringify({ label: 'Isolate host', name: 'iso', value: 'false' })}></ui9000-checkbox>`,
};

export const DateInput: Story = {
  name: 'date-input',
  render: () =>
    html`<ui9000-date-input data=${JSON.stringify({ label: 'Detected', name: 'd', value: '2026-09-01' })}></ui9000-date-input>`,
};

export const Button: Story = {
  name: 'button',
  render: () =>
    html`<ui9000-button data=${JSON.stringify({ label: 'Dispatch' })} action-type="submit"></ui9000-button>`,
};

export const Form: Story = {
  name: 'form',
  render: () =>
    html`<ui9000-form
      data=${JSON.stringify({
        label: 'Triage',
        fields: [
          { id: 'assignee', kind: 'text-input', label: 'Assignee', value: '' },
          { id: 'sev', kind: 'select', label: 'Severity', value: 'high', options: ['low', 'high'] },
        ],
      })}
    ></ui9000-form>`,
};

export const ApprovalBar: Story = {
  name: 'approval-bar',
  render: () =>
    html`<ui9000-approval-bar
      data=${JSON.stringify({ proposal: 'Isolate web-1', status: 'proposed' })}
    ></ui9000-approval-bar>`,
};
