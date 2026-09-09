import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/sankey.fusedash.json';
import {
  buildColorRanges,
  generateBreakPoints,
  normalizeSankeyData,
  pickRangeColor,
  type SankeyFusePayload,
} from '../lib/index.js';

const FUSEDASH_MOCK = fusedashFixture as unknown as SankeyFusePayload;

describe('normalizeSankeyData', () => {
  it('accepts the FuseDash DEFAULT_SANKEY mock (arrangeBy / display)', () => {
    const model = normalizeSankeyData(FUSEDASH_MOCK);

    expect(model.circular).toBe(false);
    expect(model.links).toHaveLength(25);
    // 8 counties + 5 crop groups actually present in the mock rows
    expect(model.nodes).toHaveLength(13);
    expect(model.sourceLabel).toBe('County__created');
    expect(model.targetLabel).toBe('MD_Crop_Group  text  autorisatie');
    expect(model.valueLabel).toBe('Area Ha');
    expect(model.colors).toHaveLength(7);
  });

  it('keeps source ids distinct from target ids', () => {
    const model = normalizeSankeyData(FUSEDASH_MOCK);
    const sources = new Set(model.links.map((l) => l.source));
    const targets = new Set(model.links.map((l) => l.target));

    for (const id of sources) {
      expect(id.endsWith(' ')).toBe(true);
      expect(targets.has(id)).toBe(false);
    }
    const source = model.nodes.find((n) => sources.has(n.name));
    expect(source?.label).toBe(source?.name.trimEnd());
  });

  it('accepts an explicit xAxe / yAxe / groupBy widget', () => {
    const model = normalizeSankeyData({
      data: [
        { channel: 'Organic', outcome: 'Purchase', sessions: 120 },
        { channel: 'Paid', outcome: 'Bounce', sessions: 80 },
      ],
      xAxe: ['channel'],
      yAxe: ['sessions'],
      groupBy: ['outcome'],
    });

    expect(model.links).toEqual([
      { source: 'Organic ', target: 'Purchase', value: 120 },
      { source: 'Paid ', target: 'Bounce', value: 80 },
    ]);
    expect(model.sourceLabel).toBe('Channel');
    expect(model.targetLabel).toBe('Outcome');
    expect(model.valueLabel).toBe('Sessions');
  });

  it('falls back to the first spare column when no dimension is configured', () => {
    const model = normalizeSankeyData({
      data: [{ from: 'A', to: 'B', amount: 5 }],
      xAxe: 'from',
      yAxe: 'amount',
    });
    expect(model.links).toEqual([{ source: 'A ', target: 'B', value: 5 }]);
    expect(model.targetLabel).toBe('To');
  });

  it('prefers widget custom palette colors', () => {
    const model = normalizeSankeyData({
      ...FUSEDASH_MOCK,
      palette: { customColors: [{ hex: '#111111' }, { hex: '#222222' }] },
    });
    expect(model.colors).toEqual(['#111111', '#222222']);
  });

  it('accepts a bare chat link list', () => {
    const model = normalizeSankeyData([
      { source: 'A', target: 'B', value: 3 },
      { source: 'A', target: 'C', value: 7 },
    ]);
    expect(model.nodes.map((n) => n.name)).toEqual(['A', 'B', 'C']);
    expect(model.links).toHaveLength(2);
  });

  it('accepts { nodes, links } and drops links with unknown endpoints', () => {
    const model = normalizeSankeyData({
      nodes: [
        { name: 'a', label: 'Alpha' },
        { name: 'b', label: 'Beta' },
      ],
      links: [
        { source: 'a', target: 'b', value: 1 },
        { source: 'a', target: 'zz', value: 9 },
      ],
      sourceLabel: 'From',
      targetLabel: 'To',
      valueLabel: 'Flow',
    });
    expect(model.links).toEqual([{ source: 'a', target: 'b', value: 1 }]);
    expect(model.nodes.map((n) => n.label)).toEqual(['Alpha', 'Beta']);
    expect(model.valueLabel).toBe('Flow');
  });

  it('flags circular data instead of throwing in the layout', () => {
    const model = normalizeSankeyData([
      { source: 'A', target: 'B', value: 1 },
      { source: 'B', target: 'A', value: 1 },
    ]);
    expect(model.circular).toBe(true);
    expect(model.links).toEqual([]);
  });

  it('drops rows with a missing dimension or a non-numeric measure', () => {
    const model = normalizeSankeyData({
      data: [
        { from: 'A', to: 'B', amount: 5 },
        { from: '', to: 'B', amount: 5 },
        { from: 'A', to: 'C', amount: 'n/a' },
      ],
      xAxe: 'from',
      yAxe: 'amount',
      groupBy: 'to',
    });
    expect(model.links).toEqual([{ source: 'A ', target: 'B', value: 5 }]);
  });

  it('returns an empty model for nullish / empty input', () => {
    for (const input of [null, undefined, [], { data: [] }, { links: [] }]) {
      const model = normalizeSankeyData(input as never);
      expect(model.nodes).toEqual([]);
      expect(model.links).toEqual([]);
      expect(model.circular).toBe(false);
    }
  });
});

describe('sankey color ranges', () => {
  it('spreads break points across the values', () => {
    expect(generateBreakPoints([1, 2, 3], 3)).toEqual([1, 2, 3]);
    expect(generateBreakPoints([], 3)).toEqual([]);
  });

  it('builds one range per palette color and stretches the last one', () => {
    const ranges = buildColorRanges([10, 20, 30], ['#a', '#b', '#c']);
    expect(ranges).toEqual([
      { color: '#a', start: 10, end: 20 },
      { color: '#b', start: 20, end: 30 },
      { color: '#c', start: 30, end: 90 },
    ]);
  });

  it('picks the bucket a value falls into, else the last one', () => {
    const ranges = buildColorRanges([10, 20, 30], ['#a', '#b', '#c']);
    expect(pickRangeColor(ranges, 15, '#zz')).toBe('#a');
    expect(pickRangeColor(ranges, 1000, '#zz')).toBe('#c');
    expect(pickRangeColor([], 5, '#zz')).toBe('#zz');
  });
});
