import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { FOUNDATIONS, findChartType } from '../catalog.js';
import { chartConfig } from '../charts/index.js';
import { LightElement } from '../lib/light-element.js';
import { parseHash, type Route } from '../lib/router.js';
import { rememberPath } from '../lib/recent.js';
import { applyTheme, currentTheme, THEME_EVENT, type ThemeMode } from '../lib/theme.js';
import { icons } from './icons.js';
import { brandLogo } from './logo.js';
import { SHORTCUT_KEYS, SHORTCUT_LABEL, type SiteSearch } from './site-search.js';
import './site-search.js';
import './site-sidebar.js';
import '../pages/intro-page.js';
import '../pages/chart-page.js';
import '../pages/soon-page.js';
import '../pages/spacing-page.js';

interface ResolvedPage {
  /** Changes when the page itself changes (not its section or settings). */
  key: string;
  title: string;
  content: unknown;
  /** Path to keep in the recent pages, for pages that exist (not "Soon" or not found). */
  path?: string;
}

/** The page element for each Foundations entry in the catalog. */
function foundationPage(id: string) {
  switch (id) {
    case 'spacing':
      return html`<site-spacing-page></site-spacing-page>`;
    default:
      return html`<site-soon-page .heading=${id} .group=${'Foundations'}></site-soon-page>`;
  }
}

const SITE_NAME = 'UI 9000 Docs';
const DRAWER_QUERY = '(max-width: 1023px)';

@customElement('site-app')
export class SiteApp extends LightElement {
  @state() private route: Route = parseHash();
  @state() private drawerOpen = false;
  @state() private theme: ThemeMode = currentTheme();
  /** Below 1024px the sidebar is a drawer. */
  @state() private narrow = matchMedia(DRAWER_QUERY).matches;

