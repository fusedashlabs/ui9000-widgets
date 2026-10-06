import { describe, expect, it } from 'vitest';

import figma from '../../../stories/fixtures/component-asset.figma.json';
import { formatAssetMeasure, normalizeComponentAsset } from '../lib/index.js';

describe('normalizeComponentAsset', () => {
  it('reads the Figma sample', () => {
    const model = normalizeComponentAsset(figma);

    expect(model.title).toBe('Sector A1 Antenna');
    expect(model.assetId).toBe('RTX-3090');
    expect(model.image).toEqual({ src: 'images/sector-antenna.png', alt: 'Sector panel antenna' });
    expect(model.metric).toEqual({
      label: 'Packet loss',
      display: '1.02%',
      status: { label: 'Normal', level: 'ok' },
    });
    expect(model.delta).toEqual({ direction: 'up', display: '0.8', label: 'vs 30m ago', tone: 'ok' });
    expect(model.trend?.map((p) => p.level)).toEqual([
      'critical',
      'critical',
      'critical',
      'critical',
      'critical',
      'ok',
      'ok',
      'ok',
      'ok',
    ]);
    expect(model.empty).toBe(false);
  });

  it('keeps the name, id and value without image, delta and trend', () => {
    const model = normalizeComponentAsset({
      name: 'Sector A1 Antenna',
      assetId: 'RTX-3090',
      metric: { label: 'Packet loss', value: 1.02, unit: '%' },
    });
    expect(model).toMatchObject({ title: 'Sector A1 Antenna', assetId: 'RTX-3090', image: null, delta: null, trend: null });
    expect(model.metric?.display).toBe('1.02%');
    expect(model.metric?.status).toBeNull();
  });

  it('shows a status only with a level or thresholds', () => {
    const status = (metric: object) => normalizeComponentAsset({ metric }).metric?.status;
    expect(status({ value: 3 })).toBeNull();
    expect(status({ value: 3, thresholds: {} })).toBeNull();
    expect(status({ value: 3, level: 'neutral' })).toBeNull();
    expect(status({ value: 3, level: 'warning' })).toEqual({ label: 'Warning', level: 'warning' });
    expect(status({ value: 3, thresholds: { warning: 2, critical: 5 } })?.level).toBe('warning');
    expect(status({ value: 48, thresholds: { warning: 51, critical: 49, direction: 'below' } })?.level).toBe(
      'critical',
    );
    expect(status({ value: 'Offline', thresholds: { warning: 2 } })).toBeNull();
  });

  it('draws a trend only from two or more readings', () => {
    const trend = (input: unknown) => normalizeComponentAsset({ metric: { value: 1 }, trend: input }).trend;
    expect(trend(null)).toBeNull();
    expect(trend({ points: [1] })).toBeNull();
    expect(trend(['x', 1])).toBeNull();
    expect(trend([1, '2', { y: 3 }, { value: 4, level: 'critical' }])).toEqual([
      { value: 1, level: 'neutral' },
      { value: 2, level: 'neutral' },
      { value: 3, level: 'neutral' },
      { value: 4, level: 'critical' },
    ]);
  });

  it('points the delta arrow by sign and colours it by `better`', () => {
    const delta = (input: unknown) => normalizeComponentAsset({ metric: { value: 1 }, delta: input }).delta;
    expect(delta(-0.4)).toMatchObject({ direction: 'down', display: '0.4', tone: 'critical' });
    expect(delta({ value: -0.4, unit: '%', better: 'down' })).toMatchObject({ display: '0.4%', tone: 'ok' });
    expect(delta({ value: 0.8, better: 'down' })?.tone).toBe('critical');
    expect(delta(0)).toMatchObject({ direction: 'flat', tone: 'neutral' });
    expect(delta({ value: '+2 pts', direction: 'up' })).toMatchObject({ display: '+2 pts', direction: 'up' });
    expect(delta({ label: 'vs 30m ago' })).toBeNull();
  });

  it('accepts only safe image sources', () => {
    const image = (input: unknown) => normalizeComponentAsset({ name: 'A', image: input }).image?.src ?? null;
    expect(image('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(image('/assets/a.png')).toBe('/assets/a.png');
    expect(image('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(image({ url: 'a.svg' })).toBe('a.svg');
    expect(image('javascript:alert(1)')).toBeNull();
    expect(image('data:text/html,<b>')).toBeNull();
    expect(image(null)).toBeNull();
  });

  it('ignores delta and trend without a metric, and survives junk', () => {
    const model = normalizeComponentAsset({ name: 'A', delta: 1, trend: [1, 2] });
    expect(model.delta).toBeNull();
    expect(model.trend).toBeNull();
    expect(model.empty).toBe(false);
    for (const junk of [null, undefined, 3, 'text', [], { metric: 'nope' }, { metric: { label: 'x' } }]) {
      expect(normalizeComponentAsset(junk).empty).toBe(true);
    }
  });
});

describe('formatAssetMeasure', () => {
  it('spaces units except % and degrees', () => {
    expect(formatAssetMeasure(1.02, '%')).toBe('1.02%');
    expect(formatAssetMeasure(50.4, 'V')).toBe('50.4 V');
    expect(formatAssetMeasure(63, '°C')).toBe('63°C');
    expect(formatAssetMeasure(1.23456, '')).toBe('1.23');
  });
});
