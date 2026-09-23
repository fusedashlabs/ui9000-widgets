// @vitest-environment jsdom
/**
 * Fail-closed gate on the Inspector's Storybook stories.
 *
 * Storybook is where a trace is easiest to get wrong: a story is authored by
 * hand, is not type-checked against the engine's `Trace`, and gets published to
 * a static site that anyone can read. Pasting a real decision in — rows and all
 * — is a one-line mistake that no existing test catches, because `element.test`
 * and `normalize.test` both check traces they construct themselves.
 *
 * So this suite reads the stories as data. Every export is swept, and every
 * export must be declared below as either CLEAN (renders a panel) or REFUSED
 * (renders the refusal and no panel). A story that is neither fails here — which
 * is the point: adding a story is what forces the decision, and the default for
 * an undeclared one is failure, not a pass.
 *
 * `traceHasRows` stands in for core's `assertTraceHasNoRows`: widgets is the
 * lower package of the two, so it cannot import the engine's copy without
 * inverting the dependency. `mirrors the engine guard` below pins the two to the
 * same behaviour on the depths that matter, so the stand-in cannot quietly drift.
 */

import { describe, expect, it } from 'vitest';

import '../element/ui9000-inspector.js';
import * as inspectorStories from '../../../stories/Inspector.stories.js';
import { normalizeTrace, traceHasRows } from '../lib/index.js';

const ROWS_REFUSED = 'Trace must not contain dataset rows';

/** Stories whose trace is a decision record and must render. */
const CLEAN = ['Playground', 'TraceV2'];

/** Stories that carry rows on purpose, to show the refusal. */
const REFUSED = ['RowsRefused'];

type StoryModule = { default: { args?: Record<string, unknown> } } & Record<string, unknown>;

const stories = inspectorStories as unknown as StoryModule;

/** Every named export that is a story — i.e. everything but `meta`. */
const storyNames: string[] = Object.keys(stories).filter((key) => key !== 'default').sort();

/** What Storybook would actually render: meta args, overridden by the story's own. */
function traceOf(name: string): unknown {
  const story = stories[name] as { args?: Record<string, unknown> };
  return { ...stories.default.args, ...story.args }.trace;
}

async function mount(trace: unknown): Promise<HTMLElement> {
  const host = document.createElement('ui9000-inspector');
  // Exactly how `Inspector.stories.ts` hands the trace to the element.
  host.setAttribute('trace', JSON.stringify(trace));
  document.body.appendChild(host);
  await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  return host;
}

function textOf(host: HTMLElement, selector: string): string {
  return (host.shadowRoot?.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('Inspector stories', () => {
  it('declares every story as clean or refused, with none left unclassified', () => {
    expect(storyNames).toEqual([...CLEAN, ...REFUSED].sort());
    expect(storyNames.length).toBeGreaterThan(0);
  });

  it('gives every story a trace to render', () => {
    for (const name of storyNames) {
      expect(traceOf(name), name).toBeTruthy();
    }
  });

  describe.each(CLEAN)('%s', (name) => {
    it('carries no dataset rows', () => {
      const trace = traceOf(name);
      expect(traceHasRows(trace)).toBe(false);
      expect(JSON.stringify(trace)).not.toMatch(/"(rows|data)"\s*:\s*\[/);
    });

    it('normalizes, and renders a panel rather than a refusal', async () => {
      expect(normalizeTrace(traceOf(name)).ok).toBe(true);

      const host = await mount(traceOf(name));
      expect(host.shadowRoot?.querySelector('[role="region"]')).toBeTruthy();
      expect(host.shadowRoot?.querySelector('[role="status"]')).toBeNull();
    });
  });

  describe.each(REFUSED)('%s', (name) => {
    it('carries the rows it exists to demonstrate', () => {
      expect(traceHasRows(traceOf(name))).toBe(true);
    });

    it('is refused, and renders no panel', async () => {
      expect(normalizeTrace(traceOf(name))).toEqual({ ok: false, blocked: ROWS_REFUSED });

      const host = await mount(traceOf(name));
      expect(textOf(host, '[role="status"]')).toBe(ROWS_REFUSED);
      expect(host.shadowRoot?.querySelector('[role="region"]')).toBeNull();
    });
  });
});

/**
 * Parity with `assertTraceHasNoRows` in packages/core. Both are recursive walks
 * over the same two keys; these are the depths that tell a real walk apart from
 * a top-level key check.
 */
describe('mirrors the engine guard', () => {
  const base = { objective: 'spatial', profile: { rowCount: 10 }, candidates: [{ id: 'map-chart' }] };

  it('finds rows at the top level, nested, and inside an array', () => {
    expect(traceHasRows({ ...base, rows: [{ region: 'North' }] })).toBe(true);
    expect(traceHasRows({ ...base, outcome: { data: [{ region: 'North' }] } })).toBe(true);
    expect(traceHasRows({ ...base, candidates: [{ id: 'table', rows: [{ a: 1 }] }] })).toBe(true);
  });

  it('reads a row count as a fact, not as rows', () => {
    expect(traceHasRows(base)).toBe(false);
    expect(traceHasRows({ ...base, tieBreak: 'rows: 10', outcome: 'rendered' })).toBe(false);
  });
});
