import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeImageContent } from '../lib/url.js';

const imageStyles = css`
  .image-pane {
    display: flex;
    overflow: hidden;
    border-radius: 6px;
  }
  .image-pane img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

@customElement('ui9000-image')
export class Ui9000Image extends LitElement {
  static override styles = [surfaceStyles, imageStyles];

  @property({ type: String, attribute: 'data' })
  dataJson = '{}';

  @state()
  private _image: { src: string; alt: string } | null = null;

  private refresh(): void {
    this._image = normalizeImageContent(parseJsonAttr<Record<string, unknown>>(this.dataJson, {}));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.refresh();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) this.refresh();
  }

  override render() {
    if (!this._image) {
      return html`<p class="blocked" role="status">Image URL must be http(s)</p>`;
    }
    return html`
      <div class="root image-pane">
        <img src=${this._image.src} alt=${this._image.alt} referrerpolicy="no-referrer" />
      </div>
    `;
  }
}

export function registerImage(): void {
  if (!customElements.get('ui9000-image')) {
    customElements.define('ui9000-image', Ui9000Image);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-image': Ui9000Image;
  }
}
