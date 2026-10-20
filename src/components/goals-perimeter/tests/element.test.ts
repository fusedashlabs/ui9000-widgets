// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/goals-perimeter.default.json';
import agentsFixture from '../../../stories/fixtures/goals-perimeter.agents.json';
import type { GoalOpenDetail, Ui9000GoalsPerimeterChart } from '../index.js';
import { detailGeometry, normalizeGoalsPerimeter, stateSectors } from '../lib/index.js';

let observed: (() => void)[] = [];

beforeAll(async () => {
  class StubResizeObserver {
    constructor(private cb: () => void) {
      observed.push(cb);
    }
    observe(): void {}
    disconnect(): void {
      observed = observed.filter((c) => c !== this.cb);
    }
  }
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  await import('../index.js');
  await import('../../chart-renderer/index.js');
});

const flush = () => new Promise((r) => setTimeout(r, 40));
/** Lets the zoom into or out of a goal finish. */
const settle = () => new Promise((r) => setTimeout(r, 520));

async function mount(data: unknown): Promise<Ui9000GoalsPerimeterChart> {
  const el = document.createElement('ui9000-goals-perimeter');
  el.setAttribute('data', JSON.stringify(data));
  document.body.append(el);
  await el.updateComplete;
  await flush();
  return el;
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('Timed out waiting for condition');
}

const texts = (root: Element | ShadowRoot, selector: string) =>
  [...root.querySelectorAll(selector)].map((node) => node.textContent?.replace(/\s+/g, ' ').trim());

const tooltip = () => document.querySelector('.ui9000-chart-tooltip')?.textContent ?? '';

afterEach(() => {
  document.body.replaceChildren();
});

