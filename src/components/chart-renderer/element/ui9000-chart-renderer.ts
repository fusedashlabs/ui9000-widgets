import type { WidgetHeaderHandlers } from '../../../element/widget-header.js';
import { loadChart } from '../../../lazy/index.js';
import type { WidgetScale } from '../../../types/index.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import {
  resolveChartTarget,
  resolveWidgetChartType,
  type ChartTargetAttrs,
} from '../lib/index.js';
import { chartRendererStyles } from './styles.js';

function applyTargetAttrs(el: HTMLElement, attrs?: ChartTargetAttrs): void {
  if (!attrs) return;
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'boolean') {
      if (value) el.setAttribute(key, '');
      else el.removeAttribute(key);
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

export class Ui9000ChartRenderer extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'data',
      'chart-type',
      'scale',
      'show-grid',
      'show-legend',
      'show-tooltip',
      'show-header',
      'header-variant',
      'embedded',
      'chart-title',
      'mapbox-token',
      'mapbox-dark-token',
      'geojson-base-url',
      'pmtiles-base-url',
    ];
  }

  private _host: HTMLDivElement | null = null;
  private _empty: HTMLDivElement | null = null;
  private _mountToken = 0;
  private _headerHandlers: WidgetHeaderHandlers = {};

  get headerHandlers(): WidgetHeaderHandlers {
    return this._headerHandlers;
  }

  set headerHandlers(value: WidgetHeaderHandlers) {
    this._headerHandlers = value ?? {};
    const chart = this._host?.firstElementChild;
    if (chart instanceof HTMLElement) this.applyHeaderHandlers(chart);
  }

  connectedCallback(): void {
    if (this._host) return;
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = chartRendererStyles.cssText;
    root.appendChild(style);

    this._host = document.createElement('div');
    this._host.className = 'host';
    this._host.part = 'chart';
    root.appendChild(this._host);

    this._empty = document.createElement('div');
    this._empty.className = 'empty';
    this._empty.part = 'empty';
    this._empty.hidden = true;
    root.appendChild(this._empty);

    void this.mountChart();
  }

  attributeChangedCallback(): void {
    if (this._host) void this.mountChart();
  }

  /** In-memory payload. Not mirrored to the `data` attribute — Storybook's HTML source pass splits quotes there and JSON.parse then fails at column 2. */
  private _widgetJson: string | null = null;

  private get dataJson(): string {
    return this._widgetJson ?? this.getAttribute('data') ?? '{}';
  }

  get widgetJson(): string {
    return this.dataJson;
  }

  set widgetJson(value: string) {
    const next = value && value.trim() ? value : '{}';
    if (next === this._widgetJson) return;
    this._widgetJson = next;
    if (this._host) void this.mountChart();
  }

  private get chartTypeAttr(): string {
    return this.getAttribute('chart-type') ?? '';
  }

  private get scale(): WidgetScale {
    return (this.getAttribute('scale') as WidgetScale) || 'default';
  }

  private applyBoolProp(el: HTMLElement, attr: string, prop: string): void {
    if (!this.hasAttribute(attr)) return;
    const on = this.getAttribute(attr) !== 'false';
    (el as unknown as Record<string, unknown>)[prop] = on;
  }

  private applyHeaderVariant(el: HTMLElement): void {
    const variant = this.getAttribute('header-variant');
    if (variant === 'dash' || variant === 'chat') el.setAttribute('header-variant', variant);
    else el.removeAttribute('header-variant');
  }

  private applyHeaderHandlers(el: HTMLElement): void {
    if (!('headerHandlers' in el)) return;
    (el as HTMLElement & { headerHandlers: WidgetHeaderHandlers }).headerHandlers =
      this._headerHandlers;
  }

  private copyHostAttr(el: HTMLElement, name: string): void {
    const value = this.getAttribute(name);
    if (value) el.setAttribute(name, value);
    else el.removeAttribute(name);
  }

  private boolAttr(name: string): boolean | undefined {
    if (!this.hasAttribute(name)) return undefined;
    return this.getAttribute(name) !== 'false';
  }

  private showEmpty(message: string, detail?: string): void {
    if (!this._empty || !this._host) return;
    this._host.replaceChildren();
    this._host.hidden = true;
    this._empty.hidden = false;
    this._empty.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = message;
    this._empty.appendChild(strong);
    if (detail) {
      const p = document.createElement('span');
      p.textContent = detail;
      this._empty.appendChild(p);
    }
  }

  private async mountChart(): Promise<void> {
    if (!this._host || !this._empty) return;
    const token = ++this._mountToken;

    const chartType = resolveWidgetChartType(this.dataJson, this.chartTypeAttr);
    if (!chartType) {
      this.showEmpty('No chart type', 'Pass chart-type or a widget payload with chartType.');
      return;
    }

    const target = resolveChartTarget(chartType);
    if (!target) {
      this.showEmpty(
        'Unsupported chart type',
        `"${chartType}" is not available in @ui9000/widgets yet.`,
      );
      return;
    }

    try {
      await loadChart(target.kind);
    } catch {
      if (token !== this._mountToken) return;
      this.showEmpty('Failed to load chart', target.kind);
      return;
    }

    if (token !== this._mountToken) return;

    const widget = parseJsonAttr<{ name?: string } | null>(this.dataJson, null);
    const title =
      this.getAttribute('show-header') === 'false'
        ? ''
        : this.getAttribute('chart-title')?.trim() ||
          (widget && typeof widget === 'object' ? widget.name?.trim() : '') ||
          '';

    let el = this._host.firstElementChild as HTMLElement | null;
    const reuse = !!el && el.tagName.toLowerCase() === target.tag;
    if (!reuse) {
      el = document.createElement(target.tag);
    }
    if (!el) return;

    const payload = this.dataJson;
    const dataProp = el as HTMLElement & { dataJson?: string };
    if ('dataJson' in el) dataProp.dataJson = payload;
    else el.setAttribute('data', payload);
    el.setAttribute('scale', this.scale);
    if (title) el.setAttribute('chart-title', title);
    else el.removeAttribute('chart-title');
    if (this.getAttribute('show-header') === 'false')
      el.setAttribute('show-header', 'false');
    else el.removeAttribute('show-header');
    this.applyHeaderVariant(el);
    this.applyHeaderHandlers(el);

    const showGrid = this.boolAttr('show-grid');
    const showLegend = this.boolAttr('show-legend');
    const showTooltip = this.boolAttr('show-tooltip');
    if (showGrid !== undefined) {
      if (showGrid) el.setAttribute('show-grid', '');
      else el.setAttribute('show-grid', 'false');
    }
    if (showLegend !== undefined) {
      if (showLegend) el.setAttribute('show-legend', '');
      else el.setAttribute('show-legend', 'false');
    }
    if (showTooltip !== undefined) {
      if (showTooltip) el.setAttribute('show-tooltip', '');
      else el.setAttribute('show-tooltip', 'false');
    }
    this.applyBoolProp(el, 'show-header', 'showHeader');
    this.applyBoolProp(el, 'show-grid', 'showGrid');
    this.applyBoolProp(el, 'show-legend', 'showLegend');
    this.applyBoolProp(el, 'show-tooltip', 'showTooltip');

    applyTargetAttrs(el, target.attrs);
    this.copyHostAttr(el, 'mapbox-token');
    this.copyHostAttr(el, 'mapbox-dark-token');
    this.copyHostAttr(el, 'geojson-base-url');
    this.copyHostAttr(el, 'pmtiles-base-url');
    el.style.display = 'block';
    el.style.width = '100%';
    el.style.height = '100%';
    if (this.hasAttribute('embedded')) {
      el.setAttribute('embedded', '');
      el.style.minHeight = '0';
      el.style.setProperty('--ui9000-host-min-height', '0');
      el.style.setProperty('--ui9000-plot-min-height', '0');
    } else {
      el.removeAttribute('embedded');
    }

    if (!reuse) {
      this._host.replaceChildren();
      this._host.appendChild(el);
    }

    this._empty.replaceChildren();
    this._empty.hidden = true;
    this._host.hidden = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-chart-renderer': Ui9000ChartRenderer;
  }
}

export function registerChartRenderer(): void {
  if (!customElements.get('ui9000-chart-renderer')) {
    customElements.define('ui9000-chart-renderer', Ui9000ChartRenderer);
  }
}

registerChartRenderer();
