import { describe, expect, it, vi } from 'vitest';

import fixture from '../../../stories/fixtures/reasoning-orchestration.default.json';
import { normalizeReasoningOrchestration } from '../lib/index.js';
import {
  orchestrationPalette,
  renderEntropyStrip,
  renderReasoningOrchestration,
  renderScalingChart,
  renderTopChart,
} from '../render/index.js';

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
    // Layers in paint order: rules, links, nodes, hit, candidate paths, highlight, roots, hover, notes.
    const layers = [...svg.children].map((c) => c.getAttribute('class')).filter(Boolean);
    expect(layers).toEqual([
      'ro-rules',
      'ro-links',
      'ro-nodes',
      'ro-hit',
      'ro-paths',
      'ro-highlight',
      'ro-roots',
      'ro-hover',
      'ro-notes',
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

  it('names the stages down the right edge and hangs the note off its node', () => {
    const el = mount();
    renderReasoningOrchestration(el, { model, width: 880, height: 520, themeMode: 'dark' });
    expect([...el.querySelectorAll('.ro-readout text')].map((t) => t.textContent)).toEqual([
      'SAMPLE · D0–4',
      'EXPLORE · D5–8',
      'VERIFY · D9–11',
      'REPAIR · D12–14',
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

  it('draws nothing for an empty model or a zero-size plot', () => {
    const el = mount();
    expect(renderReasoningOrchestration(el, { model: normalizeReasoningOrchestration(null), width: 880, height: 520, themeMode: 'light' })).toBeNull();
    expect(renderReasoningOrchestration(el, { model, width: 0, height: 520, themeMode: 'light' })).toBeNull();
    expect(el.childElementCount).toBe(0);
    el.remove();
  });
});

describe('supporting strips', () => {
  it('top chart: a bar per depth, lit along the path, and a segment per stage with its metric', () => {
    const el = mount();
    const chain = model.paths.find((p) => p.id === 'refine')!.nodes;
    renderTopChart(el, { model, width: 880, height: 40, themeMode: 'dark', chain, highlightColor: '#ff8a4c' });
    expect(el.querySelectorAll('.ro-breadth-bar')).toHaveLength(15);
    // The path passes through depths 0, 2, 4 and 8–14.
    expect(el.querySelectorAll('.ro-breadth-bar.is-lit')).toHaveLength(10);
    expect([...el.querySelectorAll('.ro-stage-label')].map((t) => t.textContent)).toEqual([
      'SAMPLE',
      'EXPLORE',
      'VERIFY',
      'REPAIR',
    ]);
    expect([...el.querySelectorAll('.ro-stage-value')].map((t) => t.textContent)).toEqual([
      '30.8%',
      '41.2%',
      '52.6%',
      '58.8%',
    ]);
    const bars = [...el.querySelectorAll('.ro-stage-metric')].map((r) => Number(r.getAttribute('width')));
    expect(bars[3]).toBeGreaterThan(bars[0]!);
    el.remove();
  });

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

  it('compute scaling: one line per strategy with its last value', () => {
    const el = mount();
    renderScalingChart(el, { scaling: model.scaling!, model, width: 260, height: 56, themeMode: 'light' });
    expect(el.querySelectorAll('.ro-scaling-series')).toHaveLength(2);
    expect([...el.querySelectorAll('.ro-scaling-end')].map((t) => t.textContent)).toEqual(['42.1%', '58.8%']);
    expect([...el.querySelectorAll('.ro-scaling-tick')].map((t) => t.textContent)).toEqual(['1×', '16×']);
    el.remove();
  });
});
