import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { dispatchUi9000Select } from '../../../element/dispatch-ui9000.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeTableModel, type CustomTableModel } from '../lib/table.js';
import { tableStyles } from './styles.js';

function asTableModel(raw: unknown): CustomTableModel | null {
  if (!raw) return null;
  if (typeof raw === 'object' && raw && 'columns' in raw && 'cells' in raw) {
    const model = raw as CustomTableModel;
    if (Array.isArray(model.columns) && Array.isArray(model.cells)) return model;
  }
  if (typeof raw === 'object' && raw && 'headers' in raw) {
    return normalizeTableModel(raw as { headers?: unknown; data?: unknown; tableData?: unknown; tablePreviewRows?: unknown });
  }
  return null;
}

@customElement('ui9000-table')
export class Ui9000Table extends LitElement {
  static override styles = tableStyles;

  @property({ type: String, attribute: 'data' })
  dataJson = '{}';

  @state()
  private _model: CustomTableModel | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._model = asTableModel(parseJsonAttr<unknown>(this.dataJson, null));
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      this._model = asTableModel(parseJsonAttr<unknown>(this.dataJson, null));
    }
  }

  private onRowClick(index: number): void {
    const key = this._model?.columns[0]?.key;
    const first = this._model?.cells[index]?.[0]?.text;
    dispatchUi9000Select(this, { id: first || (key ? `${key}-${index}` : String(index)) });
  }

  override render() {
    const table = this._model;
    if (!table) {
      return html`<div class="table-root" role="status">No table data</div>`;
    }
    return html`
      <div class="table-root" role="region" aria-label="Evidence table">
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                ${table.columns.map(
                  (col) => html`<th class="table-cell" data-header>${col.label}</th>`,
                )}
              </tr>
            </thead>
            <tbody>
              ${table.cells.map(
                (row, index) => html`
                  <tr
                    class="table-row"
                    tabindex="0"
                    @click=${() => this.onRowClick(index)}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.onRowClick(index);
                      }
                    }}
                  >
                    ${row.map((cell) =>
                      cell.badge
                        ? html`<td class="table-cell">
                            <span class="table-badge" data-type=${cell.badge}>${cell.text}</span>
                          </td>`
                        : html`<td class="table-cell">${cell.text}</td>`,
                    )}
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

export function registerTable(): void {
  if (!customElements.get('ui9000-table')) {
    customElements.define('ui9000-table', Ui9000Table);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-table': Ui9000Table;
  }
}