describe('ui9000-goals-perimeter', () => {
  it('renders the default sample with D3 inside the shell', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(root.querySelector('.widget-shell .chart-root svg.gp-svg')).not.toBeNull();
    expect(root.querySelector('.widget-header, .widget-title')?.textContent).toContain(
      'Agents Management — Goals',
    );

    expect(texts(root, '.goal-label .row.title')).toEqual([
      'Perimeter Watch',
      'Onboarding Velocity',
      'Maintain Verified Asset Visibility',
      'Pipeline Quality',
      'Incident Response',
    ]);
    expect(texts(root, '.goal-label .row.summary')[0]).toBe('1,204 agents · 88% · 1.1×');
    expect(texts(root, '.goal-label .row.impure')).toEqual([
      'IMPURE · 35',
      'IMPURE · 159',
      'IMPURE · 15',
      'IMPURE · 5',
    ]);
    expect(texts(root, '.goal-label .row.groups')[3]).toBe('1 resource group · click to open');
    expect([...root.querySelectorAll('.ring')].map((ring) => ring.getAttribute('class'))).toEqual([
      'ring healthy',
      'ring degraded',
      'ring degraded',
      'ring healthy',
      'ring degraded',
    ]);
    expect(
      [...root.querySelectorAll('.goal-marks')].map(
        (g) => g.querySelectorAll('.ticks line').length,
      ),
    ).toEqual([6, 12, 4, 0, 2]);
    expect(root.querySelectorAll('.rg')).toHaveLength(10);
    expect(root.querySelectorAll('.link-down')).toHaveLength(2);
    expect(root.querySelectorAll('.strand').length).toBeGreaterThan(30);
  });

  it('puts the exception count and the state legend in the shell, matching the fixture', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const summary = root.querySelector('.exception-summary')!;
    expect(summary.querySelector('strong')?.textContent).toBe('214');
    expect(summary.textContent?.replace(/\s+/g, ' ')).toContain('214 exceptions');
    expect(summary.textContent).toContain('2 connections down');
    // The summary is shell HTML, not text on the plot.
    expect(root.querySelector('svg .exception-summary')).toBeNull();
    expect(texts(root, '.chart-legend .legend-label')).toEqual([
      'Healthy 2,906',
      'Blocked 95',
      'Failed 119',
    ]);
  });

  it('tells healthy, degraded, blocked and failed agents apart', async () => {
    const el = await mount(agentsFixture);
    const root = el.shadowRoot!;
    const agents = [...root.querySelectorAll<SVGRectElement>('rect.speck.agent')];
    expect(agents).toHaveLength(72);
    const fill = (state: string) =>
      new Set(agents.filter((r) => r.classList.contains(state)).map((r) => r.getAttribute('fill')));
    const fills = ['healthy', 'degraded', 'blocked', 'failed'].map(fill);
    // Each state has its own colours, shared with no other state.
    for (let i = 0; i < fills.length; i += 1) {
      expect(fills[i]!.size).toBeGreaterThan(0);
      for (let j = i + 1; j < fills.length; j += 1) {
        expect([...fills[i]!].filter((c) => fills[j]!.has(c))).toEqual([]);
      }
    }
    // And its own marker: ✕ failed, ⊘ blocked, △ degraded.
    expect(root.querySelectorAll('.marker.failed').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('.marker.blocked').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('.marker.degraded').length).toBeGreaterThan(0);
    expect(root.querySelector('.exception-summary strong')?.textContent).toBe('20');
    expect(texts(root, '.goal-label .row.groups')).toEqual(['2 resource groups · click to open']);
    expect(texts(root, '.chart-legend .legend-label')).toEqual([
      'Healthy 52',
      'Degraded 8',
      'Blocked 6',
      'Failed 6',
    ]);
  });

  it('draws agent links and external dependencies, red where they are down', async () => {
    const el = await mount(agentsFixture);
    const root = el.shadowRoot!;
    expect(root.querySelectorAll('.agent-link')).toHaveLength(12);
    expect([...root.querySelectorAll('.ext-node')].map((n) => n.getAttribute('class'))).toEqual([
      'ext-node unavailable',
      'ext-node degraded',
      'ext-node active',
    ]);
    root
      .querySelector('.ext-node.unavailable')!
      .dispatchEvent(new MouseEvent('pointerenter', { clientX: 4, clientY: 4 }));
    expect(tooltip()).toContain('PagerDuty');
    expect(tooltip()).toContain('Failed agents cannot page the on-call engineer');
  });

  it('names an agent on hover', async () => {
    const el = await mount(agentsFixture);
    const root = el.shadowRoot!;
    const failed = root.querySelector<SVGRectElement>('rect.speck.agent.failed')!;
    failed.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, clientX: 4, clientY: 4 }));
    expect(tooltip()).toMatch(/agent-\d{3}/);
    expect(tooltip()).toContain('Pager integration returns 503');
  });

  it('highlights a goal on hover and opens it on click', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const goal = root.querySelector<SVGGElement>('g.goal[data-goal="perimeter-watch"]')!;
    goal.dispatchEvent(new MouseEvent('pointerenter', { clientX: 10, clientY: 10 }));
    expect(goal.classList.contains('is-hover')).toBe(true);
    expect(
      root
        .querySelector('.goal-label[data-goal="perimeter-watch"]')
        ?.classList.contains('is-hover'),
    ).toBe(true);
    expect(tooltip()).toContain('Perimeter Watch');
    expect(tooltip()).toContain('Exceptions');

    const opened: GoalOpenDetail[] = [];
    document.body.addEventListener('goal-open', (e) => opened.push(e.detail));
    goal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root.querySelector('.rg')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(opened).toEqual([
      { goalId: 'perimeter-watch', goalName: 'Perimeter Watch' },
      {
        goalId: 'perimeter-watch',
        goalName: 'Perimeter Watch',
        resourceGroupId: 'perimeter-sensors',
      },
    ]);

    goal.dispatchEvent(new MouseEvent('pointerleave'));
    expect(goal.classList.contains('is-hover')).toBe(false);
  });

  it('explains a blocked marker and a connection that is down', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const blocked = root.querySelector(
      '.goal-marks[data-goal="onboarding-velocity"] .marker.blocked',
    )!;
    blocked.dispatchEvent(new MouseEvent('pointerenter', { clientX: 5, clientY: 5 }));
    expect(tooltip()).toContain('Blocked · 67 agents');
    expect(tooltip()).toContain('Human action');

    root
      .querySelector('.link-mark')!
      .dispatchEvent(new MouseEvent('pointerenter', { clientX: 5, clientY: 5 }));
    expect(tooltip()).toContain('Connection unavailable');
    expect(tooltip()).toContain('New agents onboard without perimeter risk scores');
  });

  it('keeps only the title and the exception row when the board is small', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const chart = root.querySelector<HTMLElement>('.chart-root')!;
    Object.defineProperty(chart, 'clientWidth', {
      value: 420,
      configurable: true,
    });
    Object.defineProperty(chart, 'clientHeight', {
      value: 360,
      configurable: true,
    });
    for (const cb of observed) cb();
    await flush();
    expect(root.querySelectorAll('.goal-label .row.title')).toHaveLength(5);
    expect(root.querySelectorAll('.goal-label .row.impure')).toHaveLength(4);
    expect(root.querySelector('.goal-label .row.summary, .goal-label .row.groups')).toBeNull();
    // A resize re-fits; it does not rebuild the clouds.
    expect(root.querySelectorAll('svg.gp-svg')).toHaveLength(1);
  });

  it('drops the resource group count when there is none', async () => {
    const el = await mount({
      goal: 'Solo',
      agents: [{ id: 'a' }, { id: 'b', state: 'failed' }],
    });
    const root = el.shadowRoot!;
    expect(texts(root, '.goal-label .row.groups')).toEqual(['click to open']);
    expect(root.querySelectorAll('.rg')).toHaveLength(0);
  });

  it('hides the legend on request and shows an empty state without goals', async () => {
    const el = await mount(defaultFixture);
    el.showLegend = false;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.chart-legend')).toBeNull();

    const empty = await mount({ goals: [] });
    expect(empty.shadowRoot!.querySelector('.empty')?.textContent).toBe('No goal data');
    expect(empty.shadowRoot!.querySelector('svg.gp-svg')).toBeNull();
  });

  it('expands a goal on click and shows that cluster in detail', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const opened: GoalOpenDetail[] = [];
    el.addEventListener('goal-open', (e) => opened.push(e.detail));
    root
      .querySelector('g.goal[data-goal="perimeter-watch"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    await settle();

    expect(el.openGoal).toBe('perimeter-watch');
    expect(opened).toEqual([{ goalId: 'perimeter-watch', goalName: 'Perimeter Watch' }]);
    expect(root.querySelector<SVGGElement>('.gp-board')!.style.display).toBe('none');
    const detail = root.querySelector('.gp-detail')!;
    expect(detail.getAttribute('data-goal')).toBe('perimeter-watch');
    // One sector per state, labelled with its count and the reasons behind it.
    expect(texts(detail, '.sector-title')).toEqual([
      'Healthy · 1,169',
      'Blocked · 19',
      'Failed · 16',
    ]);
    expect(texts(detail, '.reason text')).toEqual([
      '19 Geo-fence policy holds outbound scans · Rule',
      '16 Sensor feed timed out after three retries',
    ]);
    expect(texts(detail, '.rg-name')).toEqual([
      'Perimeter sensors',
      'Threat classifier',
      'Edge gateways',
    ]);
    // The goals it is joined to, the one that is down marked.
    // Labels shorten to the room beside them; the full name stays on the node.
    expect(
      [...detail.querySelectorAll('.rel-node.goal')]
        .map((n) => n.getAttribute('aria-label'))
        .sort(),
    ).toEqual([
      'Maintain Verified Asset Visibility. Open goal.',
      'Onboarding Velocity. Open goal.',
      'Pipeline Quality. Open goal.',
    ]);
    expect(detail.querySelectorAll('.relation .link-mark')).toHaveLength(1);
    // The shell follows the open goal.
    expect(root.querySelector('.gp-crumb-goal')?.textContent).toBe('Perimeter Watch');
    expect(root.querySelector('.exception-summary strong')?.textContent).toBe('35');
    expect(root.querySelector('.exception-summary')?.textContent).toContain('1 connection down');
    expect(texts(root, '.chart-legend .legend-label')).toEqual([
      'Healthy 1,169',
      'Blocked 19',
      'Failed 16',
    ]);
  });

  it('never puts a sector label or a neighbour on the open goal’s title and summary', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const translate = (node: Element | null) => {
      const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(node?.getAttribute('transform') ?? '');
      return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: 0, y: 0 };
    };
    const chart = root.querySelector<HTMLElement>('.chart-root')!;
    for (const [width, height] of [
      [1400, 976],
      [860, 600],
      [640, 520],
    ] as const) {
      Object.defineProperty(chart, 'clientWidth', {
        value: width,
        configurable: true,
      });
      Object.defineProperty(chart, 'clientHeight', {
        value: height,
        configurable: true,
      });
      for (const cb of observed) cb();
      await flush();
      for (const goal of defaultFixture.goals) {
        el.openGoalById(goal.id);
        await el.updateComplete;
        await settle();
        const detail = root.querySelector('.gp-detail')!;
        const summary = detail.querySelector('.detail-summary')!;
        const top = translate(summary).y - 18;
        const rows = summary.querySelectorAll('text').length;
        const bottom = top + rows * 20 + 4;
        const widest = Math.max(
          ...[...summary.querySelectorAll('text')].map(
            (t) => (t.textContent ?? '').length * 17 * 0.56,
          ),
        );
        const box = { x0: -widest / 2, x1: widest / 2, y0: top, y1: bottom };
        const hits = (x0: number, x1: number, y0: number, y1: number) =>
          x0 < box.x1 && x1 > box.x0 && y0 < box.y1 && y1 > box.y0;

        for (const label of detail.querySelectorAll('.sector-label')) {
          const at = translate(label);
          const title = label.querySelector('.sector-title')!;
          const width = (title.textContent ?? '').length * 13 * 0.56;
          const anchor = title.getAttribute('text-anchor');
          const x0 = anchor === 'start' ? at.x : anchor === 'end' ? at.x - width : at.x - width / 2;
          const lines = label.querySelectorAll('text').length;
          expect(
            hits(x0, x0 + width, at.y - 8, at.y + (lines - 1) * 17 + 8),
            `${width}px ${goal.name}: ${title.textContent}`,
          ).toBe(false);
        }
        for (const node of detail.querySelectorAll('.rel-node')) {
          const at = translate(node);
          expect(
            hits(at.x - 12, at.x + 12, at.y - 12, at.y + 12),
            `${goal.name}: ${node.getAttribute('aria-label')}`,
          ).toBe(false);
        }

        // Neighbours (dot and name) never sit on a sector label or its reasons either.
        const labelBoxes = [...detail.querySelectorAll('.sector-label')].map((label) => {
          const at = translate(label);
          const texts = [...label.querySelectorAll('text')];
          const width =
            Math.max(...texts.map((t) => (t.textContent ?? '').length * 13 * 0.56)) + 14;
          const anchor = texts[0]!.getAttribute('text-anchor');
          const x0 =
            anchor === 'start' ? at.x - 14 : anchor === 'end' ? at.x - width : at.x - width / 2;
          return {
            x0,
            x1: x0 + width,
            y0: at.y - 9,
            y1: at.y + (texts.length - 1) * 17 + 9,
            name: texts[0]!.textContent,
          };
        });
        // Sector labels never sit on each other.
        for (let i = 0; i < labelBoxes.length; i += 1) {
          for (let j = i + 1; j < labelBoxes.length; j += 1) {
            const a = labelBoxes[i]!;
            const b = labelBoxes[j]!;
            const overlap = a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
            expect(overlap, `${width}px ${goal.name}: ${a.name} on ${b.name}`).toBe(false);
          }
        }
        for (const node of detail.querySelectorAll('.rel-node')) {
          const at = translate(node);
          const name = node.querySelector('.rel-label')!;
          const width = (name.textContent ?? '').length * 13 * 0.56;
          const anchor = name.getAttribute('text-anchor');
          const dx = Number(name.getAttribute('x'));
          const dy = Number(name.getAttribute('y'));
          const nx0 =
            anchor === 'start'
              ? at.x + dx
              : anchor === 'end'
                ? at.x + dx - width
                : at.x - width / 2;
          const boxes = [
            { x0: at.x - 10, x1: at.x + 10, y0: at.y - 10, y1: at.y + 10 },
            {
              x0: nx0,
              x1: nx0 + width,
              y0: at.y + dy - 12,
              y1: at.y + dy + 18,
            },
          ];
          for (const b of boxes) {
            for (const l of labelBoxes) {
              const overlap = b.x0 < l.x1 && b.x1 > l.x0 && b.y0 < l.y1 && b.y1 > l.y0;
              expect(overlap, `${goal.name}: ${node.getAttribute('aria-label')} on ${l.name}`).toBe(
                false,
              );
            }
          }
        }
        el.closeGoal();
        await settle();
      }
    }
  }, 60_000);

  it('opens a goal without moving anything in the shell', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const body = root.querySelector('.widget-body')!;
    const shape = () =>
      [...body.children].map((child) => child.className.toString().split(' ')[0]).join(' ');
    const legend = () => texts(root, '.chart-legend .legend-label').length;
    const before = { shape: shape(), legend: legend(), header: texts(root, '.widget-header').length };

    // An all-healthy goal is the hardest case for the legend: it lacks two of the board's states.
    el.openGoalById('pipeline-quality');
    await el.updateComplete;
    await settle();

    expect(shape()).toBe(before.shape);
    expect(legend()).toBe(before.legend);
    expect(texts(root, '.chart-legend .legend-label')).toEqual(['Healthy 318', 'Blocked 0', 'Failed 0']);
    expect(texts(root, '.widget-header').length).toBe(before.header);
    // The way back floats over the plot, beside the drawing, not above it.
    const crumbs = root.querySelector('.gp-crumbs')!;
    expect(crumbs.parentElement?.classList.contains('chart-root')).toBe(true);
    expect(root.querySelector('.chart-root > .gp-canvas svg.gp-svg')).not.toBeNull();
    expect(crumbs.querySelector('.gp-crumb-goal')?.textContent).toBe('Pipeline Quality');
    // The open goal keeps the overlay's band clear.
    const detail = root.querySelector('.gp-detail')!;
    const cy = Number(/translate\(([-\d.]+) ([-\d.]+)\)/.exec(detail.getAttribute('transform') ?? '')![2]);
    for (const label of detail.querySelectorAll('.sector-label')) {
      const y = Number(/translate\(([-\d.]+) ([-\d.]+)\)/.exec(label.getAttribute('transform') ?? '')![2]);
      expect(cy + y - 9).toBeGreaterThanOrEqual(36);
    }

    el.closeGoal();
    await settle();
    expect(shape()).toBe(before.shape);
    expect(root.querySelector('.gp-crumbs')).toBeNull();
  });

  it('dims the other sectors while a sector of the open circle is hovered, not a label', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    el.openGoalById('perimeter-watch');
    await el.updateComplete;
    await settle();
    const detail = root.querySelector<SVGGElement>('.gp-detail')!;
    // jsdom has no SVG geometry: pin the group's box at the origin so pointer
    // coordinates are plot px from the centre, as d3.pointer sees them in a browser.
    detail.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} });
    const { r } = detailGeometry(1400, 976);
    const sectors = stateSectors(normalizeGoalsPerimeter(defaultFixture).goals[0]!);
    const failed = sectors.find((s) => s.state === 'failed')!;
    const mid = (failed.start + failed.end) / 2;
    const hover = (target: Element, x: number, y: number) =>
      target.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }));
    const dimmed = (selector: string) =>
      [...detail.querySelectorAll(selector)].map((n) => [n.getAttribute('data-state') ?? n.getAttribute('class'), n.classList.contains('is-dimmed')]);

    hover(detail.querySelector('.sector-hit')!, r * 0.6 * Math.sin(mid), -r * 0.6 * Math.cos(mid));
    expect(dimmed('.sector')).toEqual([
      ['healthy', true],
      ['blocked', true],
      ['failed', false],
    ]);
    expect(dimmed('.sector-label')).toEqual([
      ['healthy', true],
      ['blocked', true],
      ['failed', false],
    ]);
    const specks = [...detail.querySelectorAll('.detail-cloud rect')];
    expect(specks.filter((n) => n.classList.contains('failed')).every((n) => !n.classList.contains('is-dimmed'))).toBe(true);
    expect(specks.filter((n) => n.classList.contains('healthy')).every((n) => n.classList.contains('is-dimmed'))).toBe(true);

    // Over a label: nothing dims, even with the pointer near its sector.
    hover(detail.querySelector('.sector-label[data-state="failed"] .sector-title')!, 0, -(r + 40));
    expect(detail.querySelectorAll('.is-dimmed')).toHaveLength(0);

    // The hub with the resource groups does not count as a sector either.
    hover(detail.querySelector('.sector-hit')!, 2, -r * 0.6 * Math.cos(mid));
    hover(detail.querySelector('.sector-hit')!, 0, -r * 0.1);
    expect(detail.querySelectorAll('.is-dimmed')).toHaveLength(0);

    // Leaving the circle clears it.
    hover(detail.querySelector('.sector-hit')!, r * 0.6 * Math.sin(mid), -r * 0.6 * Math.cos(mid));
    expect(detail.querySelectorAll('.is-dimmed').length).toBeGreaterThan(0);
    detail.dispatchEvent(new MouseEvent('pointerleave'));
    expect(detail.querySelectorAll('.is-dimmed')).toHaveLength(0);
  });

  it('opens a neighbour from the detail, and goes back to every goal', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const closed: string[] = [];
    el.addEventListener('goal-close', (e) => closed.push(e.detail.goalId));
    el.openGoalById('perimeter-watch', 'threat-classifier');
    await el.updateComplete;
    await settle();
    expect(root.querySelector('.gp-detail .rg.is-selected')?.getAttribute('data-group')).toBe(
      'threat-classifier',
    );

    root
      .querySelector('.rel-node.goal')!
      .parentElement!.querySelector('.rel-node')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    await settle();
    expect(el.openGoal).not.toBe('perimeter-watch');
    expect(root.querySelector('.gp-detail')?.getAttribute('data-goal')).toBe(el.openGoal);

    root.querySelector<HTMLButtonElement>('.gp-back')!.click();
    await el.updateComplete;
    await settle();
    expect(el.openGoal).toBeNull();
    expect(closed).toHaveLength(1);
    expect(root.querySelector('.gp-detail')).toBeNull();
    expect(root.querySelector<SVGGElement>('.gp-board')!.style.display).toBe('');
    expect(root.querySelector('.gp-crumbs')).toBeNull();
    expect(root.querySelector('.exception-summary strong')?.textContent).toBe('214');
  });

  it('closes an open goal on Escape', async () => {
    const el = await mount(agentsFixture);
    el.openGoalById('incident-response');
    await el.updateComplete;
    await settle();
    expect(el.shadowRoot!.querySelectorAll('.gp-detail rect.speck.agent')).toHaveLength(72);
    expect(texts(el.shadowRoot!, '.gp-detail .rel-label').sort()).toEqual([
      'CMDB',
      'PagerDuty',
      'Runbook library',
    ]);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    await settle();
    expect(el.openGoal).toBeNull();
    expect(el.shadowRoot!.querySelector('.gp-detail')).toBeNull();
  });

  it('mounts through chart-renderer by chartType', async () => {
    const renderer = document.createElement('ui9000-chart-renderer');
    renderer.setAttribute('data', JSON.stringify(defaultFixture));
    document.body.appendChild(renderer);
    await waitFor(() => !!renderer.shadowRoot?.querySelector('ui9000-goals-perimeter'));
    const chart = renderer.shadowRoot!.querySelector('ui9000-goals-perimeter')!;
    await chart.updateComplete;
    await waitFor(() => chart.shadowRoot!.querySelectorAll('g.goal').length === 5);
    expect(chart.shadowRoot!.querySelector('.exception-summary strong')?.textContent).toBe('214');
  });
});
