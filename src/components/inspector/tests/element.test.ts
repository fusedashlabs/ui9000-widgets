// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import '../element/ui9000-inspector.js';
import { inspectorStyles } from '../element/styles.js';
import spatialTrace from '../../../stories/fixtures/spatial.trace.json';
import spatialTraceV2 from '../../../stories/fixtures/spatial.trace.v2.json';

async function mount(trace: unknown, attrs: Record<string, string> = {}): Promise<HTMLElement> {
  const host = document.createElement('ui9000-inspector');
  host.setAttribute('trace', JSON.stringify(trace));
  for (const [key, value] of Object.entries(attrs)) host.setAttribute(key, value);
  document.body.appendChild(host);
  await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  return host;
}

function panel(host: HTMLElement): HTMLElement {
  const region = host.shadowRoot?.querySelector('[role="region"]');
  if (!region) throw new Error('panel region not rendered');
  return region as HTMLElement;
}

function textOf(host: HTMLElement, selector: string): string {
  return (host.shadowRoot?.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function text(host: HTMLElement): string {
  return (host.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function ruleBody(css: string, selector: string): string {
  const start = css.indexOf(selector);
  const open = start === -1 ? -1 : css.indexOf('{', start);
  const close = open === -1 ? -1 : css.indexOf('}', open);
  return open === -1 || close === -1 ? '' : css.slice(open + 1, close);
}

async function showDetails(host: HTMLElement): Promise<void> {
  const button = host.shadowRoot?.querySelector('button.toggle') as HTMLButtonElement | null;
  if (button?.getAttribute('aria-expanded') !== 'false') return;
  button.click();
  await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
}

describe('Ui9000Inspector', () => {
  it('paints the panel from the host surface and sizes it to its content', () => {
    const css = inspectorStyles.cssText;
    const hostRule = ruleBody(css, ':host {');
    const root = ruleBody(css, '.root {');
    const cards = ruleBody(css, '.scores li,');
    expect(hostRule).toContain('height: auto');
    expect(root).toContain('height: auto');
    expect(root).toContain('background: var(--ui9000-color-surface, #ffffff)');
    expect(cards).toContain('--ui9000-color-surface-muted');
  });

  it('names the panel from the objective', async () => {
    const host = await mount(spatialTrace);

    expect(panel(host).getAttribute('aria-label')).toBe('Decision trace — spatial');
  });

  it('takes an explicit panel label over the objective', async () => {
    const host = await mount(spatialTrace, { 'panel-label': 'Why map-chart' });

    expect(panel(host).getAttribute('aria-label')).toBe('Why map-chart');
  });

  it('starts collapsed, with the chart name and no decision detail', async () => {
    const host = await mount(spatialTrace);
    const button = host.shadowRoot?.querySelector('button.toggle');

    expect(button?.textContent?.trim()).toBe('Show details');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(host.shadowRoot?.querySelector('h2')?.textContent).toBe('map-chart');
    expect(host.shadowRoot?.querySelector('.why')).toBeNull();
    expect(host.shadowRoot?.querySelector('.rejections')).toBeNull();
  });

  it('leads with the chart, who chose it, and why', async () => {
    const host = await mount(spatialTrace);
    await showDetails(host);
    const root = panel(host);

    expect(root.querySelector('h2')?.textContent).toBe('map-chart');
    expect(root.querySelector('.who')?.textContent).toBe('Chosen by the engine');
    expect(root.querySelector('.why')?.textContent).toContain('highest score 15 (map-chart)');
    expect(root.querySelector('.objective')?.textContent).toBe('spatial');
    expect(text(host)).toContain('hasMapToken yes');
    expect(text(host)).not.toContain('hasTemporal');
    expect(text(host)).toContain('Ruled out');
    expect(text(host)).toContain('Component intents do not include this objective.');
    expect(text(host)).toContain('hover');
    expect(text(host)).toContain('resize');
  });

  it('names Jev when the trace says Jev selected the chart', async () => {
    const host = await mount({
      ...spatialTrace,
      tieBreak: 'Jev selected map-chart. Place a metric on geography.',
    });

    expect(panel(host).querySelector('.who')?.getAttribute('data-by')).toBe('jev');
    expect(panel(host).querySelector('.who')?.textContent).toBe('Chosen by Jev');
  });

  it('renders winner, risk and outcome from a v2 trace', async () => {
    const host = await mount(spatialTraceV2);
    await showDetails(host);
    const root = panel(host);

    expect(root.querySelector('h2')?.textContent).toBe('map-chart');
    expect(root.querySelector('.pill[data-band="low"]')?.textContent).toContain('low');
    expect(root.querySelector('.outcome')?.textContent).toBe('rendered');
  });

  it('shows an unrecognized risk band as text, not as a known band', async () => {
    const host = await mount({ ...spatialTraceV2, riskBand: 'catastrophic' });
    await showDetails(host);

    expect(panel(host).querySelector('.pill[data-band]')).toBeNull();
    expect(text(host)).toContain('catastrophic unrecognized');
  });

  it('refuses a trace carrying rows and renders no panel', async () => {
    const host = await mount({ ...spatialTrace, rows: [{ region: 'North', incidents: 12 }] });

    expect(host.shadowRoot?.querySelector('[role="region"]')).toBeNull();
    expect(textOf(host, '[role="status"]')).toBe('Trace must not contain dataset rows');
    expect(host.shadowRoot?.textContent).not.toContain('North');
  });

  it('refuses unparseable JSON without throwing', async () => {
    const host = document.createElement('ui9000-inspector');
    host.setAttribute('trace', '{not json');
    document.body.appendChild(host);
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;

    expect(textOf(host, '[role="status"]')).toBe('Trace required');
  });

  it('shows the decision detail and hides it again', async () => {
    const host = await mount(spatialTrace);
    const button = () => host.shadowRoot?.querySelector('button.toggle') as HTMLButtonElement;

    expect(button().getAttribute('aria-expanded')).toBe('false');

    button().click();
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;

    expect(button().textContent?.trim()).toBe('Hide details');
    expect(host.shadowRoot?.querySelector('.rejections')).not.toBeNull();

    button().click();
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;

    expect(button().textContent?.trim()).toBe('Show details');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(host.shadowRoot?.querySelector('.why')).toBeNull();
    expect(host.shadowRoot?.querySelector('.rejections')).toBeNull();
    expect(host.shadowRoot?.querySelector('h2')?.textContent).toBe('map-chart');
  });

  it('re-renders when the trace attribute changes', async () => {
    const host = await mount(spatialTrace);
    host.setAttribute('trace', JSON.stringify(spatialTraceV2));
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;

    expect(panel(host).querySelector('h2')?.textContent).toBe('map-chart');
  });
});
