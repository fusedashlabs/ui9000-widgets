import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { dispatchUi9000Submit } from '../../../element/dispatch-ui9000.js';
import { surfaceStyles } from '../../../element/surface-styles.js';
import { loadChart } from '../../../lazy/index.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeForm, type FormFieldKind, type FormModel } from '../lib/normalize.js';

@customElement('ui9000-form')
export class Ui9000Form extends LitElement {
  static override styles = surfaceStyles;

  @property({ type: String, attribute: 'data' })
  dataJson = '{}';

  @state()
  private _model: FormModel | null = null;

  private async refresh(): Promise<void> {
    this._model = normalizeForm(parseJsonAttr<unknown>(this.dataJson, null));
    const kinds = new Set((this._model?.fields ?? []).map((f) => f.kind));
    await Promise.all([...kinds].map((kind) => loadChart(kind)));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this.refresh();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) void this.refresh();
  }

  private fieldData(field: FormModel['fields'][number]): string {
    return JSON.stringify({
      label: field.label,
      name: field.id,
      value: field.value,
      options: field.options,
    });
  }

  private fieldValue(el: HTMLElement | null, fallback: string): string {
    if (!el) return fallback;
    const hostValue = (el as HTMLElement & { value?: string }).value;
    if (hostValue !== undefined) return String(hostValue);
    const inner = el.shadowRoot?.querySelector('input, select, textarea') as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
    return inner?.value ?? fallback;
  }

  private onSubmit(e: Event): void {
    e.preventDefault();
    const root = this.shadowRoot;
    if (!root || !this._model) return;
    const values: Record<string, unknown> = {};
    for (const field of this._model.fields) {
      const el = root.querySelector(`[data-field="${field.id}"]`) as HTMLElement | null;
      values[field.id] = this.fieldValue(el, field.value);
    }
    dispatchUi9000Submit(this, { values });
  }

  private renderField(field: FormModel['fields'][number]) {
    const data = this.fieldData(field);
    const kind: FormFieldKind = field.kind;
    switch (kind) {
      case 'number-input':
        return html`<ui9000-number-input data-field=${field.id} data=${data}></ui9000-number-input>`;
      case 'select':
        return html`<ui9000-select data-field=${field.id} data=${data}></ui9000-select>`;
      case 'multi-select':
        return html`<ui9000-multi-select data-field=${field.id} data=${data}></ui9000-multi-select>`;
      case 'checkbox':
        return html`<ui9000-checkbox data-field=${field.id} data=${data}></ui9000-checkbox>`;
      case 'date-input':
        return html`<ui9000-date-input data-field=${field.id} data=${data}></ui9000-date-input>`;
      default:
        return html`<ui9000-text-input data-field=${field.id} data=${data}></ui9000-text-input>`;
    }
  }

  override render() {
    const model = this._model;
    if (!model) {
      return html`<p class="blocked" role="alert">Labelled fields required</p>`;
    }
    return html`
      <form class="root" aria-label=${model.label} @submit=${(e: Event) => this.onSubmit(e)}>
        <p class="label">${model.label}</p>
        ${model.fields.map((field) => this.renderField(field))}
        <button class="btn" type="submit">Submit</button>
      </form>
    `;
  }
}

export function registerForm(): void {
  if (!customElements.get('ui9000-form')) {
    customElements.define('ui9000-form', Ui9000Form);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-form': Ui9000Form;
  }
}
