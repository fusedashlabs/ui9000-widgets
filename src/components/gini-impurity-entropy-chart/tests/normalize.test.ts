import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/gini-impurity-entropy.fusedash.json';
import {
  normalizeGiniImpurityEntropyData,
  resolveOverlays,
  splitAnnotation,
  type GiniImpurityEntropyFusePayload,
} from '../lib/index.js';

const FUSEDASH_MOCK =
  fusedashFixture as unknown as GiniImpurityEntropyFusePayload;

describe('normalizeGiniImpurityEntropyData', () => {
  it('accepts the FuseDash DEFAULT_GINI_IMPUITY_ENTROPY mock', () => {
    const model = normalizeGiniImpurityEntropyData(FUSEDASH_MOCK);

    expect(model.series.map((s) => s.id)).toEqual(['entropy', 'gini', 'mis']);
    expect(model.series.map((s) => s.name)).toEqual([
      'Entropy',
      'Gini Impurity',
      'Misclassification Error',
    ]);
    expect(model.series.every((s) => s.points.length === 101)).toBe(true);
    expect(model.xLabel).toBe('P');
    expect(model.yLabel).toBe('Impurity Index');
  });

  it('uses the client DEFAULT_SERIES_STYLE colours and dashes', () => {
    const model = normalizeGiniImpurityEntropyData(FUSEDASH_MOCK);

    expect(model.series.map((s) => s.color)).toEqual([
      '#36C4A5',
      '#473DD9',
      '#56546D',
    ]);
    expect(model.series.map((s) => s.dash)).toEqual([
      undefined,
      '5,5',
      '5,5',
    ]);
  });

  it('sorts each curve ascending by p', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      data: [
        { p: 0.5, entropy: 1, gini: 0.5, mis: 0.5 },
        { p: 0, entropy: 0, gini: 0, mis: 0 },
        { p: 1, entropy: 0, gini: 0, mis: 0 },
      ],
    });

    expect(model.series[0].points.map((d) => d.p)).toEqual([0, 0.5, 1]);
  });

  it('falls back to entropy/gini/mis when yAxe is the editor placeholder', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      yAxe: ['value'],
    });

    expect(model.series.map((s) => s.id)).toEqual(['entropy', 'gini', 'mis']);
  });

  it('honours a yAxe that names its own metric columns', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      yAxe: ['gini'],
    });

    expect(model.series.map((s) => s.id)).toEqual(['gini']);
  });

  it('colours an unknown metric from the widget palette', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      yAxe: ['custom'],
      data: [
        { p: 0, custom: 0 },
        { p: 1, custom: 1 },
      ],
      formatting: [{ key: 'custom', color: '2' }],
    });

    expect(model.series[0].color).toBe('#36C4A5');
    expect(model.series[0].name).toBe('custom');
  });

  it('drops metric columns with no finite rows', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      // `mis` is unparseable and `entropy` is absent, so only `gini` survives.
      data: [{ p: 0.25, gini: 0.375, mis: 'n/a' }],
    });

    expect(model.series.map((s) => s.id)).toEqual(['gini']);
  });

  it('coerces a null metric to 0, like the client Number() cast', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      yAxe: ['entropy'],
      data: [
        { p: 0, entropy: null },
        { p: 1, entropy: 0.5 },
      ],
    });

    expect(model.series[0].points).toEqual([
      { p: 0, value: 0 },
      { p: 1, value: 0.5 },
    ]);
  });

  it('reads the x field from xAxe', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      xAxe: ['threshold'],
      axisDetails: { threshold: { label: 'Threshold' } },
      data: [
        { threshold: 0.2, gini: 0.32 },
        { threshold: 0.8, gini: 0.32 },
      ],
      yAxe: ['gini'],
    });

    expect(model.xLabel).toBe('Threshold');
    expect(model.series[0].points).toEqual([
      { p: 0.2, value: 0.32 },
      { p: 0.8, value: 0.32 },
    ]);
  });

  it('accepts the chat series shape', () => {
    const model = normalizeGiniImpurityEntropyData({
      series: [
        {
          id: 'gini',
          points: [
            { x: 1, y: 0 },
            { x: 0, y: 0 },
            { x: 0.5, y: 0.5 },
          ],
        },
      ],
      xLabel: 'p',
    });

    expect(model.series[0].name).toBe('Gini Impurity');
    expect(model.series[0].color).toBe('#473DD9');
    expect(model.series[0].points.map((d) => d.p)).toEqual([0, 0.5, 1]);
    expect(model.xLabel).toBe('p');
  });

  it('accepts the chat points and label/value shapes', () => {
    const fromPoints = normalizeGiniImpurityEntropyData({
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
      ],
    });
    const fromPairs = normalizeGiniImpurityEntropyData([
      { label: '0', value: 0 },
      { label: '0.5', value: 0.5 },
    ]);

    expect(fromPoints.series).toHaveLength(1);
    expect(fromPairs.series[0].points).toEqual([
      { p: 0, value: 0 },
      { p: 0.5, value: 0.5 },
    ]);
    expect(fromPairs.yLabel).toBe('Impurity Index');
  });

  it('returns an empty model for junk payloads instead of throwing', () => {
    for (const input of [null, undefined, [], {}, { series: [] }]) {
      const model = normalizeGiniImpurityEntropyData(input as never);
      expect(model.series).toEqual([]);
      expect(model.overlays.showPHat).toBe(false);
    }
  });
});

