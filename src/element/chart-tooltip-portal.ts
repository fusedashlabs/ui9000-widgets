/**
 * Chart hover tooltip and axis-label tooltip, ported from the client.
 * Both are mounted on document.body so dashboard overflow does not clip them.
 *
 * Hover card matches `@fuselab-creative/design-system` Tooltip plus the
 * label/value rows from the client TooltipContent.
 * Axis-label chip matches `Widgets/components/LabelTooltip`.
 */

export type ChartTooltipRow = { label: string; value: string };

export type ChartTooltipContent = {
  title?: string;
  rows: ChartTooltipRow[];
};

type PointerEventLike = {
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
};

const HOVER_ATTR = 'data-ui9000-chart-tooltip';
const LABEL_ATTR = 'data-ui9000-label-tooltip';
const STYLE_ID = 'ui9000-chart-tooltip-style';

let hoverOwner: HTMLElement | null = null;
let labelOwner: HTMLElement | null = null;

const TOOLTIP_CSS = `
.ui9000-chart-tooltip {
  position: absolute;
  z-index: 1000;
  display: none;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  min-width: 110px;
  padding: 8px 12px;
  border: 1px solid var(--colors-neutral-border-weakest, #dfe1e4);
  border-radius: 6px;
  background: var(--colors-neutral-background-base, #fff);
  color: var(--colors-neutral-text-default, #444547);
  box-shadow:
    0 2px 4px 0 rgba(20, 28, 44, 0.06),
    0 4px 8px 2px rgba(20, 28, 44, 0.06);
  pointer-events: none;
  font-family: var(--ui9000-font-family, system-ui, sans-serif);
  opacity: 0;
  scale: 0.8;
}
.ui9000-chart-tooltip.is-open {
  display: flex;
  animation: ui9000-tooltip-in 0.2s forwards;
}
@keyframes ui9000-tooltip-in {
  to { opacity: 1; scale: 1; }
}
.ui9000-chart-tooltip__title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
  text-align: left;
}
.ui9000-chart-tooltip__rows {
  display: flex;
  flex-direction: column;
  min-width: 110px;
}
.ui9000-chart-tooltip__row {
  display: flex;
  width: 100%;
  justify-content: space-between;
  flex-direction: row;
  gap: 8px;
  border-bottom: 1px dashed var(--colors-neutral-border-weakest, #dfe1e4);
}
.ui9000-chart-tooltip__row:last-child {
  border: none;
}
.ui9000-chart-tooltip__label {
  font-size: 12px;
  line-height: 14px;
  font-weight: 400;
  margin: 2px 0;
  min-width: 60px;
  max-width: 120px;
  max-height: 2lh;
  overflow: hidden;
  word-wrap: break-all;
  text-overflow: ellipsis;
  opacity: 0.6;
}
.ui9000-chart-tooltip__value {
  font-size: 12px;
  line-height: 14px;
  font-weight: 500;
  margin: 2px 0;
  width: max-content;
}
.ui9000-chart-tooltip::after,
.ui9000-chart-tooltip::before {
  content: "";
  position: absolute;
  top: var(--ui9000-tip-top, 100%);
  left: var(--ui9000-tip-left, 25px);
  width: 0;
  height: 0;
  translate: -50%;
}
.ui9000-chart-tooltip[data-side='bottom']::after {
  border-right: 5px solid transparent;
  border-top: 8px solid var(--colors-neutral-background-base, #fff);
  border-left: 5px solid transparent;
}
.ui9000-chart-tooltip[data-side='top']::after {
  border-right: 5px solid transparent;
  border-bottom: 8px solid var(--colors-neutral-background-base, #fff);
  border-left: 5px solid transparent;
}
.ui9000-chart-tooltip[data-side='bottom']::before {
  opacity: 0.1;
  border-right: 7px solid transparent;
  border-top: 8px solid #000;
  border-left: 7px solid transparent;
}
.ui9000-chart-tooltip[data-side='top']::before {
  opacity: 0.1;
  border-right: 7px solid transparent;
  border-bottom: 8px solid #000;
  border-left: 7px solid transparent;
}
.ui9000-label-tooltip {
  position: absolute;
  z-index: 100;
  display: none;
  box-sizing: border-box;
  padding: 2px 5px;
  border: 1px solid var(--colors-neutral-border-weakest, #dfe1e4);
  border-radius: 5px;
  background: var(--colors-neutral-background-base, #fff);
  color: var(--colors-neutral-text-weak, #6c7584);
  font-family: var(--ui9000-font-family, system-ui, sans-serif);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
  pointer-events: none;
  white-space: nowrap;
}
.ui9000-label-tooltip.is-open {
  display: block;
}
`;

function ensureStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = TOOLTIP_CSS;
  document.head.appendChild(style);
}

function hoverRoot(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  ensureStyle();
  let el = document.querySelector(`[${HOVER_ATTR}]`) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.setAttribute(HOVER_ATTR, '');
    el.className = 'ui9000-chart-tooltip';
    el.dataset.side = 'bottom';
    document.body.appendChild(el);
  }
  return el;
}

function labelRoot(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  ensureStyle();
  let el = document.querySelector(`[${LABEL_ATTR}]`) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.setAttribute(LABEL_ATTR, '');
    el.className = 'ui9000-label-tooltip';
    document.body.appendChild(el);
  }
  return el;
}

function fillHover(el: HTMLDivElement, content: ChartTooltipContent): void {
  el.replaceChildren();
  if (content.title) {
    const title = document.createElement('div');
    title.className = 'ui9000-chart-tooltip__title name';
    title.textContent = content.title;
    el.appendChild(title);
  }
  if (!content.rows.length) return;
  const rows = document.createElement('div');
  rows.className = 'ui9000-chart-tooltip__rows';
  for (const row of content.rows) {
    const line = document.createElement('div');
    line.className = 'ui9000-chart-tooltip__row row';
    if (row.label) {
      const label = document.createElement('div');
      label.className = 'ui9000-chart-tooltip__label';
      label.textContent = row.label;
      line.appendChild(label);
    }
    const value = document.createElement('div');
    value.className = 'ui9000-chart-tooltip__value';
    value.textContent = row.value;
    line.appendChild(value);
    rows.appendChild(line);
  }
  el.appendChild(rows);
}

function placeHover(el: HTMLDivElement, event: PointerEventLike): void {
  const tooltipWidth = el.offsetWidth;
  const tooltipHeight = el.offsetHeight;
  const triangleHeight = 8;
  const triangleWidth = 6;
  const offsetX = 25;
  const offsetY = triangleHeight;
  const edge = 5;
  const { pageX, pageY, clientX, clientY } = event;

  let newX = pageX - offsetX;
  let newY = pageY - tooltipHeight - offsetY;
  let atEdge = false;
  let triangleLeft = offsetX;
  let triangleTop = '100%';
  let side: 'top' | 'bottom' = 'bottom';

  const viewportWidth = window.innerWidth || tooltipWidth;
  if (clientX + tooltipWidth + edge >= viewportWidth) {
    newX = viewportWidth - tooltipWidth - edge - offsetX;
    atEdge = true;
  } else if (clientX - offsetX <= edge) {
    newX = edge;
    atEdge = true;
  }

  if (tooltipHeight + triangleHeight + edge >= clientY) {
    newY = pageY + triangleHeight;
    triangleTop = `${-triangleHeight}px`;
    side = 'top';
  }

  if (atEdge && tooltipWidth > 0) {
    triangleLeft = Math.min(
      Math.max(clientX - newX, edge + triangleWidth / 2),
      tooltipWidth - edge - triangleWidth / 2,
    );
  }

  el.style.left = `${newX}px`;
  el.style.top = `${newY}px`;
  el.style.setProperty('--ui9000-tip-left', `${triangleLeft}px`);
  el.style.setProperty('--ui9000-tip-top', triangleTop);
  el.dataset.side = side;
}

export function presentChartTooltip(
  owner: HTMLElement,
  event: PointerEventLike,
  content: ChartTooltipContent,
): void {
  const el = hoverRoot();
  if (!el) return;
  const opening = hoverOwner !== owner || !el.classList.contains('is-open');
  hoverOwner = owner;
  fillHover(el, content);
  el.classList.add('is-open');
  placeHover(el, event);
  if (opening) {
    el.classList.remove('is-open');
    void el.offsetWidth;
    el.classList.add('is-open');
  }
}

export function dismissChartTooltip(owner: HTMLElement): void {
  if (hoverOwner !== owner) return;
  hoverOwner = null;
  hoverRoot()?.classList.remove('is-open');
}

export function presentLabelTooltip(
  owner: HTMLElement,
  event: PointerEventLike,
  text: string,
): void {
  const el = labelRoot();
  if (!el) return;
  labelOwner = owner;
  el.textContent = text;
  el.style.left = `${event.pageX}px`;
  el.style.top = `${event.pageY - 25}px`;
  el.classList.add('is-open');
}

export function dismissLabelTooltip(owner: HTMLElement): void {
  if (labelOwner !== owner) return;
  labelOwner = null;
  labelRoot()?.classList.remove('is-open');
}

export function dismissTooltips(owner: HTMLElement): void {
  dismissChartTooltip(owner);
  dismissLabelTooltip(owner);
}
