import { html } from 'lit';

/** Shared pieces of the Foundations pages (Color, Typography, Spacing, Motion). */

export function foundationHeader(title: string, lead: unknown) {
  return html`<header class="foundation-header">
    <span class="eyebrow"># Foundations</span>
    <h1 class="page-title" tabindex="-1">${title}</h1>
    <p class="page-lead">${lead}</p>
  </header>`;
}

/** Reads a custom property from the page, e.g. cssValue('--site-space-4') → '16px'. */
export function cssValue(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
