import { html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeAssetHealth } from '../lib/normalize.js';
import { assetHealthPalette, type AssetHealthMode } from '../lib/palette.js';
import { buildScene, type AssetHealthScene } from '../lib/scene.js';
import type { AssetHealthCategory, AssetHealthProblem } from '../lib/types.js';
import { DEFAULT_ORBIT, orbitBy, type Orbit } from '../render/camera.js';
import { drawAssetHealthOverview, type AssetHealthHandlers } from '../render/draw.js';
import { assetHealthStyles } from './styles.js';
import { dsText } from '../../../element/ds-text.js';

let nextSceneId = 0;

/** Pixels the pointer may travel before a press counts as an orbit drag. */
const DRAG_THRESHOLD = 3;

export interface AssetHealthShowAgentsDetail {
  categoryId: string;
  categoryName: string;
  problem: AssetHealthProblem;
}

export interface AssetHealthOpenRuleDetail {
  problem: AssetHealthProblem;
}

interface DragState extends Orbit {
  x: number;
  y: number;
  moved: boolean;
}

/**
 * Local Storybook-style wrappers may set `data-theme`. App shells that put
 * `data-theme` on `<html>` (FuseDash) are ignored so host `--ui9000-*` wins.
 */
function themeFromLocalAncestor(el: Element): AssetHealthMode | '' {
  const themed = el.closest('[data-theme]');
  if (!themed || themed === el.ownerDocument?.documentElement) return '';
  const value = themed.getAttribute('data-theme')?.trim();
  return value === 'dark' || value === 'light' ? value : '';
}

/**
 * Asset health overview: a goal as a tilted bowl. Agents sit on a stepped core,
 * assets are tiled in category sectors, the last 24h is the outer wall (red = errors)
 * and problems rise out of their tile as beams with a callout.
 *
 * Drag to orbit, double-click to reset, click a tile or header to isolate a
 * category, click a beam for the problem card. The card's buttons fire
 * `show-agents` and `open-rule`.
 *
 * `theme` switches the stage (`light` / `dark`). Left empty it follows a local
 * `data-theme` wrapper (not `<html>`), then `paintMode` / host `--ui9000-*`.
 */
@customElement('ui9000-asset-health-overview')
export class Ui9000AssetHealthOverview extends Ui9000ChartElement {
  static override styles = [chartShellStyles, assetHealthStyles];

  /** Top-down view: no orbit, tiles and wall drawn without height. */
  @property({ type: Boolean, reflect: true })
  flat = false;

  /** Dims healthy tiles so only problems stand out. */
  @property({ type: Boolean, attribute: 'problems-only', reflect: true })
  problemsOnly = false;

  /**
   * `light` or `dark` — the chart owns the stock palette. Empty follows a local
   * `data-theme` wrapper (not `<html>`), then `paintMode` / host `--ui9000-*`.
   */
  @property({ type: String, reflect: true })
  theme = '';

  @state()
  private _scene: AssetHealthScene = buildScene(normalizeAssetHealth(null));

  private _mode: AssetHealthMode = 'light';
  private _orbit: Orbit = DEFAULT_ORBIT;
  private _selectedCategory: string | null = null;
  private _openPin: string | null = null;
  private _drag: DragState | null = null;
  private _suppressClick = false;
  private _frame = 0;
  private _svg: SVGSVGElement | null = null;
  private readonly _uid = `ui9000-aho-${++nextSceneId}`;

  private readonly _handlers: AssetHealthHandlers = {
    onPickCategory: (id) => {
      this._selectedCategory = this._selectedCategory === id ? null : id;
      this.draw();
    },
    onTogglePin: (key) => {
      this._openPin = this._openPin === key ? null : key;
      this.draw();
    },
    onClosePopup: () => {
      if (this._openPin === null) return;
      this._openPin = null;
      this.draw();
    },
    onShowAgents: (category: AssetHealthCategory, problem: AssetHealthProblem) => {
      this._openPin = null;
      this._selectedCategory = category.id;
      this.draw();
      this.dispatchEvent(
        new CustomEvent<AssetHealthShowAgentsDetail>('show-agents', {
          detail: { categoryId: category.id, categoryName: category.name, problem },
          bubbles: true,
          composed: true,
        }),
      );
    },
    onOpenRule: (problem) => {
      this._openPin = null;
      this.draw();
      this.dispatchEvent(
        new CustomEvent<AssetHealthOpenRuleDetail>('open-rule', {
          detail: { problem },
          bubbles: true,
          composed: true,
        }),
      );
    },
  };

