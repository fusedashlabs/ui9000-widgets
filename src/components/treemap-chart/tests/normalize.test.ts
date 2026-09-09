import { describe, expect, it } from 'vitest';

import { normalizeTreemapData } from '../lib/normalize.js';
import { treemapColorForValue, treemapRangeColors, treemapValueRanges } from '../lib/color.js';
import { treemapGridTemplate } from '../lib/layout.js';
import { formatTreemapValue } from '../lib/format.js';
import { formatValueWithUnit } from '../../../utils/axis-units.js';

import treemapFixture from '../../../stories/fixtures/treemap.fusedash.json';

const singleFixture = { ...treemapFixture, subgroup: null };

describe('normalizeTreemapData — FuseDash mock', () => {
  it('treemap.fusedash.json → one card per county, tiles per crop group', () => {
    const model = normalizeTreemapData(treemapFixture as never);
    expect(model.mode).toBe('grouped');
    expect(model.groups.length).toBe(5);
    expect(model.subgroupField).toBe('MD_Crop_Group  text  autorisatie');
    expect(model.categoryField).toBe('County__created');
    expect(model.valueField).toBe('area Ha');
    // Cards sort by label, tiles by value desc within a card.
    expect(model.groups.map((g) => g.label)).toEqual([
      'California, Los Angeles',
      'California, Orange',
      'California, Riverside',
      'California, San Bernardino',
      'California, San Diego',
    ]);
    const la = model.groups[0];
    expect(la.tiles.map((t) => t.label)).toEqual([
      'Open field group',
      'Cucurbit group',
      'Allium group',
      'Other',
      'Tomato group',
    ]);
    expect(la.tiles[0].value).toBeCloseTo(1985138.5, 2);
    expect(la.tiles.every((t) => /^#[0-9a-f]{6}$/i.test(t.color))).toBe(true);
  });

  it('each card ramps its own qualitative color (client getFormattingByGroupName)', () => {
    const model = normalizeTreemapData(treemapFixture as never);
    const riverside = model.groups.find((g) => g.label === 'California, Riverside');
    const la = model.groups.find((g) => g.label === 'California, Los Angeles');
    // formatting maps LA→"1" and Riverside→"2" against the 2-color palette.
    expect(la?.tiles[0].color).not.toBe(riverside?.tiles[0].color);
  });

  it('without a distinct subgroup it falls back to one area-proportional treemap', () => {
    const model = normalizeTreemapData(singleFixture as never);
    expect(model.mode).toBe('single');
    expect(model.groups).toEqual([]);
    expect(model.tiles.length).toBe(5);
    expect(model.rangeColors.length).toBe(7);
    // Rows sharing a county collapse into one tile, values summed, largest first.
    expect(model.tiles[0].label).toBe('California, Los Angeles');
    expect(model.tiles[0].value).toBeCloseTo(1985138.5 + 1112756 + 394406 + 339468.5 + 307959.5, 2);
    for (let i = 1; i < model.tiles.length; i++) {
      expect(model.tiles[i].value).toBeLessThanOrEqual(model.tiles[i - 1].value);
    }
  });

  it('a subgroup equal to the group key does not force the grouped layout (FUS-3868)', () => {
    const model = normalizeTreemapData({
      ...treemapFixture,
      subgroup: 'County__created',
    } as never);
    expect(model.mode).toBe('single');
  });

  it('merges categories case- and whitespace-insensitively (FUS-3836)', () => {
    const model = normalizeTreemapData({
      data: [
        { segment: 'Fresh Market', revenue: 100 },
        { segment: 'Fresh market', revenue: 70 },
        { segment: ' fresh  market ', revenue: 30 },
      ],
      groupBy: ['segment'],
      yAxe: ['revenue'],
    } as never);
    expect(model.tiles).toHaveLength(1);
    expect(model.tiles[0].label).toBe('Fresh Market');
    expect(model.tiles[0].value).toBe(200);
  });
});

describe('normalizeTreemapData — chat payloads', () => {
  it('accepts label/value rows and honors an explicit color', () => {
    const model = normalizeTreemapData([
      { label: 'A', value: 30, color: '#123456' },
      { label: 'B', value: 70 },
    ]);
    expect(model.mode).toBe('single');
    expect(model.tiles.map((t) => t.label)).toEqual(['B', 'A']);
    expect(model.tiles.find((t) => t.label === 'A')?.color).toBe('#123456');
  });

  it('accepts points and series shorthands', () => {
    const points = normalizeTreemapData({
      points: [
        { x: 'A', y: 3 },
        { x: 'B', y: 7 },
      ],
    });
    expect(points.tiles.length).toBe(2);

    const series = normalizeTreemapData({
      series: [
        { id: 'north', points: [{ x: 'A', y: 3 }] },
        { id: 'south', color: '#36C4A5', points: [{ x: 'B', y: 7 }] },
      ],
    });
    expect(series.mode).toBe('grouped');
    expect(series.groups.map((g) => g.label)).toEqual(['north', 'south']);
  });

  it('returns an empty model for invalid payloads instead of throwing', () => {
    for (const input of [null, undefined, [], {}, { points: [] }, 'nope' as never]) {
      const model = normalizeTreemapData(input as never);
      expect(model.tiles).toEqual([]);
      expect(model.groups).toEqual([]);
    }
  });
});

describe('color bands', () => {
  it('ramps seven shades from light to dark around the base color', () => {
    const colors = treemapRangeColors('#473DD9');
    expect(colors).toHaveLength(7);
    expect(colors[0]).not.toBe(colors[6]);
    expect(colors.every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
  });

  it('picks the band holding the value, clamping past the ends', () => {
    const ranges = [0, 10, 20, 30];
    const colors = ['#a', '#b', '#c'];
    expect(treemapColorForValue(5, ranges, colors, '#z')).toBe('#a');
    expect(treemapColorForValue(15, ranges, colors, '#z')).toBe('#b');
    expect(treemapColorForValue(30, ranges, colors, '#z')).toBe('#c');
    expect(treemapColorForValue(999, ranges, colors, '#z')).toBe('#c');
    expect(treemapColorForValue(undefined, ranges, colors, '#z')).toBe('#a');
  });

  it('prefers the widget palette range over derived break points', () => {
    expect(treemapValueRanges([1, 2, 3], [0, 100])).toEqual([0, 100]);
    expect(treemapValueRanges([1, 2, 3], [10])).not.toEqual([10]);
  });
});

describe('grouped grid template', () => {
  it('mirrors the client mosaic for 1–5 cards', () => {
    expect(treemapGridTemplate(1).areas).toBe('"_1"');
    expect(treemapGridTemplate(3).areas).toBe('"_1 _1 _2" "_1 _1 _3"');
    expect(treemapGridTemplate(5).areas).toBe('"_1 _1 _2" "_1 _1 _2" "_3 _4 _5"');
    expect(treemapGridTemplate(1).rows).toBe('repeat(1, 1fr)');
    expect(treemapGridTemplate(3).rows).toBe('repeat(2, 1fr)');
    expect(treemapGridTemplate(5).rows).toBe('repeat(3, 1fr)');
  });

  it('falls back to one scrolling row per card beyond five', () => {
    const template = treemapGridTemplate(7);
    expect(template.areas).toBe('"_1" "_2" "_3" "_4" "_5" "_6" "_7"');
    expect(template.rows).toContain('repeat(7,');
  });
});

describe('value and unit formatting', () => {
  it('uses compact numbers for a single treemap and 2 decimals per card', () => {
    expect(formatTreemapValue(1985138.5, 'single')).toBe('2.0M');
    expect(formatTreemapValue(1985138.5, 'grouped')).toBe('1985138.50');
  });

  it('applies the axis measure unit to the tooltip category', () => {
    expect(formatValueWithUnit('12', { measure_unit_type: 'currency', measure_unit_symbol: '$' })).toBe(
      '$12',
    );
    expect(formatValueWithUnit('Storage', { measure_unit: 'ha' })).toBe('Storage ha');
    expect(formatValueWithUnit('Storage')).toBe('Storage');
  });
});
