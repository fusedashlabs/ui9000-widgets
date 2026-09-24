// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import '../element/ui9000-inspector.js';
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

/** `<dt>`/`<dd>` pairs of one definition list, keyed by term. */
function pairs(host: HTMLElement, selector: string): Record<string, string> {
  const list = host.shadowRoot?.querySelector(selector);
  if (!list) throw new Error(`${selector} not rendered`);
  const terms = [...list.querySelectorAll('dt')];
  const definitions = [...list.querySelectorAll('dd')];
  return Object.fromEntries(
    terms.map((term, index) => [
      (term.textContent ?? '').trim(),
      (definitions[index]?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    ]),
  );
}

describe('Ui9000Inspector', () => {
  it('names the panel from the objective', async () => {
    const host = await mount(spatialTrace);

    expect(panel(host).getAttribute('aria-label')).toBe('Decision trace — spatial');
  });

  it('takes an explicit panel label over the objective', async () => {
    const host = await mount(spatialTrace, { 'panel-label': 'Why map-chart' });

    expect(panel(host).getAttribute('aria-label')).toBe('Why map-chart');
  });

  it('renders every section of the S3-21 spatial trace', async () => {
    const host = await mount(spatialTrace);
    const root = panel(host);

    expect(pairs(host, '.head dl').Objective).toBe('spatial');

    const profile = pairs(host, '.profile dl');
    expect(Object.keys(profile)).toHaveLength(Object.keys(spatialTrace.profile).length);
    expect(profile.hasMapToken).toBe('yes');
    expect(profile.hasTemporal).toBe('no');
    expect(profile.categoryCardinality).toBe('5');

    const candidates = root.querySelectorAll('.candidates .list > li');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].querySelector('.id')?.textContent).toBe('map-chart');
    expect(candidates[0].querySelector('.score')?.textContent).toContain('15');
    expect(candidates[0].querySelectorAll('.reasons li')).toHaveLength(
      spatialTrace.candidates[0].reasons.length,
    );
    expect(textOf(host, '.candidates')).toContain('highest score 15 (map-chart)');

    const rejections = root.querySelectorAll('.rejections .list > li');
    expect(rejections).toHaveLength(spatialTrace.rejections.length);
    expect(rejections[0].textContent).toContain('Component intents do not include this objective.');

    expect(
      [...root.querySelectorAll('.actions-section .badge')].map((el) => el.textContent),
    ).toEqual(['hover', 'resize']);
  });

  it('marks winner, risk band and outcome as not recorded on a v1 trace', async () => {
    const host = await mount(spatialTrace);

    const head = pairs(host, '.head dl');
    expect(head.Winner).toBe('not recorded');
    expect(head['Risk band']).toBe('not recorded');
    expect(head.Outcome).toBe('not recorded');
    expect(panel(host).querySelector('.badge[data-kind="winner"]')).toBeNull();
  });

  it('renders winner, risk band and outcome from a v2 trace', async () => {
    const host = await mount(spatialTraceV2);
    const root = panel(host);

    expect(root.querySelector('.badge[data-kind="winner"]')?.textContent).toBe('map-chart');
    expect(root.querySelector('.badge[data-band="low"]')?.textContent).toBe('low');
    expect(pairs(host, '.head dl').Outcome).toBe('rendered');
  });

  it('shows an out-of-enum risk band instead of not recorded', async () => {
    const host = await mount({ ...spatialTraceV2, riskBand: 'catastrophic' });

    expect(pairs(host, '.head dl')['Risk band']).toBe('catastrophic (unrecognized)');
    expect(panel(host).querySelector('.badge[data-band]')).toBeNull();
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

  it('re-renders when the trace attribute changes', async () => {
    const host = await mount(spatialTrace);
    host.setAttribute('trace', JSON.stringify(spatialTraceV2));
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;

    expect(panel(host).querySelector('.badge[data-kind="winner"]')?.textContent).toBe('map-chart');
  });
});
