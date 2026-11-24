import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { CATEGORIES, type CategoryEntry } from '../catalog.js';
import { isChartReady } from '../charts/index.js';
import { LightElement } from '../lib/light-element.js';
import { icons } from '../components/icons.js';
import { withPageRail } from '../components/page-rail.js';
import '../components/story-chart.js';

const STEPS = [
  {
    title: 'Pick a chart',
    text: 'Browse the categories in the sidebar or below, and open a chart page.',
  },
  {
    title: 'Set it up',
    text: 'Start from a preset, then change the settings. The chart, the address bar and the code follow every change, so a link brings back the exact same chart.',
  },
  {
    title: 'Copy the code',
    text: 'Open Code and copy the snippet: the element, its attributes and its data, ready to paste into a page.',
  },
];

@customElement('site-intro-page')
export class SiteIntroPage extends LightElement {
  /**
   * Category card with a live preview. Previews are inert (no tab stops, no pointer), so eight download menus
   * do not crowd the tab order; a card whose chart has a page is a single link that covers the whole card.
   */
  private card(category: CategoryEntry) {
    const { preview } = category;
    const type = category.types.find((t) => t.id === preview.typeId);
    const ready = isChartReady(preview.typeId);
    return html`<li class="category-item">
      <article class="category-card surface-raised lit ${ready ? 'is-link' : ''}">
        <div class="category-media chart-well" inert>
          <site-story-chart .load=${preview.load} .story=${preview.story}></site-story-chart>
        </div>
        <div class="category-info">
          <div class="category-title-row">
            <h3 class="category-title">
              ${ready
                ? html`<a class="category-link" href="#/charts/${preview.typeId}"
                    >${category.label}<span class="visually-hidden">: open the ${type?.label} chart page</span></a
                  >`
                : category.label}
            </h3>
            ${ready
              ? html`<span class="category-cta" aria-hidden="true">Open ${type?.label}${icons.arrowRight}</span>`
              : html`<span class="badge">Soon</span>`}
          </div>
          <p class="category-text">${category.description}</p>
          <p class="category-types"><span class="visually-hidden">Chart types: </span>${category.types
              .map((t) => t.label)
              .join(' · ')}</p>
        </div>
      </article>
    </li>`;
  }

  protected override render() {
    return withPageRail(
      '/introduction',
      html`<article class="page intro-page">
        <header class="intro-hero">
          <span class="eyebrow"># Get started</span>
          <h1 class="display" tabindex="-1">
            Charts, KPIs and custom visuals for AI <span class="accent-text">interaction</span>
          </h1>
          <p class="page-lead">
            Every day, we’re expanding our library with new charts, KPIs, and custom visuals designed to create
            smoother and more engaging AI interactions. This site shows each chart live, lets you set it up, and
            gives you the code.
          </p>
        </header>

        <section class="doc-section" aria-labelledby="overview">
          <h2 class="section-title" id="overview" tabindex="-1">What UI 9000 is</h2>
          <div class="prose">
            <p>
              UI 9000 brings interactive web components to the Model Context Protocol (MCP). Deliver rich,
              dynamic UI resources directly from your MCP server to be rendered by the client.
            </p>
            <p>
              Each chart is a custom element, such as <code>&lt;ui9000-bar-chart&gt;</code>. You pass its data as
              JSON in the <code>data</code> attribute and set its options as attributes, like
              <code>orientation</code> or <code>show-legend</code>. The components are built with Lit and D3.
            </p>
          </div>
        </section>

        <section class="doc-section" aria-labelledby="how-to-use">
          <h2 class="section-title" id="how-to-use" tabindex="-1">How to use this site</h2>
          <ol class="steps">
            ${STEPS.map(
              (step, i) => html`<li class="step surface-raised lit">
                <span class="step-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                <h3 class="step-title">${step.title}</h3>
                <p class="step-text">${step.text}</p>
              </li>`,
            )}
          </ol>
        </section>

        <section class="doc-section" aria-labelledby="categories">
          <h2 class="section-title" id="categories" tabindex="-1">Chart categories</h2>
          <p class="section-lead">
            Charts are grouped by what they show, in the same order as the Storybook. Open a card to set up its
            chart.
          </p>
          <ul class="category-grid">
            ${CATEGORIES.map((category) => this.card(category))}
          </ul>
        </section>

        <section class="doc-section" aria-labelledby="theme">
          <h2 class="section-title" id="theme" tabindex="-1">Light and dark</h2>
          <div class="prose">
            <p>
              Charts take their theme, scale and mode from CSS custom properties on the page (the widget
              context), so one switch restyles every chart at once. Try the theme button at the top of this page.
            </p>
          </div>
        </section>
      </article>`,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-intro-page': SiteIntroPage;
  }
}