describe('overlays', () => {
  it('keeps every annotation off unless meta or a host flag asks', () => {
    const model = normalizeGiniImpurityEntropyData(FUSEDASH_MOCK);

    expect(model.overlays).toMatchObject({
      showPHat: false,
      showCI: false,
      showSplit: false,
    });
  });

  it('reads meta and clamps probabilities into [0, 1]', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      meta: {
        pHat: 1.4,
        ci: [0.7, -0.2],
        split: { pLeft: 0.2, pRight: 2, nLeft: 10, nRight: 30 },
        showPHat: true,
      },
    });

    expect(model.overlays.pHat).toBe(1);
    expect(model.overlays.ci).toEqual([0, 0.7]);
    expect(model.overlays.split).toEqual({
      pLeft: 0.2,
      pRight: 1,
      nLeft: 10,
      nRight: 30,
    });
    expect(model.overlays.showPHat).toBe(true);
  });

  it('lets a host flag override meta', () => {
    expect(
      resolveOverlays({ showCI: false }, { showCI: true }).showCI,
    ).toBe(true);
    expect(resolveOverlays({ showCI: true }, {}).showCI).toBe(true);
    expect(resolveOverlays(null, {}).showCI).toBe(false);
  });

  it('ignores a malformed split', () => {
    expect(resolveOverlays({ split: { pLeft: 0.2 } as never }).split).toBeUndefined();
  });

  it('computes the split annotation like the client', () => {
    const overlays = resolveOverlays(
      {
        pHat: 0.5,
        split: { pLeft: 0, nLeft: 50, pRight: 1, nRight: 50 },
      },
      { showSplit: true },
    );
    const split = splitAnnotation(overlays);

    // A perfect split drops the parent Gini (0.5) all the way to 0.
    expect(split).not.toBeNull();
    expect(split?.leftValue).toBe(0);
    expect(split?.rightValue).toBe(0);
    expect(split?.delta).toBeCloseTo(0.5, 10);
  });

  it('weights the children by their sample counts', () => {
    const split = splitAnnotation(
      resolveOverlays(
        {
          pHat: 0.5,
          split: { pLeft: 0.5, nLeft: 90, pRight: 0, nRight: 10 },
        },
        { showSplit: true },
      ),
    );

    // 0.5 − (0.9 × 0.5 + 0.1 × 0)
    expect(split?.delta).toBeCloseTo(0.05, 10);
  });

  it('returns no annotation when the split is off or missing', () => {
    expect(splitAnnotation(resolveOverlays(null, { showSplit: true }))).toBeNull();
    expect(
      splitAnnotation(
        resolveOverlays({ split: { pLeft: 0.1, pRight: 0.9 } }, {}),
      ),
    ).toBeNull();
  });
});
