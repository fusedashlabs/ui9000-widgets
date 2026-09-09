import { describe, expect, it } from 'vitest';

import { normalizeScatterSparklineData } from '../lib/normalize.js';
import scatterSparklineFixture from '../../../stories/fixtures/scatter-sparkline.fusedash.json';

describe('normalizeScatterSparklineData', () => {
  it('scatter-sparkline.fusedash.json → aggregated line + raw scatter points', () => {
    const model = normalizeScatterSparklineData(scatterSparklineFixture as never);
    expect(model.series.length).toBe(1);
    expect(model.series[0].points.length).toBe(14);
    expect(model.scatterPoints.length).toBe(scatterSparklineFixture.data.length);
    expect(model.lineLegendLabel).toBe('Date');
    expect(model.pointLegendLabel).toBe('Average Price');
    expect(model.pointLegendColor).toBe('#22c55e');
  });

  it('returns empty model for nullish input', () => {
    const model = normalizeScatterSparklineData(null);
    expect(model.series).toEqual([]);
    expect(model.scatterPoints).toEqual([]);
  });
});