  private pageKey = '';
  private drawerMedia = matchMedia(DRAWER_QUERY);

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHashChange);
    window.addEventListener(THEME_EVENT, this.onThemeEvent);
    document.addEventListener('keydown', this.onKeydown);
    this.drawerMedia.addEventListener('change', this.onMediaChange);
  }

  override disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.onHashChange);
    window.removeEventListener(THEME_EVENT, this.onThemeEvent);
    document.removeEventListener('keydown', this.onKeydown);
    this.drawerMedia.removeEventListener('change', this.onMediaChange);
    super.disconnectedCallback();
  }

  private onHashChange = (): void => {
    this.route = parseHash();
    this.drawerOpen = false;
  };

  private onThemeEvent = (event: Event): void => {
    this.theme = (event as CustomEvent<ThemeMode>).detail;
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.drawerOpen) this.closeDrawer();
  };

  private onMediaChange = (): void => {
    this.narrow = this.drawerMedia.matches;
    if (!this.narrow) this.drawerOpen = false;
  };

  /**
   * Focus moves into the drawer on open and back to the menu button on close.
   */
  private async openDrawer(): Promise<void> {
    this.drawerOpen = true;
    await this.updateComplete;
    this.querySelector<HTMLElement>('.sidebar-drawer-head .icon-btn')?.focus();
  }

  private async closeDrawer(): Promise<void> {
    if (!this.drawerOpen) return;
    this.drawerOpen = false;
    await this.updateComplete;
    if (this.narrow) this.querySelector<HTMLElement>('.topbar-menu')?.focus();
  }

  /** Search opens over everything; a drawer left open behind it would hold focus after it closes. */
  private onSearchOpen = (): void => {
    this.drawerOpen = false;
  };

  private openSearch(): void {
    void this.querySelector<SiteSearch>('site-search')?.show();
  }

  private toggleTheme(): void {
    applyTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  private skipToContent(event: Event): void {
    event.preventDefault();
    this.querySelector<HTMLElement>('#main')?.focus();
  }

  private resolve(route: Route): ResolvedPage {
    const [section, id] = route.segments;
    if (!section || section === 'introduction') {
      // A section (`#/introduction/<section>`) is the page's rail's to open.
      return {
        key: 'introduction',
        title: 'Introduction',
        path: '/introduction',
        content: html`<site-intro-page></site-intro-page>`,
      };
    }
    if (section === 'charts' && id) {
      const found = findChartType(id);
      const config = chartConfig(id);
      if (found) {
        return {
          key: `charts/${id}`,
          title: `${found.type.label} chart`,
          path: config ? `/charts/${id}` : undefined,
          content: config
            ? keyed(
                id,
                html`<site-chart-page
                  .config=${config}
                  .category=${found.category}
                  .params=${route.params}
                ></site-chart-page>`,
              )
            : html`<site-soon-page .heading=${found.type.label} .group=${found.category.label}></site-soon-page>`,
        };
      }
    }
    if (section === 'foundations' && id) {
      const foundation = FOUNDATIONS.find((f) => f.id === id);
      if (foundation) {
        return {
          key: `foundations/${id}`,
          title: foundation.label,
          path: `/foundations/${id}`,
          content: foundationPage(foundation.id),
        };
      }
    }
    return {
      key: 'not-found',
      title: 'Page not found',
      content: html`<site-soon-page .heading=${'Page not found'} .missing=${true}></site-soon-page>`,
    };
  }

  protected override render() {
    const page = this.resolve(this.route);
    const drawer = this.drawerOpen;
    return html`
      <a class="skip-link" href="#main" @click=${this.skipToContent}>Skip to content</a>
      <header class="topbar" ?inert=${drawer}>
        <div class="topbar-inner surface-raised lit">
          <div class="topbar-start">
            <button
              class="icon-btn topbar-menu"
              type="button"
              aria-label="Open navigation"
              aria-controls="site-sidebar"
              aria-expanded=${drawer ? 'true' : 'false'}
              @click=${this.openDrawer}
            >
              ${icons.menu}
            </button>
            <a class="brand" href="#/introduction">
              <span class="brand-logo">${brandLogo('topbar-logo')}</span>
              <span class="brand-tag">Docs</span>
            </a>
          </div>
          <div class="topbar-center">
            <button
              class="search-trigger surface-inset"
              type="button"
              data-search-trigger
              aria-haspopup="dialog"
              aria-keyshortcuts=${SHORTCUT_KEYS}
              @click=${this.openSearch}
            >
              <span class="search-trigger-icon" aria-hidden="true">${icons.search}</span>
              <span class="search-trigger-label">Search docs</span>
              <kbd class="search-trigger-kbd" aria-hidden="true">${SHORTCUT_LABEL}</kbd>
            </button>
            <button
              class="icon-btn search-trigger-compact"
              type="button"
              data-search-trigger
              aria-label="Search"
              aria-haspopup="dialog"
              aria-keyshortcuts=${SHORTCUT_KEYS}
              @click=${this.openSearch}
            >
              ${icons.search}
            </button>
          </div>
          <div class="topbar-end">
            <button
              class="theme-switch"
              type="button"
              role="switch"
              aria-checked=${this.theme === 'dark' ? 'true' : 'false'}
              aria-label="Dark theme"
              @click=${this.toggleTheme}
            >
              <span class="theme-switch-knob">
                <span class="theme-switch-icon is-sun">${icons.sun}</span>
                <span class="theme-switch-icon is-moon">${icons.moon}</span>
              </span>
            </button>
          </div>
        </div>
      </header>
      <div class="layout">
        <nav
          id="site-sidebar"
          class="sidebar ${drawer ? 'is-open' : ''}"
          aria-label="Documentation"
          ?inert=${this.narrow && !drawer}
        >
          <div class="sidebar-drawer-head">
            <span class="brand">
              <span class="brand-logo">${brandLogo('drawer-logo')}</span>
              <span class="brand-tag">Docs</span>
            </span>
            <button class="icon-btn" type="button" aria-label="Close navigation" @click=${this.closeDrawer}>
              ${icons.close}
            </button>
          </div>
          <site-sidebar .route=${this.route}></site-sidebar>
        </nav>
        <div class="drawer-backdrop ${drawer ? 'is-visible' : ''}" @click=${this.closeDrawer}></div>
        <div class="content" ?inert=${drawer}>
          <main id="main" class="main" tabindex="-1">${page.content}</main>
          <footer class="footer">
            <span>© 2026 UI9000.com</span>
            <span class="footer-links">
              <a href="https://ui9000.com/" rel="noopener">ui9000.com</a>
              <a href="https://mcp.ui9000.com/storybook/" rel="noopener">Storybook</a>
            </span>
          </footer>
        </div>
      </div>
      <site-search @search-open=${this.onSearchOpen}></site-search>
    `;
  }

  protected override updated(changed: Map<string, unknown>): void {
    if (changed.has('route')) {
      const page = this.resolve(this.route);
      document.title = `${page.title} · ${SITE_NAME}`;
      if (page.key !== this.pageKey) {
        const first = this.pageKey === '';
        this.pageKey = page.key;
        if (page.path) rememberPath(page.path);
        if (!first) {
          window.scrollTo({ top: 0 });
          // Move focus to the new page's heading so keyboard and screen reader users land on it.
          requestAnimationFrame(() => this.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true }));
        }
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-app': SiteApp;
  }
}
