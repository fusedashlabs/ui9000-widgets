import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { CategoryEntry } from '../catalog.js';
import type { ChartConfig, ChartRuntime } from '../charts/types.js';
import {
  applyState,
  dataWithControls,
  differsFromPreset,
  effectiveValues,
  embedSnippet,
  hiddenControls,
  inertControls,
  paramsFromState,
  presetValues,
  stateFromParams,
  type AvailabilityContext,
  type ChartPreset,
  type ChartState,
} from '../lib/chart-state.js';
import { chartControls, humanize, type ControlSpec } from '../lib/controls.js';
import { describeData, type FieldRow } from '../lib/data-format.js';
import { LightElement } from '../lib/light-element.js';
import { parseHash, replaceParams } from '../lib/router.js';
import type { PresetChangeDetail, SettingChangeDetail } from '../components/settings-panel.js';
import type { AccordionSection, SectionToggleDetail, SiteAccordion } from '../components/accordion.js';
import '../components/accordion.js';
import '../components/settings-panel.js';
import '../components/code-panel.js';

/** Counts series without the chart's own code: FuseDash groups, `series`, else one. */
function countSeriesGeneric(data: unknown): number {
  if (!data || typeof data !== 'object') return 1;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.series)) return d.series.length;
  const group = Array.isArray(d.groupBy) ? d.groupBy[0] : d.groupBy;
  const unique = (d.uniqueValues as Record<string, unknown[]> | undefined)?.[group as string];
  return typeof group === 'string' && group && Array.isArray(unique) ? unique.length : 1;
}

/**
 * One page for every chart: title, the live element, settings (preset first), code, then When to use, Data format and
 * Attributes as rows of one accordion (`?section=<id>` opens one). Everything chart-specific comes from the chart's config (charts/configs/<id>.ts). The element and
 * the sample data load lazily when the page opens.
 */
@customElement('site-chart-page')
export class SiteChartPage extends LightElement {
  @property({ attribute: false }) config!: ChartConfig;
  @property({ attribute: false }) category?: CategoryEntry;
  @property({ attribute: false }) params: URLSearchParams = new URLSearchParams();

  @state() private chartState!: ChartState;
  /** Set once the element and every preset's data have loaded. */
  @state() private runtime: ChartRuntime | null = null;

  private controls: ControlSpec[] = [];
  private presets: ChartPreset[] = [];
  private chart?: HTMLElement;
  /** Query string this page last wrote, so its own URL updates are not read back as navigation. */
  private writtenQuery: string | null = null;
  /** The `?section=` already opened, so a settings change does not scroll back to it. */
  private openedSection: string | null = null;

