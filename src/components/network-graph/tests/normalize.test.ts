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

  it('gives each type the next page colour and keeps an explicit one', () => {
    const { nodes } = normalizeNetworkGraphData({
      nodes: [
        { id: 'a', type: 'investment_bank' },
        { id: 'b', type: 'fund' },
        { id: 'c', type: 'investment_bank' },
        { id: 'd', type: 'fund', color: '#123456' },
      ],
      links: [],
    });
    expect(nodes.map((node) => node.color)).toEqual([
      '#473DD9',
      '#36C4A5',
      '#473DD9',
      '#123456',
    ]);
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

  it('keeps what the panels draw, in data[0] and on a bare graph', () => {
    const graph = {
      nodes: [
        {
          id: 'a',
          date: '2026-01-05',
          topics: ['Trade', 3],
          events: ['Summit'],
          role: 'Analyst',
          bio: 'Text',
          metrics: [{ label: 'Share', value: 4 }],
          eventsLabel: 'Meetings',
          linksLabel: 'Partners',
        },
        { id: 'b' },
      ],
      links: [{ id: 'l', source: 'a', target: 'b', value: 1, date: '2026-02-02' }],
      topics: [{ name: 'Trade', value: 1 }],
      ranking: [{ name: 'a', value: 1 }],
      labels: { linkValue: 'votes' },
    };

    for (const model of [
      normalizeNetworkGraphData(graph),
      normalizeNetworkGraphData({ data: [graph] }),
    ]) {
      expect(model.topics).toEqual(graph.topics);
      expect(model.ranking).toEqual(graph.ranking);
      expect(model.labels).toEqual(graph.labels);
      expect(model.links[0].date).toBe('2026-02-02');
      expect(model.nodes[0]).toMatchObject({
        date: '2026-01-05',
        topics: ['Trade'],
        events: ['Summit'],
        role: 'Analyst',
        bio: 'Text',
        metrics: [{ label: 'Share', value: 4 }],
        eventsLabel: 'Meetings',
        linksLabel: 'Partners',
      });
    }
  });

  it('turns numeric strings of the panels into numbers and drops entries without one', () => {
    const graph = {
      nodes: [
        {
          id: 'a',
          metrics: [
            {
              label: 'Share',
              value: '62.5',
              unit: '%',
              change: '-1.5',
              changeUnit: ' pt',
              series: [
                { date: '2026-01-01', value: '4' },
                { date: '2026-02-01', value: 'n/a' },
              ],
            },
            { label: 'Broken', value: 'n/a' },
            'junk',
          ],
        },
      ],
      links: [],
      topics: [
        { name: 'Trade', value: '62', unit: '%', change: null, selected: 'yes' },
        { name: 2026, value: 'n/a' },
        { name: ' ', value: 1 },
        null,
      ],
      ranking: [
        { name: 'a', value: '7', change: '2', connections: '3' },
        { name: 'b', value: 'many' },
      ],
      labels: { linkValue: 'votes', nodeValue: 5 },
    };
    const model = normalizeNetworkGraphData(graph);

    expect(model.nodes[0].metrics).toEqual([
      {
        label: 'Share',
        value: 62.5,
        unit: '%',
        change: -1.5,
        changeUnit: ' pt',
        series: [{ date: '2026-01-01', value: 4 }],
      },
    ]);
    expect(model.topics).toEqual([
      { name: 'Trade', value: 62, unit: '%' },
      { name: '2026', value: 0 },
    ]);
    expect(model.ranking).toEqual([{ name: 'a', value: 7, change: 2, connections: 3 }]);
    expect(model.labels).toEqual({ linkValue: 'votes' });
  });

  it('keeps only plain colours, since they are written into style attributes', () => {
    const colors = [
      '#123',
      '#a1b2c3',
      'teal',
      'rgb(1, 2, 3)',
      'hsl(120deg 50% 40% / 0.5)',
      'var(--graph-accent)',
      'red; background-image: url(https://example.com/x)',
      'url(https://example.com/x)',
      'var(--x); position: fixed',
      'rgb(1,2,3) !important',
      '"red"',
    ];
    const graph = {
      nodes: colors.map((color, index) => ({ id: `n${index}`, type: 't', color })),
      links: [],
      topics: colors.map((color, index) => ({ name: `t${index}`, value: 1, color })),
    };
    const model = normalizeNetworkGraphData(graph);

    const kept = colors.slice(0, 6);
    expect(model.topics?.map((topic) => topic.color)).toEqual([
      ...kept,
      ...colors.slice(6).map(() => undefined),
    ]);
    expect(model.nodes.slice(0, 6).map((node) => node.color)).toEqual(kept);
    // A rejected colour falls back to the page palette like a node without one.
    for (const node of model.nodes.slice(6)) expect(node.color).toBe('#473DD9');
  });

  it('returns an empty model for invalid payloads', () => {
    expect(normalizeNetworkGraphData(null).nodes).toEqual([]);
    expect(normalizeNetworkGraphData({}).nodes).toEqual([]);
    expect(normalizeNetworkGraphData({ data: [] }).nodes).toEqual([]);
    expect(normalizeNetworkGraphData({ nodes: [{}], links: [] }).nodes).toEqual([]);
  });
});
