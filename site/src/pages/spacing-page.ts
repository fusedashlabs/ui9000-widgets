import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SCALE_PADDING, type WidgetScale } from '../../../src/types/index.js';
import { withPageRail } from '../components/page-rail.js';
import { LightElement } from '../lib/light-element.js';
import { cssValue, foundationHeader } from './foundation-parts.js';

/** The spacing steps the site itself uses (base.css). */
const STEPS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `--site-space-${i}`);

const DENSITIES: { scale: WidgetScale; label: string }[] = [
  { scale: 'compact', label: 'Compact' },
  { scale: 'default', label: 'Default' },
  { scale: 'comfortable', label: 'Comfortable' },
];

@customElement('site-spacing-page')
export class SiteSpacingPage extends LightElement {
  protected override render() {
    return withPageRail(
      '/foundations/spacing',
      html`<article class="page foundation-page">
        ${foundationHeader('Spacing', 'Space sits on a 4 px grid, and charts come in three densities.')}

        <section class="doc-section" aria-labelledby="scale">
          <h2 class="section-title" id="scale" tabindex="-1">Scale</h2>
          <p class="section-lead">
            Eight steps. Use the small ones inside a component and the large ones between sections.
          </p>
          <ul class="space-scale">
            ${STEPS.map(
              (variable) => html`<li class="space-row">
                <span class="space-value">${parseFloat(cssValue(variable))} px</span>
                <span class="space-bar" style=${`width: var(${variable})`} aria-hidden="true"></span>
              </li>`,
            )}
          </ul>
        </section>

        <section class="doc-section" aria-labelledby="chart-density">
          <h2 class="section-title" id="chart-density" tabindex="-1">Chart density</h2>
          <p class="section-lead">
            The <code>scale</code> attribute sets how much room a chart leaves between its card edge and the plot.
          </p>
          <ul class="density-grid">
            ${DENSITIES.map(
              ({ scale, label }) => html`<li class="density-card">
                <div class="density-frame" style=${`--density-pad: ${SCALE_PADDING[scale]}px`} aria-hidden="true">
                  <div class="density-plot"></div>
                </div>
                <span class="density-label">${label}</span>
                <span class="density-meta"><code>scale="${scale}"</code> · ${SCALE_PADDING[scale]} px</span>
              </li>`,
            )}
          </ul>
        </section>
      </article>`,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-spacing-page': SiteSpacingPage;
  }
}
