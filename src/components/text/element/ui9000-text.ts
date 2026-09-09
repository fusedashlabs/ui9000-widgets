import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeTextContent } from '../../image/lib/url.js';
import { renderMarkdown } from '../lib/markdown.js';

const textStyles = css`
  .text-pane {
    padding: 8px;
    text-align: left;
  }
  .text-pane .md p {
    margin: 0 0 10px;
  }
  .text-pane .md h1,
  .text-pane .md h2,
  .text-pane .md h3 {
    margin: 0 0 8px;
    font-weight: 600;
  }
  .text-pane .md a {
    color: var(--ui9000-color-primary, #473dd9);
  }
  .text-pane .md pre {
    margin: 0 0 10px;
    padding: 8px;
    overflow: auto;
    background: var(--ui9000-color-background, #f3f4f6);
    border-radius: 6px;
  }
`;

function asText(raw: unknown): string | null {
  if (typeof raw === 'string') return raw.trim() || null;
  if (raw && typeof raw === 'object' && 'text' in raw) {
    return normalizeTextContent(raw as { text?: unknown });
  }
  return null;
}

@customElement('ui9000-text')
export class Ui9000Text extends LitElement {
  static override styles = [surfaceStyles, textStyles];

  @property({ type: String, attribute: 'data' })
  dataJson = '{}';

  @state()
  private _text: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._text = asText(parseJsonAttr<unknown>(this.dataJson, this.dataJson));
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      this._text = asText(parseJsonAttr<unknown>(this.dataJson, this.dataJson));
    }
  }

  override render() {
    if (!this._text) {
      return html`<p class="blocked" role="status">No text</p>`;
    }
    return html`<div class="root text-pane" aria-label="Text">${renderMarkdown(this._text)}</div>`;
  }
}

export function registerText(): void {
  if (!customElements.get('ui9000-text')) {
    customElements.define('ui9000-text', Ui9000Text);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-text': Ui9000Text;
  }
}
