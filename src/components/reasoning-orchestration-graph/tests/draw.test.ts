import { describe, expect, it, vi } from 'vitest';

import fixture from '../../../stories/fixtures/reasoning-orchestration.default.json';
import { normalizeReasoningOrchestration } from '../lib/index.js';
import { orchestrationPalette, renderEntropyStrip, renderReasoningOrchestration } from '../render/index.js';

const model = normalizeReasoningOrchestration(fixture);

function mount(): HTMLElement {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
}

describe('renderReasoningOrchestration', () => {
  it('draws the active path above subordinate candidate paths and hairlines', () => {
    const el = mount();
    const controller = renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark' })!;
    const svg = el.querySelector('svg')!;
    expect(svg.getAttribute('aria-label')).toContain('active path Refine path, 10 steps');
    // Layers in paint order: rules, links, nodes, hit, candidate paths, hover preview, highlight, roots, hover, notes, stage hits.
    const layers = [...svg.children].map((c) => c.getAttribute('class')).filter(Boolean);
    expect(layers).toEqual([
      'ro-rules',
      'ro-links',
      'ro-nodes',
      'ro-hit',
      'ro-paths',
      'ro-preview',
      'ro-highlight',
      'ro-roots',
      'ro-hover',
      'ro-notes',
      'ro-stage-hits',
    ]);
    const active = el.querySelector('.ro-active-line')!;
    expect(Number(active.getAttribute('stroke-width'))).toBeGreaterThan(2);
    const candidates = [...el.querySelectorAll('.ro-path')].map((g) => g.getAttribute('data-path'));
    expect(candidates).toEqual(['critic-b', 'vote', 'breadth']);
    for (const line of el.querySelectorAll('.ro-path-line')) {
      expect(Number(line.getAttribute('stroke-width'))).toBeLessThan(Number(active.getAttribute('stroke-width')));
      expect(Number(line.getAttribute('stroke-opacity'))).toBeLessThan(1);
    }
    expect(controller.highlighted()[controller.highlighted().length - 1]).toBe('r14');
    el.remove();
  });

  it('colours links by model and dashes the ones into pruned nodes', () => {
    const el = mount();
    renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark' });
    const palette = orchestrationPalette('dark');
    const model_ = el.querySelectorAll('.ro-link--model');
    expect([...model_].map((p) => p.getAttribute('stroke'))).toEqual(expect.arrayContaining(palette.models.slice(0, 2)));
    const pruned = el.querySelector('.ro-link--pruned')!;
    expect(pruned.getAttribute('stroke')).toBe(palette.pruned);
    expect(pruned.getAttribute('stroke-dasharray')).toBe('2 2');
    expect(el.querySelector('.ro-link--fan')).not.toBeNull();
    // One dot per node but the roots.
    expect(el.querySelectorAll('.ro-node')).toHaveLength(model.nodes.filter((n) => n.parent).length);
    el.remove();
  });

  it('paints models that have no colour from the page style', () => {
    const el = mount();
    renderReasoningOrchestration(el, {
      model,
      width: 880,
      height: 520,
      themeMode: 'light',
      styleId: 'palette1',
    });
    const palette = orchestrationPalette('light', 'palette1');
    expect(palette.models[0]).toBe('#2039B4');
    expect(el.querySelector('.ro-active-end')?.getAttribute('fill')).toBe(palette.models[1]);
    el.remove();
  });

  it('warms the active path to its model colour, in ink on light', () => {
    for (const mode of ['dark', 'light'] as const) {
      const el = mount();
      renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: mode });
      const palette = orchestrationPalette(mode);
      const stops = [...el.querySelectorAll('linearGradient stop')].map((s) => s.getAttribute('stop-color'));
      expect(stops).toEqual([palette.pathStart, palette.pathMid, palette.models[1]]);
      expect(el.querySelector('.ro-active-end')?.getAttribute('fill')).toBe(palette.models[1]);
      el.remove();
    }
  });

  it('names the stages down the right edge with their metric and hangs the note off its node', () => {
    const el = mount();
    renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark' });
    expect([...el.querySelectorAll('.ro-readout text')].map((t) => t.textContent)).toEqual([
      'SAMPLE · D0–4 · 30.8%',
      'EXPLORE · D5–8 · 41.2%',
      'VERIFY · D9–11 · 52.6%',
      'REPAIR · D12–14 · 58.8%',
    ]);
    expect(el.querySelectorAll('.ro-stage-arc')).toHaveLength(3);
    const note = el.querySelector('.ro-note')!;
    expect(note.getAttribute('data-node')).toBe('r14');
    expect([...note.querySelectorAll('text')].map((t) => t.textContent)).toEqual([
      'DEPTH 14 · LOCAL LOGIC REPAIR',
      'MATH500 ACCURACY +28.4% · AMC +7.5%',
      'OPUS 5.5 CRITIC & CORRECTOR (T=0.0)',
    ]);
    const box = note.querySelector('rect')!;
    expect(Number(box.getAttribute('x')) + Number(box.getAttribute('width'))).toBeLessThanOrEqual(880 - 4);
    el.remove();
  });

  it('hovers a stage name, above the plot, and not where a note covers it', () => {
    const el = mount();
    const onStageHover = vi.fn();
    const onStageClick = vi.fn();
    const onSelect = vi.fn();
    const onLeave = vi.fn();
    renderReasoningOrchestration(el, {
      model,
      width: 880,
      height: 520,
      themeMode: 'dark',
      handlers: { onStageHover, onStageClick, onSelect, onLeave },
    });
    const hits = [...el.querySelectorAll<SVGRectElement>('.ro-stage-hit')];
    expect(hits.map((hit) => hit.getAttribute('data-stage'))).toEqual(['sample', 'explore', 'verify', 'repair']);
    // The hit layer sits over the hover overlay and the notes.
    expect(el.querySelector('svg.ro-svg')!.lastElementChild?.getAttribute('class')).toBe('ro-stage-hits');
    // A hit target spans its name and tick, ending at the right edge.
    const repair = hits[3]!;
    expect(Number(repair.getAttribute('x')) + Number(repair.getAttribute('width'))).toBeCloseTo(880 - 4);
    repair.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(onStageHover).toHaveBeenCalledTimes(1);
    expect(onStageHover.mock.calls[0]![0]).toMatchObject({ id: 'repair', label: 'Repair' });
    repair.dispatchEvent(new MouseEvent('mouseleave'));
    expect(onLeave).toHaveBeenCalled();
    // A click on a stage name is its own: it selects no node or path.
    repair.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onStageClick.mock.calls[0]![0]).toMatchObject({ id: 'repair' });
    expect(onSelect).not.toHaveBeenCalled();
    // A name hidden behind a note does not hover either.
    const readouts = [...el.querySelectorAll('.ro-readout')];
    hits.forEach((hit, i) => {
      expect(hit.getAttribute('display') === 'none').toBe(readouts[i]!.getAttribute('visibility') === 'hidden');
    });
    el.remove();
  });

  it('gives plain depth ticks no stage hover', () => {
    const el = mount();
    renderReasoningOrchestration(el, { model: normalizeReasoningOrchestration({ ...fixture, stages: [] }), width: 880, height: 520, themeMode: 'dark' });
    expect(el.querySelectorAll('.ro-readout').length).toBeGreaterThan(0);
    expect(el.querySelectorAll('.ro-stage-hit')).toHaveLength(0);
    el.remove();
  });

  it('leaves the metric off a stage that has none, and off every stage when none carries one', () => {
    const el = mount();
    const stages = fixture.stages.map((stage, i) => (i === 0 ? { ...stage, metrics: {} } : stage));
    renderReasoningOrchestration(el, { model: normalizeReasoningOrchestration({ ...fixture, stages }), width: 880, height: 520, themeMode: 'dark' });
    expect(el.querySelector('.ro-readout text')?.textContent).toBe('SAMPLE · D0–4');
    const bare = fixture.stages.map(({ metrics: _metrics, ...stage }) => stage);
    renderReasoningOrchestration(el, { model: normalizeReasoningOrchestration({ ...fixture, stages: bare }), width: 880, height: 520, themeMode: 'dark' });
    expect([...el.querySelectorAll('.ro-readout text')].map((t) => t.textContent)).toEqual([
      'SAMPLE · D0–4',
      'EXPLORE · D5–8',
      'VERIFY · D9–11',
      'REPAIR · D12–14',
    ]);
    el.remove();
  });

  it('previews what a click on a hovered node or path would highlight, at half strength', () => {
    const el = mount();
    const controller = renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark' })!;
    const overlay = el.querySelector('.ro-hit')!;
    const layer = el.querySelector('.ro-preview')!;
    const placed = controller.layout.nodes;
    // jsdom lays nothing out, so client coordinates are plot coordinates.
    const hoverNode = (id: string) => {
      const p = placed.get(id)!;
      overlay.dispatchEvent(new MouseEvent('mousemove', { clientX: p.x, clientY: p.y, bubbles: true }));
    };
    expect(layer.getAttribute('opacity')).toBe('0.5');
    expect(layer.childElementCount).toBe(0);

    // The end of a candidate path previews that path, drawn like the highlight.
    hoverNode('alt-a12');
    const critic = model.paths.find((path) => path.id === 'critic-b')!;
    expect(layer.querySelectorAll('.ro-preview-node')).toHaveLength(critic.nodes.length - 2);
    expect(layer.querySelector('.ro-preview-glow')).not.toBeNull();
    expect(layer.querySelector('.ro-preview-end')?.getAttribute('fill')).toBe(orchestrationPalette('dark').models[1]);
    expect(layer.querySelector('.ro-preview-line')?.getAttribute('stroke')).toMatch(/^url\(#ui9000-ro-preview-\d+\)$/);
    // The highlight itself is untouched.
    expect(el.querySelectorAll('.ro-highlight .ro-active-line')).toHaveLength(1);

    // A node on the highlighted path previews nothing: a click there keeps that path.
    hoverNode(controller.highlighted()[4]!);
    expect(layer.childElementCount).toBe(0);
    hoverNode('alt-a12');
    expect(layer.childElementCount).toBeGreaterThan(0);
    overlay.dispatchEvent(new MouseEvent('mouseleave'));
    expect(layer.childElementCount).toBe(0);

    // Hovering a candidate path (or focusing it) previews the whole path; leaving clears it.
    const vote = el.querySelector('.ro-path[data-path="vote"] .ro-path-hit')!;
    vote.dispatchEvent(new MouseEvent('mouseenter'));
    expect(layer.querySelectorAll('.ro-preview-node')).toHaveLength(model.paths.find((path) => path.id === 'vote')!.nodes.length - 2);
    vote.dispatchEvent(new MouseEvent('mouseleave'));
    expect(layer.childElementCount).toBe(0);
    vote.dispatchEvent(new FocusEvent('focus'));
    expect(layer.childElementCount).toBeGreaterThan(0);
    vote.dispatchEvent(new FocusEvent('blur'));
    expect(layer.childElementCount).toBe(0);

    // Selecting clears the preview; the hovered node is now part of the highlight.
    hoverNode('alt-a12');
    controller.setSelection({ pathId: null, nodeId: 'alt-a12' });
    expect(layer.childElementCount).toBe(0);
    el.remove();
  });

  it('fades the notes off a selected path, and shows them again for the active path', () => {
    const el = mount();
    const withCriticNote = normalizeReasoningOrchestration({
      ...fixture,
      annotations: [...fixture.annotations, { node: 'alt-a12', title: 'Critic B gives up' }],
    });
    const controller = renderReasoningOrchestration(el, { model: withCriticNote, width: 880, height: 520, themeMode: 'dark' })!;
    const faded = () =>
      Object.fromEntries(
        [...el.querySelectorAll<SVGGElement>('.ro-note')].map((note) => [
          note.getAttribute('data-node'),
          note.classList.contains('is-faded') && note.style.opacity === '0',
        ]),
      );
    const notes = el.querySelectorAll('.ro-note');

    // The active path highlighted: every note shows, the one off it too.
    expect(faded()).toEqual({ r14: false, 'alt-a12': false });
    // Another path: only the notes on it stay. Notes are drawn once, not on every selection.
    controller.setSelection({ pathId: 'critic-b', nodeId: null });
    expect(faded()).toEqual({ r14: true, 'alt-a12': false });
    expect([...el.querySelectorAll('.ro-note')]).toEqual([...notes]);
    // The path to a node short of the active path's end.
    controller.setSelection({ pathId: null, nodeId: 'r13' });
    expect(faded()).toEqual({ r14: true, 'alt-a12': true });
    // The active path selected again, or the selection cleared.
    controller.setSelection({ pathId: 'refine', nodeId: null });
    expect(faded()).toEqual({ r14: false, 'alt-a12': false });
    controller.setSelection({ pathId: 'critic-b', nodeId: null });
    controller.setSelection({ pathId: null, nodeId: null });
    expect(faded()).toEqual({ r14: false, 'alt-a12': false });
    el.remove();
  });

  it('shows a stage name a faded note was covering', () => {
    const el = mount();
    const controller = renderReasoningOrchestration(el, { model, width: 520, height: 600, themeMode: 'dark' })!;
    const hidden = () =>
      [...el.querySelectorAll('.ro-readout')].filter((g) => g.getAttribute('visibility') === 'hidden').length;
    const blocked = () => [...el.querySelectorAll('.ro-stage-hit')].filter((r) => r.getAttribute('display') === 'none').length;
    expect(hidden()).toBeGreaterThan(0);
    expect(blocked()).toBe(hidden());
    controller.setSelection({ pathId: 'critic-b', nodeId: null });
    expect(hidden()).toBe(0);
    expect(blocked()).toBe(0);
    el.remove();
  });

  it('leaves annotations out when asked', () => {
    const el = mount();
    renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark', showAnnotations: false });
    expect(el.querySelector('.ro-note')).toBeNull();
    el.remove();
  });

  it('moves the highlight to a selected path or the path to a node without a redraw', () => {
    const el = mount();
    const controller = renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark' })!;
    const links = el.querySelector('.ro-links');
    controller.setSelection({ pathId: 'critic-b', nodeId: null });
    expect(controller.highlighted()).toEqual(model.paths.find((p) => p.id === 'critic-b')!.nodes);
    // The active path is now a candidate like the others.
    expect([...el.querySelectorAll('.ro-path')].map((g) => g.getAttribute('data-path'))).toContain('refine');
    controller.setSelection({ pathId: null, nodeId: 's5a-f0' });
    expect(controller.highlighted()).toEqual(['prompt', 's5', 's5a', 's5a-f0']);
    expect(el.querySelector('.ro-links')).toBe(links);
    el.remove();
  });

  it('selects a candidate path on click and on Enter', () => {
    const el = mount();
    const onSelect = vi.fn();
    renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark', handlers: { onSelect } });
    const hit = el.querySelector('.ro-path[data-path="vote"] .ro-path-hit')!;
    expect(hit.getAttribute('tabindex')).toBe('0');
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith({ pathId: 'vote', nodeId: null });
    el.remove();
  });

  it('picks the highlighted path again on a click on its nodes or near its line', () => {
    const el = mount();
    const onSelect = vi.fn();
    const controller = renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark', handlers: { onSelect } })!;
    const overlay = el.querySelector('.ro-hit')!;
    // jsdom lays nothing out, so client coordinates are plot coordinates.
    const click = (p: { x: number; y: number }) =>
      overlay.dispatchEvent(new MouseEvent('click', { clientX: p.x, clientY: p.y, bubbles: true }));
    const placed = controller.layout.nodes;
    const chain = controller.highlighted();

    // Nothing selected: a node on the active path picks the active path, not the path to that node.
    click(placed.get(chain[3]!)!);
    expect(onSelect).toHaveBeenLastCalledWith({ pathId: 'refine', nodeId: null });

    // A node off the highlighted path still picks the path to it.
    const off = [...placed.values()].find((p) => !chain.includes(p.id) && p.id !== chain[0])!;
    click(off);
    expect(onSelect).toHaveBeenLastCalledWith({ pathId: null, nodeId: off.id });

    // On the line between two of its nodes, clear of every node.
    const points = chain.map((id) => placed.get(id)!);
    const clear = points
      .slice(1)
      .map((b, i) => ({ x: (points[i]!.x + b.x) / 2, y: (points[i]!.y + b.y) / 2 }))
      .find((m) => [...placed.values()].every((p) => (p.x - m.x) ** 2 + (p.y - m.y) ** 2 > 14 * 14));
    expect(clear).toBeDefined();
    click(clear!);
    expect(onSelect).toHaveBeenLastCalledWith({ pathId: 'refine', nodeId: null });

    // With a path selected, a click on it sends that selection again.
    controller.setSelection({ pathId: 'critic-b', nodeId: null });
    click(placed.get('alt-a10')!);
    expect(onSelect).toHaveBeenLastCalledWith({ pathId: 'critic-b', nodeId: null });
    el.remove();
  });

  it('draws nothing for an empty model or a zero-size plot', () => {
    const el = mount();
    expect(renderReasoningOrchestration(el, { model: normalizeReasoningOrchestration(null), width: 880, height: 520, themeMode: 'light' })).toBeNull();
    expect(renderReasoningOrchestration(el, { model, width: 0, height: 520, themeMode: 'light' })).toBeNull();
    expect(el.childElementCount).toBe(0);
    el.remove();
  });
});

describe('supporting strips', () => {
  it('entropy: the first series up, the second down, the recovery band called out', () => {
    const el = mount();
    renderEntropyStrip(el, { entropy: model.entropy!, model, width: 960, height: 30, themeMode: 'dark', highlightColor: '#ff8a4c' });
    expect(el.querySelectorAll('.ro-entropy-series--0 rect')).toHaveLength(96);
    expect(el.querySelectorAll('.ro-entropy-series--1 rect')).toHaveLength(96);
    const up = el.querySelector('.ro-entropy-series--0 rect')!;
    const down = el.querySelector('.ro-entropy-series--1 rect')!;
    expect(Number(up.getAttribute('y')) + Number(up.getAttribute('height'))).toBeCloseTo(15);
    expect(Number(down.getAttribute('y'))).toBe(15);
    const band = el.querySelector('.ro-entropy-band')!;
    expect(Number(band.getAttribute('x'))).toBe(44 * 10);
    expect(Number(band.getAttribute('width'))).toBe(9 * 10);
    el.remove();
  });
});