  constructor() {
    super();
    this.showHeader = false;
  }

  override disconnectedCallback(): void {
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._drag = null;
    super.disconnectedCallback();
  }

  private resolveAppearance(): void {
    const explicit = this.theme === 'dark' || this.theme === 'light' ? this.theme : '';
    const asked = explicit || themeFromLocalAncestor(this);
    this._mode = asked ? asked : this.themeMode();
    if (this.getAttribute('data-mode') !== this._mode) {
      this.setAttribute('data-mode', this._mode);
    }
    // Stage chrome and SVG ink share one palette — no duplicated CSS dark block.
    const chrome = assetHealthPalette(this._mode);
    this.style.setProperty('--aho-stage', chrome.stage);
    this.style.setProperty('--aho-border', chrome.stageBorder);
    this.style.setProperty('--aho-empty', chrome.empty);
  }

  override willUpdate(changed: PropertyValues): void {
    this.resolveAppearance();
    if (!changed.has('dataJson')) return;
    this._scene = buildScene(normalizeAssetHealth(parseJsonAttr(this.dataJson, null)));
    const ids = new Set(this._scene.model.categories.map((c) => c.id));
    if (this._selectedCategory && !ids.has(this._selectedCategory)) this._selectedCategory = null;
    if (!this._scene.pins.some((p) => p.key === this._openPin)) this._openPin = null;
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('theme') || changed.has('flat') || changed.has('problemsOnly') || changed.has('dataJson')) {
      if (this._svg) this.draw();
      return;
    }
    // The svg is replaced when the empty state toggles, so repaint into a new one.
    if (this._svg) this.draw();
  }

  protected override onThemeChange(): void {
    this.resolveAppearance();
    this.draw();
  }

  /** Repaints now; drag moves go through `scheduleDraw` instead. */
  private draw(): void {
    const svg = this._svg;
    if (!svg) return;
    drawAssetHealthOverview(
      svg,
      this._scene,
      {
        ...this._orbit,
        flat: this.flat,
        problemsOnly: this.problemsOnly,
        selectedCategory: this._selectedCategory,
        openPin: this._openPin,
        themeMode: this._mode,
      },
      this._handlers,
      this._uid,
    );
  }

  private scheduleDraw(): void {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = 0;
      this.draw();
    });
  }

  private readonly setSvg = (node?: Element): void => {
    this._svg = node instanceof SVGSVGElement ? node : null;
  };

  private onPointerDown(event: PointerEvent): void {
    if (this.flat || event.button !== 0) return;
    this._drag = { x: event.clientX, y: event.clientY, ...this._orbit, moved: false };
  }

  private onPointerMove(event: PointerEvent): void {
    const drag = this._drag;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
      if (!drag.moved) this._svg?.classList.add('dragging');
      drag.moved = true;
    }
    this._orbit = orbitBy(drag, dx, dy);
    this.scheduleDraw();
  }

  private endDrag(): void {
    const drag = this._drag;
    this._drag = null;
    this._svg?.classList.remove('dragging');
    if (!drag?.moved) return;
    // A drag that ends over a tile must not also select its category.
    this._suppressClick = true;
    setTimeout(() => {
      this._suppressClick = false;
    }, 0);
  }

  private readonly swallowDragClick = {
    handleEvent: (event: Event): void => {
      if (!this._suppressClick) return;
      this._suppressClick = false;
      event.stopImmediatePropagation();
    },
    capture: true,
  };

  private resetOrbit(): void {
    if (this.flat) return;
    this._orbit = DEFAULT_ORBIT;
    this.draw();
  }

  override render() {
    const { model } = this._scene;
    if (model.empty) {
      return html`<div class="stage"><p class="empty">${dsText('No asset health data', { size: 'md' })}</p></div>`;
    }
    const label = model.goal.name ? `Asset health overview: ${model.goal.name}` : 'Asset health overview';
    return html`
      <div class="stage">
        <svg
          class="scene"
          role="img"
          aria-label=${label}
          ${ref(this.setSvg)}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.endDrag}
          @pointerleave=${this.endDrag}
          @pointercancel=${this.endDrag}
          @click=${this.swallowDragClick}
          @dblclick=${this.resetOrbit}
        ></svg>
      </div>
    `;
  }
}

export function registerAssetHealthOverview(): void {
  if (!customElements.get('ui9000-asset-health-overview')) {
    customElements.define('ui9000-asset-health-overview', Ui9000AssetHealthOverview);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-asset-health-overview': Ui9000AssetHealthOverview;
  }
}
