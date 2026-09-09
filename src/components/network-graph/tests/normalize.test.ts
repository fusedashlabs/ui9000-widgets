import { describe, expect, it } from 'vitest';

import {
  MAX_NETWORK_NODES,
  normalizeNetworkGraphData,
} from '../lib/normalize.js';
import type { NetworkGraphInput } from '../lib/types.js';

import networkFixture from '../../../stories/fixtures/network-graph.fusedash.json';

describe('normalizeNetworkGraphData', () => {
  it('network-graph.fusedash.json → the widget graph in data[0]', () => {
    const model = normalizeNetworkGraphData(networkFixture as NetworkGraphInput);

    expect(model.nodes).toHaveLength(10);
    expect(model.links).toHaveLength(9);
    expect(model.breakpoints).toHaveLength(7);
    expect(model.maxLinkValue).toBe(12600);
    expect(model.nodes[0]).toMatchObject({
      id: 'citigroup',
      label: 'Citigroup',
      type: 'investment_bank',
      value: 2405.7,
    });
    // No `type` on the mock's links — everything falls back to the neutral stroke.
    expect(new Set(model.links.map((l) => l.type))).toEqual(new Set(['neutral']));
  });

  it('accepts a bare { nodes, links } chat graph', () => {
    const model = normalizeNetworkGraphData({
      nodes: [
        { id: 'a', label: 'A', value: 10, type: 'bank' },
        { id: 'b', value: 20, type: 'vc' },
      ],
      links: [{ id: 'l1', source: 'a', target: 'b', value: 5, type: 'primary' }],
    });

    expect(model.nodes.map((n) => n.label)).toEqual(['A', 'b']);
    expect(model.links[0].type).toBe('primary');
  });

  it('derives nodes from a links-only payload', () => {
    const model = normalizeNetworkGraphData([
      { source: 'a', target: 'b', value: 1 },
      { source: 'b', target: 'c', value: 2 },
    ]);

    expect(model.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    expect(model.links).toHaveLength(2);
    expect(model.links[0].id).toBe('a->b-0');
  });

  it('drops dangling, duplicate and self links', () => {
    const model = normalizeNetworkGraphData({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [
        { id: 'keep', source: 'a', target: 'b', value: 3 },
        { id: 'keep', source: 'b', target: 'a', value: 4 },
        { id: 'self', source: 'a', target: 'a', value: 5 },
        { id: 'dangling', source: 'a', target: 'ghost', value: 6 },
      ],
    });

    expect(model.links.map((l) => l.id)).toEqual(['keep']);
  });

  it('caps dense payloads at the mark budget, keeping the largest nodes', () => {
    const nodes = Array.from({ length: MAX_NETWORK_NODES + 40 }, (_, i) => ({
      id: `n${i}`,
      value: i,
    }));
    const model = normalizeNetworkGraphData({ nodes, links: [] });

    expect(model.nodes).toHaveLength(MAX_NETWORK_NODES);
    expect(model.nodes[0].id).toBe(`n${MAX_NETWORK_NODES + 39}`);
  });

  it('returns an empty model for invalid payloads', () => {
    expect(normalizeNetworkGraphData(null).nodes).toEqual([]);
    expect(normalizeNetworkGraphData({}).nodes).toEqual([]);
    expect(normalizeNetworkGraphData({ data: [] }).nodes).toEqual([]);
    expect(normalizeNetworkGraphData({ nodes: [{}], links: [] }).nodes).toEqual([]);
  });
});
