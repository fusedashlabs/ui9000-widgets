import { describe, expect, it } from 'vitest';

import polarAreaFixture from '../../../stories/fixtures/polar-area.fusedash.json';
import {
  polarGroupedSectorAngles,
  polarLabelAnchor,
  polarLabelGutter,
  polarOuterRadius,
  polarRadialTicks,
  polarSectorAngles,
} from '../lib/domain.js';
import { normalizePolarAreaData } from '../lib/normalize.js';

/** Client PolarAreaChart drops `groupBy` and aggregates — one wedge per category. */
const singleFixture = { ...polarAreaFixture, groupBy: [] };

describe('normalizePolarAreaData', () => {
  it('without groupBy → one aggregated wedge per category', () => {
    const model = normalizePolarAreaData(singleFixture as never);
    const categories = polarAreaFixture.uniqueValues['MD_Crop_Group  text  autorisatie'];

    expect(model.grouped).toBeFalsy();
    expect(model.categories).toEqual(categories);
    expect(model.sectors.map((sector) => sector.key)).toEqual(categories);
    expect(model.maxValue).toBeCloseTo(3657632, 0);
    expect(model.xField).toBe('MD_Crop_Group  text  autorisatie');
    expect(model.yField).toBe('area Ha');
  });

  it('sums the grouped rows per category and colors from formatting', () => {
    const model = normalizePolarAreaData(singleFixture as never);
    const openField = model.sectors.find((s) => s.key === 'Open field group');

    // 3598399.5 (Open Field) + 50486 (Green House) + 8746.5 (Other)
    expect(openField?.value).toBeCloseTo(3657632, 0);
    expect(openField?.color).toBe('#473DD9');
    expect(model.legend.map((entry) => entry.key)).toEqual(model.categories);
  });

  it('with groupBy → one wedge per category × group, legend is the groups', () => {
    const model = normalizePolarAreaData(polarAreaFixture as never);
    const groups = polarAreaFixture.uniqueValues.MD_Organic_non_organic;

    expect(model.grouped).toBe(true);
    expect(model.groupField).toBe('MD_Organic_non_organic');
    expect(model.legend.map((entry) => entry.key)).toEqual(groups);
    expect(model.sectors).toHaveLength(21);
    expect(model.sectors.filter((s) => s.key === 'Open field group')).toHaveLength(3);
    expect(model.sectors.find((s) => s.key === 'Open field group' && s.group === 'Open Field')?.value).toBe(
      3598399.5,
    );
    expect(new Set(model.legend.map((entry) => entry.color)).size).toBe(groups.length);
  });

  it('accepts simple label/value rows with distinct palette colors', () => {
    const model = normalizePolarAreaData([
      { label: 'A', value: 30 },
      { label: 'B', value: 70 },
    ]);
    expect(model.sectors.map((s) => s.value)).toEqual([30, 70]);
    expect(model.sectors[0].color).not.toBe(model.sectors[1].color);
    expect(model.maxValue).toBe(70);
  });

  it('accepts a chat points payload', () => {
    const model = normalizePolarAreaData({
      points: [
        { x: 'Mon', y: 4 },
        { x: 'Tue', y: 9 },
      ],
    });
    expect(model.categories).toEqual(['Mon', 'Tue']);
    expect(model.maxValue).toBe(9);
  });

  it('colors a widget that ships without formatting from the default palette', () => {
    const model = normalizePolarAreaData({
      chartType: 'polarAreaChart',
      xAxe: 'crop',
      yAxe: 'area',
      uniqueValues: { crop: ['A', 'B', 'C'] },
      data: [
        { crop: 'A', area: 10 },
        { crop: 'A', area: 5 },
        { crop: 'B', area: 20 },
        { crop: 'C', area: 30 },
      ],
    } as never);

    // No `formatting` on the widget, so the client keeps a wedge per row.
    expect(model.sectors.map((sector) => sector.key)).toEqual(['A', 'A', 'B', 'C']);
    // Resolved formatting gives each category its own palette slot instead of
    // collapsing everything onto the `default` color.
    const colors = model.legend.map((entry) => entry.color);
    expect(new Set(colors).size).toBe(3);
  });

  it('returns empty for invalid payloads', () => {
    expect(normalizePolarAreaData(null).sectors).toEqual([]);
    expect(normalizePolarAreaData([]).sectors).toEqual([]);
    expect(normalizePolarAreaData({ data: [] } as never).sectors).toEqual([]);
  });
});

describe('polar-area geometry', () => {
  it('splits the disc into equal wedges starting at 12 o’clock', () => {
    const angles = polarSectorAngles(4);
    expect(angles).toHaveLength(4);
    expect(angles[0].startAngle).toBe(0);
    expect(angles[3].endAngle).toBeCloseTo(Math.PI * 2, 10);
    expect(polarSectorAngles(0)).toEqual([]);
  });

  it('splits each category slice among its groups', () => {
    const categories = ['A', 'B'];
    const sectors = [
      { key: 'A', group: 'g1', label: 'A', value: 1, color: '#111' },
      { key: 'A', group: 'g2', label: 'A', value: 2, color: '#222' },
      { key: 'B', group: 'g1', label: 'B', value: 3, color: '#111' },
    ];
    const angles = polarGroupedSectorAngles(categories, sectors);
    expect(angles).toHaveLength(3);
    expect(angles[0].startAngle).toBe(0);
    expect(angles[0].endAngle).toBeCloseTo(Math.PI / 2, 10);
    expect(angles[1].endAngle).toBeCloseTo(Math.PI, 10);
    expect(angles[2].startAngle).toBeCloseTo(Math.PI, 10);
    expect(angles[2].endAngle).toBeCloseTo(Math.PI * 2, 10);
  });

  it('spaces radial ticks evenly up to the max value', () => {
    expect(polarRadialTicks(100, 5)).toEqual([20, 40, 60, 80, 100]);
    expect(polarRadialTicks(0, 5)).toEqual([]);
  });

  it('anchors labels by half of the disc', () => {
    expect(polarLabelAnchor(-Math.PI / 2)).toBe('middle');
    expect(polarLabelAnchor(0)).toBe('start');
    expect(polarLabelAnchor(Math.PI)).toBe('end');
  });

  it('reserves a label gutter from the longest category, within bounds', () => {
    expect(polarLabelGutter(['Q1', 'Q2'], 600)).toBe(40);
    expect(polarLabelGutter(['Cucumber group'], 600)).toBeCloseTo(92.4, 1);
    // A very long name is capped by the plot-width fraction, not the estimate.
    expect(polarLabelGutter(['x'.repeat(80)], 400)).toBeCloseTo(112, 1);
  });

  it('shrinks the disc into whatever the gutter leaves', () => {
    expect(polarOuterRadius(600, 500, 100)).toBe(188);
    // Height-bound when the box is wide and short.
    expect(polarOuterRadius(900, 200, 40)).toBe(82);
    expect(polarOuterRadius(60, 60, 40)).toBe(0);
  });
});
