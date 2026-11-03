// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import fixture from '../../../stories/fixtures/goals-dependency-graph.default.json';
import { normalizeGoalsDependencyGraph, type PaintOptions } from '../lib/index.js';

// jsdom draws no picture: a painter that keeps what it was last asked to paint stands in for it
const paints: PaintOptions[] = [];
vi.mock('../render/field-painter.js', () => ({
  createPainter: (fresh: () => HTMLCanvasElement) => ({
    canvas: fresh(),
    kind: 'canvas',
    resize: () => {},
    paint: (opts: PaintOptions) => paints.push(opts),
    dispose: () => {},
  }),
}));

const { renderGoalsDependencyGraph } = await import('../render/index.js');

const model = normalizeGoalsDependencyGraph(fixture);

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('Timed out waiting for condition');
}

/** Each goal's agents as last painted, against its tree in the overlay. */
function emphasis(container: HTMLElement) {
  const last = paints.at(-1)!;
  return model.goals.map((g) => {
    const tree = [...container.querySelectorAll<SVGGElement>('g.gd-tree')].find((t) => (t as unknown as { __data__: { goal: { id: string } } }).__data__.goal.id === g.id)!;
    return { id: g.id, agents: last.goalAlpha!(g.id), tree: Number(tree.getAttribute('opacity')) };
  });
}

describe('goals dependency graph scene', () => {
  let destroy: (() => void) | undefined;
  afterEach(() => {
    destroy?.();
    document.body.replaceChildren();
    paints.length = 0;
  });

  it('dims the agents with their trees under reduced motion, on the frame the pointer moves', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const controller = renderGoalsDependencyGraph(container, { model, width: 1280, height: 620, motion: false })!;
    destroy = controller.destroy;
    expect(emphasis(container).every((e) => e.agents === 1 && e.tree === 1)).toBe(true);

    const label = container.querySelector<HTMLButtonElement>('button.gd-label[data-goal="perimeter-watch"]')!;
    label.dispatchEvent(new MouseEvent('mouseenter'));
    await waitFor(() => emphasis(container).some((e) => e.tree < 1));
    // the loop has stopped by now: what was painted last is what stays on screen
    const settled = paints.length;
    await new Promise((r) => setTimeout(r, 100));
    expect(paints.length).toBe(settled);

    const after = emphasis(container);
    expect(after.find((e) => e.id === 'perimeter-watch')).toMatchObject({ agents: 1, tree: 1 });
    expect(after.some((e) => e.agents < 1)).toBe(true);
    for (const e of after) expect(e.agents).toBeCloseTo(e.tree);

    label.dispatchEvent(new MouseEvent('mouseleave'));
    await waitFor(() => emphasis(container).every((e) => e.tree === 1));
    expect(emphasis(container).every((e) => e.agents === 1)).toBe(true);
  });
});
