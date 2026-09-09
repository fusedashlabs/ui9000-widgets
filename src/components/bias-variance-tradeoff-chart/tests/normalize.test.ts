import { describe, expect, it } from 'vitest';

import {
  biasVarianceXDomain,
  biasVarianceXValues,
  biasVarianceYDomain,
  formatTradeoffValue,
  normalizeBiasVarianceData,
} from '../lib/index.js';
import { formatCapitalizedWords } from '../../../utils/format-text.js';
import metadata from '../metadata.json';

import fixture from '../../../stories/fixtures/bias-variance-tradeoff.fusedash.json';

describe('normalizeBiasVarianceData', () => {
  it('bias-variance-tradeoff.fusedash.json → three curves × twelve steps', () => {
    const model = normalizeBiasVarianceData(fixture as never);
    expect(model.series.map((s) => s.id)).toEqual(['Bias^2', 'Variance', 'Total Error']);
    expect(model.series.every((s) => s.points.length === 12)).toBe(true);
    expect(model.xField).toBe('complexity');
    expect(model.yField).toBe('value');
    expect(model.groupField).toBe('series');
  });

  it('keeps points sorted by x and colors them from the client palette', () => {
    const model = normalizeBiasVarianceData(fixture as never);
    const xs = model.series[0].points.map((p) => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(model.series.map((s) => s.color)).toEqual(['#6366f1', '#22c55e', '#f59e0b']);
  });

  it('honours an explicit formatting block over the client palette', () => {
    const model = normalizeBiasVarianceData({
      ...(fixture as object),
      formatting: [
        { key: 'Bias^2', color: '1' },
        { key: 'Variance', color: '2' },
        { key: 'Total Error', color: '3' },
      ],
    } as never);
    expect(model.series[0].color).toBe('#473DD9');
  });

  it('reads domainsLimits when the widget carries them', () => {
    const model = normalizeBiasVarianceData({
      ...(fixture as object),
      domainsLimits: [
        { values: [0.5, 2.3], color: '#FCA5A5', orientation: 'vertical' },
        { values: ['bad'], orientation: 'vertical' },
      ],
    } as never);
    expect(model.domainsLimits).toEqual([
      { values: [0.5, 2.3], color: '#FCA5A5', orientation: 'vertical' },
    ]);
  });

  it('accepts the chat series shape and label/value rows', () => {
    const fromSeries = normalizeBiasVarianceData({
      series: [{ id: 'bias', points: [{ x: 2, y: 3 }, { x: 1, y: 1 }] }],
    });
    expect(fromSeries.series[0].points.map((p) => p.x)).toEqual([1, 2]);

    const fromLabels = normalizeBiasVarianceData([
      { label: '1', value: 0.2 },
      { label: '2', value: 0.4 },
    ] as never);
    expect(fromLabels.series[0].points).toEqual([
      { x: 1, y: 0.2 },
      { x: 2, y: 0.4 },
    ]);
  });

  it('returns an empty model for invalid payloads', () => {
    expect(normalizeBiasVarianceData(null).series).toEqual([]);
    expect(normalizeBiasVarianceData([]).series).toEqual([]);
    expect(normalizeBiasVarianceData({ nope: true }).series).toEqual([]);
  });
});

describe('domains', () => {
  it('spans the x extent and pads y by 1.1 above the max', () => {
    const model = normalizeBiasVarianceData(fixture as never);
    expect(biasVarianceXDomain(model.series)).toEqual([0, 11]);
    expect(biasVarianceYDomain(model.series)[0]).toBe(0);
    expect(biasVarianceYDomain(model.series)[1]).toBeCloseTo(0.82 * 1.1, 5);
    expect(biasVarianceXValues(model.series).length).toBe(12);
  });

  it('falls back to [0, 1] when there is nothing to plot', () => {
    expect(biasVarianceXDomain([])).toEqual([0, 1]);
    expect(biasVarianceYDomain([])).toEqual([0, 1]);
  });
});

describe('formatting', () => {
  it('mirrors the client legend label helper', () => {
    expect(formatCapitalizedWords('bias_squared')).toBe('Bias Squared');
    expect(formatCapitalizedWords('Bias^2')).toBe('Bias^2');
    expect(formatCapitalizedWords('')).toBe('');
    expect(formatTradeoffValue(0.2)).toBe('0.2');
    expect(formatTradeoffValue(5)).toBe('5');
  });
});

describe('metadata', () => {
  it('declares the chart type key the gateway dispatches on', () => {
    expect(metadata.chartTypeKeys).toEqual(['biasVarianceTradeoffChart']);
    expect(metadata.stack).toBe('d3');
    expect(metadata.usageConditions.notFor).toBe('fusedash-editor');
  });

  it('points at the published entry points', () => {
    expect(metadata.tag).toBe('ui9000-bias-variance-tradeoff-chart');
    expect(metadata.entry).toBe('@fusedashlabs/widgets/bias-variance-tradeoff-chart');
    expect(metadata.lazyImport).toBe('@fusedashlabs/widgets/lazy/bias-variance-tradeoff-chart');
  });
});
