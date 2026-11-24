import { renderStoryElement, type StoryModule } from '../lib/stories.js';
import { currentTheme, THEME_EVENT, type ThemeMode } from '../lib/theme.js';

/**
 * Mounts the real ui9000-* element of a Storybook story, with that story's fixture data.
 * The chart plays its own entrance when it scrolls into view; this element adds no motion of its own.
 * A plain custom element on purpose: it owns its children, so no template renderer may touch them.
 */
export class SiteStoryChart extends HTMLElement {
  load?: () => Promise<StoryModule>;
  story = 'Default';
  label = '';

  private chart: HTMLElement | null = null;

  connectedCallback(): void {
    window.addEventListener(THEME_EVENT, this.onTheme);
    void this.mount();
  }

  disconnectedCallback(): void {
    window.removeEventListener(THEME_EVENT, this.onTheme);
  }

  private async mount(): Promise<void> {
    if (!this.load || this.chart) return;
    const mod = await this.load();
    if (!this.isConnected || this.chart) return;
    const chart = renderStoryElement(mod, this.story, currentTheme());
    if (!chart) return;
    chart.style.cssText = 'display:block;width:100%;height:100%;';
    if (this.label) chart.setAttribute('aria-label', this.label);
    this.chart = chart;
    this.replaceChildren(chart);
  }

  /** Some stories pass the theme as an attribute (Flow sankey); keep it in step with the toggle. */
  private onTheme = (event: Event): void => {
    const mode = (event as CustomEvent<ThemeMode>).detail;
    if (this.chart?.hasAttribute('theme')) this.chart.setAttribute('theme', mode);
  };
}

customElements.define('site-story-chart', SiteStoryChart);

declare global {
  interface HTMLElementTagNameMap {
    'site-story-chart': SiteStoryChart;
  }
}
