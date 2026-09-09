import { describe, expect, it } from 'vitest';

import radialBarFixture from '../../../stories/fixtures/radial-bar.fusedash.json';
import { FD } from '../../../utils/fusedash-visual.js';
import {
  RADIAL_BAR_SWEEP,
  normalizeRadialBarData,
  radialBarAngleScale,
  radialBarArcWidth,
  radialBarLabelLimit,
  radialBarOuterRadius,
  radialBarTickAnchor,
} from '../lib/index.js';

const UNIQUE_VALUES = radialBarFixture.uniqueValues.weather_main;

describe('normalizeRadialBarData', () => {
  it('radial-bar.fusedash.json → one ring per category, innermost last', () => {
    const model = normalizeRadialBarData(radialBarFixture as never);
    expect(model.legend.map((bar) => bar.key)).toEqual(UNIQUE_VALUES);
    expect(model.bars.map((bar) => bar.key)).toEqual([...UNIQUE_VALUES].reverse());
    expect(model.xField).toBe('weather_main');
    expect(model.yField).toBe('totalBalance');
    expect(model.bars[0].value).toBeCloseTo(24219.09, 2);
  });

  it('applies Qualitative12 formatting colors in uniqueValues order', () => {
    const model = normalizeRadialBarData(radialBarFixture as never);
    expect(model.legend[0].color).toBe('#473DD9');
    expect(model.legend[1].color).toBe('#938CFF');
    expect(new Set(model.legend.map((bar) => bar.color)).size).toBe(8);
  });

  it('accepts label/value rows and honours explicit colors', () => {
    const model = normalizeRadialBarData([
      { label: 'A', value: 30 },
      { label: 'B', value: 70, color: '#123456' },
    ]);
    expect(model.legend.map((bar) => bar.label)).toEqual(['A', 'B']);
    expect(model.bars.map((bar) => bar.label)).toEqual(['B', 'A']);
    expect(model.legend[0].color).toBe('#473DD9');
    expect(model.legend[1].color).toBe('#123456');
  });

  it('accepts a chat points payload', () => {
    const model = normalizeRadialBarData({
      points: [
        { x: 'Mon', y: 4 },
        { x: 'Tue', y: 8 },
      ],
    });
    expect(model.legend.map((bar) => bar.label)).toEqual(['Mon', 'Tue']);
    // No formatting in a chat payload → generated 1-based color indices.
    expect(model.legend.map((bar) => bar.color)).toEqual(['#473DD9', '#36C4A5']);
  });

  it('drops rows with a blank category or a non-numeric value', () => {
    const model = normalizeRadialBarData([
      { label: '', value: 10 },
      { label: 'A', value: Number.NaN },
      { label: 'B', value: 5 },
    ] as never);
    expect(model.bars.map((bar) => bar.label)).toEqual(['B']);
  });

  it('returns empty for invalid payloads', () => {
    expect(normalizeRadialBarData(null).bars).toEqual([]);
    expect(normalizeRadialBarData([]).bars).toEqual([]);
    expect(normalizeRadialBarData({ data: [] } as never).bars).toEqual([]);
  });
});

describe('radial bar geometry', () => {
  it('maps the value domain onto a 270° sweep pinned at zero', () => {
    const scale = radialBarAngleScale([10, 40, 90]);
    expect(scale.domain()[0]).toBe(0);
    expect(scale(scale.domain()[1])).toBeCloseTo(RADIAL_BAR_SWEEP, 10);
    expect(scale(0)).toBe(0);
  });

  it('keeps a negative minimum so the rings can run backwards from zero', () => {
    const scale = radialBarAngleScale([-40, 60]);
    expect(scale.domain()[0]).toBeLessThan(0);
    expect(scale(0)).toBeGreaterThan(0);
  });

  it('clamps ring thickness to 4–24px', () => {
    expect(radialBarArcWidth(20, 100, 40)).toBe(4);
    expect(radialBarArcWidth(20, 400, 2)).toBe(24);
    expect(radialBarArcWidth(20, 100, 4)).toBeCloseTo(9.5, 5);
  });

  it('cuts ring labels at one character per 8px of ring depth', () => {
    expect(radialBarLabelLimit(20, 100)).toBe(10);
  });
});

describe('radialBarOuterRadius', () => {
  const MARGIN = { ...FD.radialBarMargin };
  const inscribed = (w: number, h: number) =>
    Math.min(w - MARGIN.left - MARGIN.right, h - MARGIN.top - MARGIN.bottom) / 2;

  it.each([
    ['landscape', 520, 420],
    ['wide', 800, 420],
    ['4:3', 640, 520],
    ['small landscape', 380, 340],
    ['square', 420, 420],
    ['portrait', 360, 600],
  ])('matches the client inscribed circle in a %s frame', (_name, width, height) => {
    expect(radialBarOuterRadius(width, height, MARGIN)).toBe(inscribed(width, height));
  });

  it('never returns a negative radius in a frame with no room', () => {
    expect(radialBarOuterRadius(20, 20, MARGIN)).toBe(0);
  });

  /**
   * Accepted parity trade: FuseDash clips its own right-hand value label in a
   * square body, and so do we. The ring must not shrink to rescue the label.
   */
  it('lets the right-hand value label overflow a square frame, as the client does', () => {
    const width = 420;
    const height = 420;
    const radius = radialBarOuterRadius(width, height, MARGIN);
    const scale = radialBarAngleScale([0, 27613.5]);
    const overflow = scale.ticks(FD.radialBarTicks).some((value) => {
      const angle = scale(value) - Math.PI / 2;
      const rim = radius + FD.radialBarTickLabelOffset;
      const x = width / 2 + rim * Math.cos(angle);
      const text = `${(value / 1000).toFixed(1)}K`;
      const textWidth = text.length * FD.radialBarTickLabelSize * 0.6;
      return radialBarTickAnchor(angle) === 'start' && x + textWidth > width;
    });
    expect(overflow).toBe(true);
  });
});

describe('radialBarTickAnchor', () => {
  it('centres the labels above and below the hole and flanks the rest', () => {
    expect(radialBarTickAnchor(-Math.PI / 2)).toBe('middle');
    expect(radialBarTickAnchor(Math.PI / 2)).toBe('middle');
    expect(radialBarTickAnchor(0)).toBe('start');
    expect(radialBarTickAnchor(Math.PI)).toBe('end');
  });
});
