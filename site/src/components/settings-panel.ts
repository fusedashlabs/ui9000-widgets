import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../lib/light-element.js';
import type { ControlSpec, ControlValue, ControlValues } from '../lib/controls.js';
import { icons } from './icons.js';
import { presetIcon, type PresetIconId } from './preset-icons.js';

export interface SettingChangeDetail {
  name: string;
  value: ControlValue;
}

export interface PresetChangeDetail {
  id: string;
}

export interface PresetTile {
  id: string;
  label: string;
  icon: PresetIconId;
}

/**
 * Settings panel: the presets as tiles with a picture of their data, then the controls generated from the chart's
 * config (see lib/controls.ts), with a heading where a titled group (such as "Header") starts. Every control is a
 * row, label left and control right; the controls other than switches start at one label column, so they line up.
 *
 * A control that has no effect in the current state, whether the preset's data or another setting rules it out, is
 * not rendered (`hiddenSettings`); its value stays in the page's state and comes back with the control.
 *
 * Uses native inputs only, so labels, focus and keyboard behaviour (Tab, Space, arrow keys in radio groups) come
 * for free. Fires `preset-change` with { id }, `setting-change` with { name, value } and `settings-reset`.
 */
@customElement('site-settings-panel')
export class SiteSettingsPanel extends LightElement {
  @property({ attribute: false }) controls: ControlSpec[] = [];
  @property({ attribute: false }) values: ControlValues = {};
  /** Controls that have no effect in the current state. Not rendered. */
  @property({ attribute: false }) hiddenSettings: string[] = [];
  /** Prefix for input ids, unique per page. */
  @property() idPrefix = 'setting';
  /** Sample data to start from; the first setting. */
  @property({ attribute: false }) presets: PresetTile[] = [];
  @property() presetId = '';
  /** True when the values differ from the preset: shows "Modified" and enables Reset. */
  @property({ type: Boolean }) dirty = false;

  /** More settings above / below the visible part of the list: each shows a fade at that edge. */
  @state() private moreAbove = false;
  @state() private moreBelow = false;

  private resizeObserver = new ResizeObserver(() => this.measure());

  override disconnectedCallback(): void {
    this.resizeObserver.disconnect();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    const body = this.querySelector<HTMLElement>('.settings-body');
    if (!body) return;
    this.resizeObserver.observe(body);
    for (const child of body.children) this.resizeObserver.observe(child);
  }

  private measure = (): void => {
    const body = this.querySelector<HTMLElement>('.settings-body');
    if (!body) return;
    const above = body.scrollTop > 1;
    const below = body.scrollTop + body.clientHeight < body.scrollHeight - 1;
    if (above !== this.moreAbove) this.moreAbove = above;
    if (below !== this.moreBelow) this.moreBelow = below;
  };

  /**
   * A select keeps the option the user picked even when its `selected` attributes change, so after each render
   * every select is set to the value the state says.
   */
  protected override updated(): void {
    for (const select of this.querySelectorAll<HTMLSelectElement>('select[data-value]')) {
      if (select.value !== select.dataset.value) select.value = select.dataset.value ?? '';
    }
    // A preset or setting that hides or shows settings changes the list's height; measure once the layout has settled.
    requestAnimationFrame(this.measure);
  }

  private emit(name: string, value: ControlValue): void {
    this.dispatchEvent(
      new CustomEvent<SettingChangeDetail>('setting-change', { detail: { name, value }, bubbles: true, composed: true }),
    );
  }

  private reset(): void {
    this.dispatchEvent(new CustomEvent('settings-reset', { bubbles: true, composed: true }));
  }

  private pickPreset(id: string): void {
    this.dispatchEvent(new CustomEvent<PresetChangeDetail>('preset-change', { detail: { id }, bubbles: true, composed: true }));
  }

  /**
   * The presets as a radio group of tiles: the picture of the data, then the name. Arrow keys move between them, as
   * in any radio group. The selected tile takes no hover: clicking it again changes nothing.
   */
  private renderPresets() {
    if (!this.presets.length) return nothing;
    const id = `${this.idPrefix}-preset`;
    return html`<fieldset class="control control-preset" id=${id} data-setting="preset">
      <legend class="control-label preset-legend">
        Preset${this.dirty
          ? html`<span class="visually-hidden"> (modified)</span
              ><span class="badge badge-accent preset-modified" aria-hidden="true">Modified</span>`
          : nothing}
      </legend>
      <div class="preset-tiles">
        ${this.presets.map(
          (preset) => html`<label class="preset-tile">
            <input
              type="radio"
              id=${`${id}-${preset.id}`}
              name=${id}
              .value=${preset.id}
              .checked=${preset.id === this.presetId}
              @change=${() => this.pickPreset(preset.id)}
            />
            <span class="preset-face surface-inset">
              ${presetIcon(preset.icon)}
              <span class="preset-label">${preset.label}</span>
            </span>
          </label>`,
        )}
      </div>
    </fieldset>`;
  }

