import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { Meta, StoryObj } from '@storybook/web-components';

import { registerChartRenderer } from '../components/chart-renderer/index.js';
import { widgetFromPastedJson } from './json-playground.js';
import { storybookAssetUrl } from './storybook-public-base.js';

registerChartRenderer();

/**
 * Tool-arg shape from mcp-ui (inline rows, empty dataUrl). The chart view in
 * chat ignores `data` and fetches `dataUrl`; this playground paints `data`.
 */
const SAMPLE = `{
  "chartType": "barChart",
  "name": "Top farmacii — compensat (MDL)",
  "orientation": "vertical",
  "xAxe": ["pharmacy"],
  "yAxe": ["compensated_sum"],
  "groupBy": ["pharmacy"],
  "data": [
    { "pharmacy": "Stefan cel Mare 26", "compensated_sum": 1300986.08 },
    { "pharmacy": "Stefan cel Mare 105", "compensated_sum": 1050308.07 },
    { "pharmacy": "Stefan cel Mare 125", "compensated_sum": 863116.56 },
    { "pharmacy": "Stefan cel Mare 123", "compensated_sum": 201604.95 },
    { "pharmacy": "Stefan cel Mare 103", "compensated_sum": 187396.92 }
  ],
  "uniqueValues": {},
  "stacked": false,
  "dataUrl": ""
}`;

@customElement('ui9000-json-playground')
class Ui9000JsonPlayground extends LitElement {
  @state()
  private status = '';

  @state()
  private statusError = false;

  /** Widget JSON string passed to the chart as a property, not an HTML attribute. */
  @state()
  private widgetJson = '{}';

  override firstUpdated(): void {
    const input = this.renderRoot.querySelector('textarea');
    if (input) input.value = SAMPLE;
    this.apply(SAMPLE);
  }

  private apply(text: string): void {
    try {
      const widget = widgetFromPastedJson(text);
      const chartType = typeof widget.chartType === 'string' ? widget.chartType : '(none)';
      const rows = Array.isArray(widget.data) ? widget.data.length : 0;
      this.widgetJson = JSON.stringify(widget);
      this.status = `Rendered ${chartType}. data rows: ${rows}.`;
      this.statusError = false;
    } catch (error) {
      this.status = error instanceof Error ? error.message : String(error);
      this.statusError = true;
    }
  }

  override render() {
    const geojson = storybookAssetUrl('geojson');
    const pmtiles = storybookAssetUrl('pmtiles');
    return html`
      <style>
        :host {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          height: 100%;
          min-height: 0;
          box-sizing: border-box;
        }
        label {
          font: 600 13px/1.2 system-ui, sans-serif;
        }
        textarea {
          width: 100%;
          height: 120px;
          box-sizing: border-box;
          resize: vertical;
          font: 12px/1.45 ui-monospace, monospace;
          padding: 8px;
        }
        .status {
          font: 12px/1.4 system-ui, sans-serif;
          min-height: 1.4em;
          color: ${this.statusError ? '#b91c1c' : 'inherit'};
        }
        .frame {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }
        ui9000-chart-renderer {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 0;
          flex: 1 1 auto;
          --ui9000-host-min-height: 0;
          --ui9000-plot-min-height: 0;
        }
      </style>
      <label>
        Widget JSON
        <textarea
          spellcheck="false"
          @input=${(event: Event) => {
            const target = event.target;
            if (target instanceof HTMLTextAreaElement) this.apply(target.value);
          }}
        ></textarea>
      </label>
      <div class="status">${this.status}</div>
      <div class="frame">
        <ui9000-chart-renderer
          .widgetJson=${this.widgetJson}
          scale="default"
          show-grid
          show-legend
          show-tooltip
          geojson-base-url=${geojson}
          pmtiles-base-url=${pmtiles}
        ></ui9000-chart-renderer>
      </div>
    `;
  }
}

const meta: Meta = {
  title: 'Guides/JSON playground',
  parameters: {
    controls: { disable: true },
    docs: {
      source: { type: 'code', code: '<ui9000-json-playground></ui9000-json-playground>' },
      description: {
        component:
          'Paste a FuseDash widget JSON (or a data-link body whose data is the widget). The chart renderer mounts whatever chartType is in the object. An empty dataUrl is ignored — rows in data are what get drawn.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const PasteJson: Story = {
  name: 'Paste JSON',
  render: () => html`<ui9000-json-playground></ui9000-json-playground>`,
};
