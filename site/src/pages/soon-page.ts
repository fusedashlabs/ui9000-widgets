import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LightElement } from '../lib/light-element.js';

/** Placeholder for pages that are listed but not written yet, and for unknown routes. */
@customElement('site-soon-page')
export class SiteSoonPage extends LightElement {
  @property() heading = '';
  @property() group = '';
  @property({ type: Boolean }) missing = false;

  protected override render() {
    return html`<article class="page soon-page">
      ${this.group ? html`<span class="eyebrow"># ${this.group}</span>` : null}
      <h1 class="page-title" tabindex="-1">${this.heading}</h1>
      <p class="page-lead">
        ${this.missing ? 'There is no page at this address.' : 'This page is coming soon.'}
        <a href="#/introduction">Back to the Introduction</a>.
      </p>
    </article>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-soon-page': SiteSoonPage;
  }
}
