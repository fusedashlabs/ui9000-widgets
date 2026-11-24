import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../lib/light-element.js';
import { highlightHtml } from '../lib/highlight.js';
import { icons } from './icons.js';

/** How long the button reads "Copied" before it returns to "Copy". */
const COPIED_MS = 1500;
/** Lines shown while the block is collapsed: four to read, then two fading out under "Show all" (code.css). */
const PREVIEW_LINES = 6;

/** Copies text: the async clipboard, or a hidden textarea where that is blocked. True if it was copied. */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers or frames without the async clipboard.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/**
 * Embed snippet with line numbers and Copy. Collapsed it shows the first lines, a fade and "Show all N lines";
 * expanded it scrolls inside itself. Copy is always in the header and always copies the whole snippet, which
 * is exactly the text of the <code> element (the line numbers sit outside it).
 */
@customElement('site-code-panel')
export class SiteCodePanel extends LightElement {
  @property() code = '';
  @property() idPrefix = 'code';
  @state() private expanded = false;
  @state() private copied = false;

  private copiedTimer = 0;

  override disconnectedCallback(): void {
    clearTimeout(this.copiedTimer);
    super.disconnectedCallback();
  }

  private toggle(): void {
    this.expanded = !this.expanded;
    // Collapsing from far down the snippet: start again from its first line.
    if (!this.expanded) this.querySelector('.code-scroll')?.scrollTo({ top: 0 });
  }

  private async copy(): Promise<void> {
    const ok = await writeClipboard(this.code);
    if (!ok) return;
    this.copied = true;
    clearTimeout(this.copiedTimer);
    this.copiedTimer = window.setTimeout(() => {
      this.copied = false;
    }, COPIED_MS);
  }

  protected override render() {
    const titleId = `${this.idPrefix}-title`;
    const scrollId = `${this.idPrefix}-lines`;
    const tokens = highlightHtml(this.code);
    const lineCount = this.code.split('\n').length;
    const collapsible = lineCount > PREVIEW_LINES;
    const collapsed = collapsible && !this.expanded;
    const numbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
    return html`<section
      class="panel surface lit lit-clipped code-panel ${this.expanded ? 'is-expanded' : ''} ${collapsed ? 'is-collapsed' : ''}"
      aria-labelledby=${titleId}
    >
      <div class="panel-header code-header">
        <h2 class="panel-title" id=${titleId}>Code</h2>
        <button
          class="btn btn-primary btn-xs copy-button ${this.copied ? 'is-copied' : ''}"
          type="button"
          aria-label="Copy code"
          @click=${this.copy}
        >
          ${this.copied ? icons.check : icons.copy}${this.copied ? 'Copied' : 'Copy'}
        </button>
        <span class="visually-hidden" role="status">${this.copied ? 'Code copied to the clipboard' : ''}</span>
      </div>
      <div class="code-body">
        <div class="code-scroll" id=${scrollId} tabindex="0" role="region" aria-label="Embed code">
          <div class="code-gutter" aria-hidden="true">${numbers}</div>
          <pre class="code"><code>${tokens.map((t) => html`<span class="tok-${t.kind}">${t.text}</span>`)}</code></pre>
        </div>
        ${collapsed ? html`<div class="code-fade" aria-hidden="true"></div>` : nothing}
      </div>
      ${collapsible
        ? html`<div class="code-footer">
            <button
              class="btn btn-secondary btn-xs code-more"
              type="button"
              aria-expanded=${this.expanded ? 'true' : 'false'}
              aria-controls=${scrollId}
              @click=${this.toggle}
            >
              ${this.expanded ? icons.chevronUp : icons.chevronDown}${this.expanded ? 'Collapse' : `Show all ${lineCount} lines`}
            </button>
          </div>`
        : nothing}
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-code-panel': SiteCodePanel;
  }
}
