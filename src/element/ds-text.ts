/**
 * HTML chart text rendered with `@fuselab-creative/design-system` `Typography`.
 * Font size, weight and line height come from the component. Color is the
 * host's `--ui9000-color-text` / `--ui9000-color-text-muted`, inherited by the
 * paragraph so a theme class cannot cover the host ink.
 * SVG plot labels stay SVG.
 */

import { html, type TemplateResult } from 'lit';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { StyleSheetManager, ThemeProvider } from 'styled-components';
import { lightTheme, Typography } from '@fuselab-creative/design-system';

const TAG = 'ui9000-typography';

export type DsTextSize = 'xs' | 'sm' | 'md' | 'lg';
export type DsTextWeight = 'regular' | 'semibold';

export type DsTextOptions = {
  type?: 'body' | 'heading';
  size?: DsTextSize;
  weight?: DsTextWeight;
};

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;

function listed<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function styleTarget(el: HTMLElement): HTMLElement | ShadowRoot {
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? root : document.head;
}

export class Ui9000Typography extends HTMLElement {
  static observedAttributes = ['type', 'size', 'weight', 'text'];

  private reactRoot: Root | null = null;
  private painted = '';

  connectedCallback(): void {
    this.paint();
  }

  disconnectedCallback(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
    this.painted = '';
  }

  attributeChangedCallback(name: string): void {
    // Lit sets type, size and weight before text. One paint, once text exists.
    if (name !== 'text' && this.getAttribute('text') === null) return;
    this.paint();
  }

  private paint(): void {
    const text = this.getAttribute('text') ?? '';
    const type = this.getAttribute('type') === 'heading' ? 'heading' : 'body';
    const size = listed(this.getAttribute('size'), SIZES, 'sm');
    const weight = this.getAttribute('weight') === 'semibold' ? 'semibold' : 'regular';
    const target = styleTarget(this);
    const key = `${type}|${size}|${weight}|${text}|${target === document.head ? 'head' : 'root'}`;
    if (this.reactRoot && key === this.painted) return;
    this.painted = key;
    if (!this.reactRoot) this.reactRoot = createRoot(this);
    flushSync(() => {
      this.reactRoot!.render(
        createElement(
          StyleSheetManager,
          { target },
          createElement(
            ThemeProvider,
            { theme: lightTheme },
            createElement(
              Typography,
              {
                type,
                size,
                weight,
                variant: 'neutral',
                color: 'default',
              },
              text,
            ),
          ),
        ),
      );
    });
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, Ui9000Typography);

/** Body text from the design-system `Typography` component. */
export function dsText(text: string, options: DsTextOptions = {}): TemplateResult {
  const type = options.type ?? 'body';
  const size = options.size ?? 'sm';
  const weight = options.weight ?? 'regular';
  return html`<ui9000-typography
    type=${type}
    size=${size}
    weight=${weight}
    text=${text}
  ></ui9000-typography>`;
}