  /** `?section=`, read from the address bar: the page drops it without a hashchange, so the route's copy can be stale. */
  private get linkedSection(): string | null {
    return parseHash().params.get('section');
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('config')) {
      this.controls = chartControls(this.config);
      this.presets = this.config.presets.map((p) => ({ id: p.id, label: p.label, values: p.values ?? {}, data: undefined }));
      this.runtime = null;
      void this.load(this.config);
    }
    if (changed.has('config') || (changed.has('params') && this.params.toString() !== this.writtenQuery)) {
      const legacy = this.config.legacyPresets ?? {};
      this.chartState = stateFromParams(this.controls, this.presets, this.params, legacy);
      // An old preset id: rewrite the link in today's terms (preset plus settings).
      const requested = this.params.get('preset') ?? '';
      if (Object.hasOwn(legacy, requested) && !this.presets.some((p) => p.id === requested)) this.commit(this.chartState);
    }
  }

  private async load(config: ChartConfig): Promise<void> {
    const [runtime, ...data] = await Promise.all([config.load(), ...config.presets.map((p) => p.data())]);
    if (config !== this.config) return;
    this.presets.forEach((preset, i) => (preset.data = data[i]));
    this.runtime = runtime ?? {};
  }

  private get preset(): ChartPreset {
    return this.presets.find((p) => p.id === this.chartState.presetId) ?? this.presets[0];
  }

  /** A state's preset data and values, as the controls' hiddenWhen and inertWhen see them. */
  private context(state: ChartState): AvailabilityContext {
    const preset = this.presets.find((p) => p.id === state.presetId) ?? this.presets[0];
    const count = this.runtime?.countSeries ?? countSeriesGeneric;
    return { seriesCount: count(preset.data), values: state.values, data: preset.data };
  }

  /** Controls a state's preset data rules out. None until the data has loaded: an old link is rewritten before that. */
  private hiddenIn(state: ChartState): string[] {
    return this.runtime ? hiddenControls(this.controls, this.context(state)) : [];
  }

  /** Controls the panel leaves out: the ones the preset's data rules out, and the ones another setting does. */
  private get hiddenSettings(): string[] {
    if (!this.runtime) return [];
    return [...new Set([...this.hiddenIn(this.chartState), ...inertControls(this.controls, this.context(this.chartState))])];
  }

  /** What the chart and the snippet get (see effectiveValues). */
  private get applied() {
    return effectiveValues(this.controls, this.chartState.values, this.hiddenSettings);
  }

  /** Writes the settings into the link; a `?section=` there stays, as long as its section is open. */
  private commit(next: ChartState): void {
    this.chartState = next;
    const params = paramsFromState(this.controls, this.presets, next, this.hiddenIn(next));
    const section = this.linkedSection;
    if (section) params.set('section', section);
    this.writtenQuery = params.toString();
    replaceParams(params);
  }

  /** Closing the section the link names takes `?section=` out of the link. */
  private onSectionToggle(event: CustomEvent<SectionToggleDetail>): void {
    const { id, open } = event.detail;
    if (open || this.linkedSection !== id) return;
    const { params } = parseHash();
    params.delete('section');
    this.writtenQuery = params.toString();
    replaceParams(params);
    // So the same link opens it again.
    this.openedSection = null;
  }

  private choosePreset(preset: ChartPreset): void {
    this.commit({ presetId: preset.id, values: presetValues(this.controls, preset) });
  }

  private onPresetChange(event: CustomEvent<PresetChangeDetail>): void {
    const preset = this.presets.find((p) => p.id === event.detail.id);
    if (preset) this.choosePreset(preset);
  }

  private onSettingChange(event: CustomEvent<SettingChangeDetail>): void {
    const { name, value } = event.detail;
    this.commit({ ...this.chartState, values: { ...this.chartState.values, [name]: value } });
  }

  private onReset(): void {
    this.choosePreset(this.preset);
  }

  protected override updated(): void {
    const stage = this.querySelector<HTMLElement>('.chart-stage');
    if (!stage || !this.runtime) return;
    const label = `${this.config.title} chart, ${this.preset.label}`;
    if (!this.chart) {
      this.chart = document.createElement(this.config.tag);
      this.chart.setAttribute('aria-label', label);
      stage.append(this.chart);
    }
    applyState(this.chart, this.controls, this.applied, this.preset.data);
    this.chart.setAttribute('aria-label', label);
    const section = this.linkedSection;
    if (!section) this.openedSection = null;
    else if (section !== this.openedSection) {
      this.openedSection = section;
      void this.openSection(section);
    }
  }

  /** Two frames on, so it runs after a page change has scrolled to the top and focused the page title. */
  private async openSection(id: string): Promise<void> {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await this.querySelector<SiteAccordion>('site-accordion')?.reveal(id);
  }

  private fieldTable(rows: FieldRow[], caption: string) {
    return html`<div class="doc-table-wrap">
      <table class="doc-table">
        <caption class="visually-hidden">${caption}</caption>
        <thead>
          <tr><th scope="col">Field</th><th scope="col">In this preset</th><th scope="col">What it does</th></tr>
        </thead>
        <tbody>
          ${rows.map(
            (row) => html`<tr class=${row.used ? '' : 'is-unused'}>
              <th scope="row"><code>${row.field}</code></th>
              <td><code>${row.example}</code></td>
              <td>${row.meaning}</td>
            </tr>`,
          )}
        </tbody>
      </table>
    </div>`;
  }

  private dataFormatSection(): AccordionSection {
    const { config, preset } = this;
    const format = describeData(dataWithControls(this.controls, this.applied, preset.data), config.dataFields);
    return {
      id: 'data-format',
      headingId: `${config.id}-data-format`,
      title: 'Data format',
      hint: preset.label,
      content: html`<p class="doc-lead">${format.summary} Shown for the preset “${preset.label}”.</p>
      ${format.fields.length ? this.fieldTable(format.fields, 'Fields of the data') : nothing}
      ${format.item
        ? html`<h3 class="when-title">${format.item.title}</h3>
            ${this.fieldTable(format.item.fields, format.item.title)}`
        : nothing}`,
    };
  }

  private attributesSection(): AccordionSection {
    const { config } = this;
    const typeOf = (c: ControlSpec) =>
      c.options ? c.options.map((o) => `"${o.value}"`).join(' | ') : c.kind === 'switch' ? 'boolean' : c.kind === 'number' ? 'number' : 'string';
    const defaultOf = (c: ControlSpec) => (c.defaultValue === '' ? '—' : String(c.defaultValue));
    const scriptOnly = this.controls.filter((c) => c.kind === 'switch' && c.defaultValue === true && !c.falseAttribute && !c.dataField);
    // Every row of the table: `data`, then each control (with those set in the data, `data → stacked`).
    const count = 1 + this.controls.length;
    return {
      id: 'attributes',
      headingId: `${config.id}-attributes`,
      title: 'Attributes',
      hint: `${count} attributes`,
      content: html`<div class="doc-table-wrap">
        <table class="doc-table">
          <caption class="visually-hidden">Attributes of ${config.tag}</caption>
          <thead>
            <tr><th scope="col">Attribute</th><th scope="col">Type</th><th scope="col">Default</th><th scope="col">Description</th></tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row"><code>data</code></th>
              <td><code>JSON string</code></td>
              <td><code>[]</code></td>
              <td>The data, in one of the shapes under Data format.</td>
            </tr>
            ${this.controls.map(
              (c) => html`<tr>
                <th scope="row"><code>${c.dataField ? `data → ${c.dataField}` : c.attribute}</code></th>
                <td><code>${typeOf(c)}</code></td>
                <td class="doc-default"><code>${defaultOf(c)}</code></td>
                <td>${c.description}${c.dataField ? ' Set in the data, not as an attribute.' : ''}</td>
              </tr>`,
            )}
          </tbody>
        </table>
      </div>
      ${scriptOnly.length
        ? html`<p class="doc-note">
            ${scriptOnly.map((c, i) => html`${i ? ', ' : ''}<code>${c.attribute}</code>`)}: on by default. Any value of the
            attribute reads as on, so turn them off from script, for example <code>chart.${scriptOnly[0].name} = false</code>.
            The code block does this for you.
          </p>`
        : nothing}`,
    };
  }

  private whenToUseSection(): AccordionSection {
    const { config } = this;
    const { useFor, avoid } = config.whenToUse;
    const roles = this.runtime?.dataRoles ?? [];
    return {
      id: 'when-to-use',
      headingId: `${config.id}-when`,
      title: 'When to use',
      hint: `${useFor.length} good · ${avoid.length} avoid`,
      defaultOpen: true,
      className: 'when-to-use',
      content: html`<div class="when-grid">
          <div>
            <h3 class="when-title">Good for</h3>
            <ul class="when-list">
              ${useFor.map((item) => html`<li>${item}</li>`)}
            </ul>
          </div>
          <div>
            <h3 class="when-title">Avoid for</h3>
            <ul class="when-list">
              ${avoid.map((item) => html`<li>${item}</li>`)}
            </ul>
          </div>
        </div>
        ${roles.length
          ? html`<h3 class="when-title">Data it expects</h3>
              <ul class="role-list">
                ${roles.map(
                  (role) => html`<li class="role">
                    <span class="role-name">${humanize(role.id)}</span>
                    <span class="badge">${role.required ? 'Required' : 'Optional'}</span>
                    ${role.description ? html`<span class="role-text">${role.description}</span>` : null}
                  </li>`,
                )}
              </ul>`
          : null}`,
    };
  }

  protected override render() {
    const { config } = this;
    const header = html`<header class="chart-header">
      ${this.category ? html`<span class="eyebrow"># ${this.category.label}</span>` : null}
      <h1 class="page-title" tabindex="-1">${config.title}</h1>
      <p class="page-lead">${config.description}</p>
    </header>`;
    if (!this.runtime) {
      return html`<article class="page chart-layout">
        <div class="chart-main">${header}<div class="chart-stage-area"><div class="chart-stage chart-well lit" aria-busy="true"></div></div></div>
      </article>`;
    }
    const { preset } = this;
    const values = this.chartState.values;
    const snippet = embedSnippet(config.tag, this.controls, this.applied, preset.data);
    return html`
      <article class="page chart-layout">
        <div class="chart-main">
          ${header}

          <div class="chart-stage-area"><div class="chart-stage chart-well lit"></div></div>
        </div>

        <aside class="chart-aside" aria-label="Chart settings and code">
          <site-settings-panel
            .controls=${this.controls}
            .values=${values}
            .hiddenSettings=${this.hiddenSettings}
            .presets=${config.presets}
            .presetId=${preset.id}
            .idPrefix=${`${config.id}-setting`}
            ?dirty=${differsFromPreset(this.controls, preset, values, this.hiddenSettings)}
            @preset-change=${this.onPresetChange}
            @setting-change=${this.onSettingChange}
            @settings-reset=${this.onReset}
          ></site-settings-panel>
          <site-code-panel .code=${snippet} .idPrefix=${`${config.id}-code`}></site-code-panel>
        </aside>

        <site-accordion
          class="chart-docs"
          .sections=${[this.whenToUseSection(), this.dataFormatSection(), this.attributesSection()]}
          .idPrefix=${config.id}
          @section-toggle=${this.onSectionToggle}
        ></site-accordion>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-chart-page': SiteChartPage;
  }
}
