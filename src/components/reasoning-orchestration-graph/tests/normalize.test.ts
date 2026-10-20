import { describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/reasoning-orchestration.default.json';
import {
  MAX_ANNOTATIONS,
  MAX_NODES,
  normalizeReasoningOrchestration,
  pathToNode,
} from '../lib/index.js';

describe('normalizeReasoningOrchestration', () => {
  it('reads the sample: stages, models, paths, the active path and the panels', () => {
    const model = normalizeReasoningOrchestration(fixture);
    expect(model.empty).toBe(false);
    expect(model.title).toBe('Test-time compute orchestrator / Opus 5.5 × GPT-6 Astra');
    expect(model.subtitle).toBe('Stanford refining over resampling · arXiv:2608.05643 · Run 0214');
    expect(model.models.map((m) => [m.id, m.role, m.detail])).toEqual([
      ['astra', 'Explore', 'Breadth T=0.8'],
      ['opus', 'Repair', 'Depth T=0.0'],
    ]);
    expect(model.stages.map((s) => [s.label, s.depthFrom, s.depthTo, s.status])).toEqual([
      ['Sample', 0, 4, 'done'],
      ['Explore', 5, 8, 'done'],
      ['Verify', 9, 11, 'done'],
      ['Repair', 12, 14, 'active'],
    ]);
    expect(model.maxDepth).toBe(14);
    expect(model.activePathId).toBe('refine');
    const active = model.paths.find((p) => p.id === 'refine')!;
    expect(active.nodes[0]).toBe('prompt');
    expect(active.nodes[active.nodes.length - 1]).toBe('r14');
    expect(model.paths).toHaveLength(4);
    expect(model.annotations).toEqual([
      {
        nodeId: 'r14',
        title: 'Depth 14 · Local logic repair',
        lines: ['MATH500 accuracy +28.4% · AMC +7.5%', 'Opus 5.5 critic & corrector (T=0.0)'],
        modelId: 'opus',
      },
    ]);
    expect(model.stageMetric).toEqual({ key: 'accuracy', label: 'Accuracy', share: true });
    expect(model.benchmarks[0]).toEqual({ label: 'MATH500', value: '58.8%', delta: '+28.0', trend: 'up' });
    expect(model.entropy?.series.map((s) => [s.label, s.modelId, s.values.length])).toEqual([
      ['T=0.8', 'astra', 96],
      ['T=0.0', 'opus', 96],
    ]);
    expect(model.entropy?.highlight).toEqual([{ from: 44, to: 52, label: 'Recovery' }]);
    // Stages carry a status, so they are the pipeline.
    expect(model.pipeline?.stages.map((s) => s.status)).toEqual(['done', 'done', 'done', 'active']);
    expect(model.scaling?.series.map((s) => s.label)).toEqual(['Resample', 'Refinement']);
    expect(model.dropped).toEqual({ nodes: 0, links: 0 });
  });

  it('puts each node in its stage and parents it on the shallowest incoming link', () => {
    const model = normalizeReasoningOrchestration(fixture);
    const byId = new Map(model.nodes.map((n) => [n.id, n]));
    // A frontier candidate has a cross link from its neighbour; its parent is still the draft above it.
    expect(byId.get('s1a-f1')?.parent).toBe('s1a');
    expect(byId.get('s1a-f1')?.stageIndex).toBe(1);
    expect(byId.get('r14')?.stageIndex).toBe(3);
    expect(byId.get('resample-1')?.parent).toBeNull();
    expect(pathToNode(model, 'r14')).toEqual(model.paths.find((p) => p.id === 'refine')!.nodes);
  });

  it('derives depth from links, nodes from links and the active path from node ids', () => {
    const model = normalizeReasoningOrchestration({
      links: [
        { source: 'q', target: 'a' },
        { source: 'a', target: 'b' },
        { source: 'q', target: 'c' },
        { source: 'c', target: 'd', kind: 'repair' },
      ],
      activePath: ['q', 'c', 'd'],
    });
    expect(model.nodes.map((n) => [n.id, n.depth, n.parent])).toEqual([
      ['q', 0, null],
      ['a', 1, 'q'],
      ['b', 2, 'a'],
      ['c', 1, 'q'],
      ['d', 2, 'c'],
    ]);
    expect(model.links.find((l) => l.target === 'd')?.kind).toBe('refine');
    expect(model.activePathId).toBe('active');
    expect(model.paths[0]).toMatchObject({ id: 'active', nodes: ['q', 'c', 'd'] });
    // Readouts default to the graph's own counts.
    expect(model.summary.map((m) => `${m.label} ${m.value}`)).toEqual(['Candidates 4', 'Refinements 1', 'Paths 1']);
  });

  it('adds the links a path implies and the models nodes name', () => {
    const model = normalizeReasoningOrchestration({
      nodes: [{ id: 'r' }, { id: 'x', model: 'Critic' }],
      paths: [{ id: 'p', nodes: ['r', 'x', 'y'], model: 'Critic' }],
    });
    expect(model.links.map((l) => l.id)).toEqual(['r->x', 'x->y']);
    expect(model.models.map((m) => m.name)).toEqual(['Critic']);
    // Named by the path, not by the node.
    expect(model.nodes.find((n) => n.id === 'y')?.modelId).toBe('Critic');
    // No active path was named: nothing is highlighted.
    expect(model.activePathId).toBeNull();
  });

  it('reads state and status words, and scores as 0–1', () => {
    const model = normalizeReasoningOrchestration({
      nodes: [
        { id: 'a', state: 'Rejected', score: 82 },
        { id: 'b', state: 'repaired', score: '0.4' },
        { id: 'c', state: 'error' },
        { id: 'd', state: 'whatever' },
      ],
      stages: [{ label: 'One', status: 'in progress' }, { label: 'Two', status: 'queued' }],
    });
    expect(model.nodes.map((n) => [n.state, n.score])).toEqual([
      ['pruned', 0.82],
      ['refined', 0.4],
      ['failed', null],
      ['candidate', null],
    ]);
    expect(model.stages.map((s) => s.status)).toEqual(['active', 'pending']);
  });

  it('splits the depth evenly among stages that name none and hold no nodes', () => {
    const model = normalizeReasoningOrchestration({
      nodes: [{ id: 'a', depth: 0 }, { id: 'b', depth: 6 }],
      links: [{ source: 'a', target: 'b' }],
      stages: [{ label: 'Early' }, { label: 'Late' }],
    });
    expect(model.stages.map((s) => [s.depthFrom, s.depthTo])).toEqual([
      [0, 3],
      [3, 6],
    ]);
    expect(model.nodes.map((n) => n.stageIndex)).toEqual([0, 1]);
  });

  it('caps nodes, keeping paths and roots and leaving pruned and deep nodes out', () => {
    const nodes = [{ id: 'root', depth: 0 }];
    const links: { source: string; target: string }[] = [];
    for (let i = 0; i < MAX_NODES + 50; i += 1) {
      nodes.push({ id: `n${i}`, depth: 1 + (i % 9), ...(i % 2 ? { state: 'pruned' } : {}) } as never);
      links.push({ source: 'root', target: `n${i}` });
    }
    const model = normalizeReasoningOrchestration({
      nodes,
      links,
      paths: [{ id: 'keep', nodes: ['root', `n${MAX_NODES + 49}`] }],
      activePath: 'keep',
    });
    expect(model.nodes).toHaveLength(MAX_NODES);
    expect(model.dropped.nodes).toBe(51);
    expect(model.activePathId).toBe('keep');
    expect(model.nodes.some((n) => n.id === `n${MAX_NODES + 49}`)).toBe(true);
    expect(model.links.every((l) => model.nodes.some((n) => n.id === l.target))).toBe(true);
  });

  it('keeps at most three annotations and drops one on an unknown node', () => {
    const model = normalizeReasoningOrchestration({
      links: [{ source: 'a', target: 'b' }],
      annotations: [
        { node: 'zz', title: 'Missing' },
        ...Array.from({ length: 5 }, (_, i) => ({ node: 'b', title: `Note ${i}` })),
      ],
    });
    expect(model.annotations.map((a) => a.title)).toEqual(['Note 0', 'Note 1', 'Note 2']);
    expect(model.annotations).toHaveLength(MAX_ANNOTATIONS);
  });

  it('unwraps a FuseDash data[0] payload and a bare link list', () => {
    const wrapped = normalizeReasoningOrchestration({
      name: 'Wrapped',
      data: [{ links: [{ source: 'a', target: 'b' }] }],
    });
    expect(wrapped.title).toBe('Wrapped');
    expect(wrapped.nodes).toHaveLength(2);
    expect(normalizeReasoningOrchestration([{ source: 'a', target: 'b' }]).nodes).toHaveLength(2);
  });

  it('is empty for nothing usable', () => {
    for (const raw of [null, undefined, {}, [], 'x', { nodes: [] }, [{ nope: true }]]) {
      expect(normalizeReasoningOrchestration(raw).empty).toBe(true);
    }
  });
});
