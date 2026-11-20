import { LitElement } from 'lit';

/** Site components render into light DOM so the global site stylesheets (and only they) style them. */
export class LightElement extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }
}