  private renderControl(control: ControlSpec) {
    const id = `${this.idPrefix}-${control.name}`;
    const value = this.values[control.name];

    switch (control.kind) {
      /*
       * The legend names the group for assistive technology; the row shows the label as a grid item beside the
       * options. WebKit lays out any legend (floated too) above a fieldset's content, so the legend can't be that item.
       */
      case 'segmented':
        return html`<fieldset class="control control-segmented" data-setting=${control.name}>
          <legend class="visually-hidden">${control.label}</legend>
          <div class="control-row">
            <span class="control-label" aria-hidden="true">${control.label}</span>
            <div class="segmented surface-inset">
              ${control.options?.map(
                (option) => html`<label class="segment">
                  <input
                    type="radio"
                    name=${id}
                    .value=${option.value}
                    .checked=${value === option.value}
                    @change=${() => this.emit(control.name, option.value)}
                  />
                  <span class="segment-label">${option.label}</span>
                </label>`,
              )}
            </div>
          </div>
        </fieldset>`;

      case 'select':
        return html`<div class="control control-row" data-setting=${control.name}>
          <label class="control-label" for=${id}>${control.label}</label>
          <div class="select-wrap">
            <select
              id=${id}
              class="input surface-inset select"
              data-value=${String(value ?? '')}
              @change=${(e: Event) => this.emit(control.name, (e.target as HTMLSelectElement).value)}
            >
              ${control.options?.map(
                (option) => html`<option .value=${option.value} ?selected=${value === option.value}>${option.label}</option>`,
              )}
            </select>
            <span class="select-icon" aria-hidden="true">${icons.chevronDown}</span>
          </div>
        </div>`;

      case 'switch':
        return html`<div class="control control-switch" data-setting=${control.name}>
          <label class="switch" for=${id}>
            <span class="control-label">${control.label}</span>
            <input
              id=${id}
              class="switch-input"
              type="checkbox"
              role="switch"
              .checked=${value === true}
              @change=${(e: Event) => this.emit(control.name, (e.target as HTMLInputElement).checked)}
            />
            <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
          </label>
        </div>`;

      case 'number':
        return html`<div class="control control-row" data-setting=${control.name}>
          <label class="control-label" for=${id}>${control.label}</label>
          <input
            id=${id}
            class="input surface-inset"
            type="number"
            inputmode="decimal"
            min=${control.min ?? nothing}
            max=${control.max ?? nothing}
            step=${control.step ?? 'any'}
            .value=${String(value ?? '')}
            @input=${(e: Event) => {
              const input = e.target as HTMLInputElement;
              if (input.value !== '' && input.validity.valid) this.emit(control.name, Number(input.value));
            }}
          />
        </div>`;

      case 'text':
        return html`<div class="control control-row" data-setting=${control.name}>
          <label class="control-label" for=${id}>${control.label}</label>
          <input
            id=${id}
            class="input surface-inset"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="None"
            title=${String(value ?? '') || nothing}
            .value=${String(value ?? '')}
            @input=${(e: Event) => this.emit(control.name, (e.target as HTMLInputElement).value)}
          />
        </div>`;
    }
  }

  protected override render() {
    const titleId = `${this.idPrefix}-title`;
    const shown = this.controls.filter((c) => !this.hiddenSettings.includes(c.name));
    return html`<section class="panel surface lit lit-clipped settings-panel" aria-labelledby=${titleId}>
      <div class="panel-header settings-header">
        <h2 class="panel-title" id=${titleId}>Settings</h2>
        <button class="btn btn-secondary btn-xs" type="button" ?disabled=${!this.dirty} @click=${this.reset}>
          ${icons.reset}Reset
        </button>
      </div>
      <div class="settings-scroll ${this.moreAbove ? 'has-more-above' : ''} ${this.moreBelow ? 'has-more-below' : ''}">
        <div class="settings-body" @scroll=${this.measure}>
          ${this.renderPresets()} ${shown.map((control, i) => [
            // A group's heading comes before its first shown control, so a group with every control hidden has none.
            control.group && control.group !== shown[i - 1]?.group
              ? html`<h3 class="settings-group">${control.group}</h3>`
              : nothing,
            this.renderControl(control),
          ])}
        </div>
      </div>
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-settings-panel': SiteSettingsPanel;
  }
}
