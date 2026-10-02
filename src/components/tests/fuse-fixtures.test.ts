import { describe, expect, it } from 'vitest';

import { normalizeLineData } from '../line-chart/lib/normalize.js';
import { normalizeAreaData } from '../area-chart/lib/normalize.js';
import { normalizeLollipopData } from '../lollipop/lib/normalize.js';
import { normalizeStepLineData } from '../step-line-chart/lib/normalize.js';
import { normalizeSparkLineData } from '../spark-line-chart/lib/normalize.js';
import { normalizeScatterSparklineData } from '../scatter-sparkline-chart/lib/normalize.js';
import { canRenderChartType } from '../chart-renderer/lib/registry.js';
import { normalizeHistogramData } from '../histogram-chart/lib/normalize.js';
import { normalizePunchcardData } from '../punchcard-chart/lib/normalize.js';
import { normalizeMatrixData } from '../matrix-chart/lib/normalize.js';
import { normalizeBoxPlotData } from '../box-plot-chart/lib/normalize.js';
import { normalizeParallelCoordinatesData } from '../parallel-coordinates-chart/lib/normalize.js';
import { normalizeViolinData } from '../violin-chart/lib/normalize.js';
import { normalizeWaterfallData } from '../waterfall-chart/lib/normalize.js';
import { normalizePieData } from '../pie-chart/lib/normalize.js';
import { normalizeDonutData } from '../donut-chart/lib/index.js';
import { normalizePolarAreaData } from '../polar-area-chart/lib/normalize.js';
import { normalizeScatterData } from '../scatter-plot-chart/lib/normalize.js';
import { normalizeBiasVarianceData } from '../bias-variance-tradeoff-chart/lib/normalize.js';
import { normalizeBubbleData } from '../bubble-chart/lib/normalize.js';
import { normalizeRadarData } from '../radar-chart/lib/normalize.js';
import { normalizeAreaGroupedBarData } from '../area-grouped-bar-chart/lib/normalize.js';
import { normalizeRadialBarData } from '../radial-bar-chart/lib/normalize.js';
import { normalizeNetworkGraphData } from '../network-graph/lib/normalize.js';
import { normalizeTreemapData } from '../treemap-chart/lib/normalize.js';
import { normalizePartialDependenceData } from '../partial-dependence-chart/lib/normalize.js';
import { normalizeKpiData } from '../kpi-widget/lib/normalize.js';
import { normalizeGiniImpurityEntropyData } from '../gini-impurity-entropy-chart/lib/normalize.js';
import { normalizeMapData } from '../map-chart/lib/normalize.js';

import lineFixture from '../../stories/fixtures/line.fusedash.json';
import areaFixture from '../../stories/fixtures/area.fusedash.json';
import lineGroupedFixture from '../../stories/fixtures/line-grouped.fusedash.json';
import lollipopFixture from '../../stories/fixtures/lollipop.fusedash.json';
import lollipopGroupedFixture from '../../stories/fixtures/lollipop-grouped.fusedash.json';
import stepFixture from '../../stories/fixtures/step-line.fusedash.json';
import stepRocFixture from '../../stories/fixtures/step-line-roc.fusedash.json';
import sparkFixture from '../../stories/fixtures/spark-line.fusedash.json';
import sparkAreaFixture from '../../stories/fixtures/spark-area.fusedash.json';
import scatterSparklineFixture from '../../stories/fixtures/scatter-sparkline.fusedash.json';
import barFixture from '../../stories/fixtures/bar.fusedash.json';
import barGroupedFixture from '../../stories/fixtures/bar-grouped.fusedash.json';
import histogramFixture from '../../stories/fixtures/histogram.fusedash.json';
import histogramSingleFixture from '../../stories/fixtures/histogram-single.fusedash.json';
import histogramSatisfactionFixture from '../../stories/fixtures/histogram-satisfaction.fusedash.json';
import punchcardFixture from '../../stories/fixtures/punchcard.fusedash.json';
import matrixFixture from '../../stories/fixtures/matrix.fusedash.json';
import boxplotFixture from '../../stories/fixtures/boxplot.fusedash.json';
import boxplotSingleFixture from '../../stories/fixtures/boxplot-single.fusedash.json';
import parallelFixture from '../../stories/fixtures/parallel-coordinates.fusedash.json';
import violinFixture from '../../stories/fixtures/violin.fusedash.json';
import waterfallFixture from '../../stories/fixtures/waterfall.fusedash.json';
import pieFixture from '../../stories/fixtures/pie.fusedash.json';
import donutFixture from '../../stories/fixtures/donut.fusedash.json';
import polarAreaFixture from '../../stories/fixtures/polar-area.fusedash.json';
import scatterFixture from '../../stories/fixtures/scatter.fusedash.json';
import biasVarianceFixture from '../../stories/fixtures/bias-variance-tradeoff.fusedash.json';
import biasVarianceLimitsFixture from '../../stories/fixtures/bias-variance-tradeoff-limits.fusedash.json';
import bubbleFixture from '../../stories/fixtures/bubble.fusedash.json';
import bubbleGroupedFixture from '../../stories/fixtures/bubble-grouped.fusedash.json';
import radarFixture from '../../stories/fixtures/radar.fusedash.json';
import radarGroupedFixture from '../../stories/fixtures/radar-grouped.fusedash.json';
import areaGroupedBarFixture from '../../stories/fixtures/area-grouped-bar.fusedash.json';
import radialBarFixture from '../../stories/fixtures/radial-bar.fusedash.json';
import networkGraphFixture from '../../stories/fixtures/network-graph.fusedash.json';
import treemapFixture from '../../stories/fixtures/treemap.fusedash.json';
import pdpFixture from '../../stories/fixtures/partial-dependence.fusedash.json';
import kpisFixture from '../../stories/fixtures/kpis.fusedash.json';
import kpiHighLowFixture from '../../stories/fixtures/kpi-high-low.fusedash.json';
import giniFixture from '../../stories/fixtures/gini-impurity-entropy.fusedash.json';
import mapFixture from '../../stories/fixtures/map.fusedash.json';

describe('FuseDash client fixtures (apps/charts constants)', () => {
  it('line.fusedash.json → Single non-empty series', () => {
    const series = normalizeLineData(lineFixture as never);
    expect(series.length).toBe(1);
    expect(series[0].points.length).toBeGreaterThan(0);
    expect(series[0].color).toBe('#473DD9');
  });

  it('area.fusedash.json → five grouped series', () => {
    const model = normalizeAreaData(areaFixture as never);
    expect(model.series.length).toBe(5);
    expect(model.series[0].points.length).toBe(8);
  });

  it('line-grouped.fusedash.json → Grouped series with Q12 colors', () => {
    const series = normalizeLineData(lineGroupedFixture as never);
    expect(series.length).toBeGreaterThan(1);
    expect(series[0].color).toBeTruthy();
    expect(series.every((s) => s.points.length > 0)).toBe(true);
    const expectedGroups =
      lineGroupedFixture.uniqueValues['MD_Crop_Group  text  autorisatie'];
    expect(series.map((s) => s.id)).toEqual(expectedGroups);
  });

  it('lollipop.fusedash.json → one series (no groupBy)', () => {
    const series = normalizeLollipopData(lollipopFixture as never);
    expect(series.length).toBe(1);
    expect(series[0].points.length).toBeGreaterThan(0);
  });

  it('lollipop-grouped.fusedash.json → market-segment groups', () => {
    const series = normalizeLollipopData(lollipopGroupedFixture as never);
    expect(series.map((s) => s.id)).toEqual(
      lollipopGroupedFixture.uniqueValues.MD_Market_segment,
    );
    expect(series[0].points.length).toBe(8);
  });

  it('step-line.fusedash.json → KS single series', () => {
    const series = normalizeStepLineData(stepFixture as never);
    expect(series.length).toBe(1);
    expect(series[0].points.length).toBe(24);
  });

  it('step-line-roc.fusedash.json → three ROC series', () => {
    const series = normalizeStepLineData(stepRocFixture as never);
    expect(series.length).toBe(3);
    expect(series.every((s) => s.points.length === 24)).toBe(true);
  });

  it('spark-line.fusedash.json → five weather series', () => {
    const series = normalizeSparkLineData(sparkFixture as never);
    expect(series.length).toBe(5);
    expect(series.every((s) => s.points.length === 7)).toBe(true);
    expect(series.map((s) => s.id)).toEqual(
      sparkFixture.uniqueValues.weather_main,
    );
    expect(series[0].color).toBe('#473DD9');
  });

  it('spark-area.fusedash.json → five weather series', () => {
    const series = normalizeSparkLineData(sparkAreaFixture as never);
    expect(series.length).toBe(5);
    expect(series.every((s) => s.points.length === 7)).toBe(true);
    expect(series.map((s) => s.id)).toEqual(
      sparkAreaFixture.uniqueValues.weather_main,
    );
    expect(series[0].color).toBe('#473DD9');
  });

  it('scatter-sparkline.fusedash.json → aggregated line + scatter points', () => {
    const model = normalizeScatterSparklineData(scatterSparklineFixture as never);
    expect(model.series.length).toBe(1);
    expect(model.series[0].points.length).toBe(14);
    expect(model.scatterPoints.length).toBe(scatterSparklineFixture.data.length);
  });

  it('histogram.fusedash.json → stacked bins by weather-main', () => {
    const model = normalizeHistogramData(histogramFixture as never);
    expect(model.bins.length).toBeGreaterThan(0);
    expect(model.groups).toEqual(histogramFixture.uniqueValues['weather-main']);
    expect(model.bins.some((b) => b.stacks.length > 1)).toBe(true);
  });

  it('histogram-single.fusedash.json → one series, no groupBy', () => {
    const model = normalizeHistogramData(histogramSingleFixture as never);
    expect(model.bins.length).toBe(13);
    expect(model.groups).toEqual(['default']);
    expect(model.bins.every((b) => b.stacks.length === 1)).toBe(true);
    expect(model.xMin).toBe(81);
    expect(model.xMax).toBe(199);
  });

  it('histogram-satisfaction.fusedash.json → satisfaction groups', () => {
    const model = normalizeHistogramData(histogramSatisfactionFixture as never);
    expect(model.bins.length).toBe(3);
    expect(model.groups).toEqual(
      histogramSatisfactionFixture.uniqueValues.Satisfaction,
    );
  });

  it('punchcard.fusedash.json → cells (weekday × hour grid)', () => {
    const model = normalizePunchcardData(punchcardFixture as never);
    expect(model.cells.length).toBe(84);
    expect(model.xDomain.length).toBe(12);
    expect(model.yDomain.length).toBe(7);
  });

  it('matrix.fusedash.json → sparse cells on a 94x50 domain', () => {
    const model = normalizeMatrixData(matrixFixture as never);
    expect(model.xDomain.length).toBe(94);
    expect(model.yDomain.length).toBe(50);
    expect(model.cells.length).toBe(matrixFixture.data.length);
    expect(model.cells.length).toBeLessThan(94 * 50);
  });

  it('boxplot.fusedash.json → grouped boxes', () => {
    const model = normalizeBoxPlotData(boxplotFixture as never);
    expect(model.boxes.length).toBeGreaterThan(0);
    expect(model.groups.length).toBeGreaterThan(1);
    expect(model.orientation).toBe('horizontal');
  });

  it('boxplot-single.fusedash.json → one series, seven weekdays', () => {
    const model = normalizeBoxPlotData(boxplotSingleFixture as never);
    expect(model.boxes.length).toBe(7);
    expect(model.groups).toEqual(['default']);
    expect(model.categoryLabels).toEqual(
      boxplotSingleFixture.uniqueValues.weekday,
    );
    expect(model.orientation).toBe('horizontal');
  });

  it('parallel-coordinates.fusedash.json → one axis per dimension', () => {
    const model = normalizeParallelCoordinatesData(parallelFixture as never);
    expect(model.axes).toEqual(parallelFixture.uniqueValues.dimensions);
    expect(model.rows.length).toBe(parallelFixture.data.length);
    expect(model.orientation).toBe('horizontal');
  });
  it('violin.fusedash.json → groups with samples', () => {
    const model = normalizeViolinData(violinFixture as never);
    expect(model.groups.length).toBe(5);
    expect(model.groups.every((g) => g.samples.length > 0)).toBe(true);
    expect(model.orientation).toBe('horizontal');
  });

  it('waterfall.fusedash.json → delta-flags waterfall steps', () => {
    const model = normalizeWaterfallData(waterfallFixture as never);
    expect(model.sourcePath).toBe('delta-flags');
    expect(model.steps.length).toBe(8);
    expect(model.steps[0].end).toBe(5000);
    expect(model.steps[7].end).toBe(5500);
    expect(model.orientation).toBe('horizontal');
  });

  it('pie.fusedash.json → 12 slices', () => {
    const model = normalizePieData(pieFixture as never);
    expect(model.slices.length).toBe(12);
    expect(model.total).toBeGreaterThan(0);
  });

  it('donut.fusedash.json → 12 slices in month order', () => {
    const model = normalizeDonutData(donutFixture as never);
    expect(model.slices.length).toBe(12);
    expect(model.slices[0].label).toBe('January');
    expect(model.total).toBeGreaterThan(0);
  });

  it('polar-area.fusedash.json → grouped wedges (category × group)', () => {
    const model = normalizePolarAreaData(polarAreaFixture as never);
    expect(model.grouped).toBe(true);
    expect(model.sectors.length).toBe(21);
    expect(model.legend.length).toBe(5);
    expect(model.categories.length).toBe(7);
    expect(model.maxValue).toBeGreaterThan(0);
  });

  it('scatter.fusedash.json → grouped points', () => {
    const model = normalizeScatterData(scatterFixture as never);
    expect(model.points.length).toBe(456);
    expect(model.groups.length).toBe(2);
  });

  it('bias-variance-tradeoff.fusedash.json → three tradeoff curves', () => {
    const model = normalizeBiasVarianceData(biasVarianceFixture as never);
    expect(model.series.length).toBe(3);
    expect(model.series.every((s) => s.points.length === 12)).toBe(true);
  });

  it('bias-variance-tradeoff-limits.fusedash.json → three reference bands', () => {
    const model = normalizeBiasVarianceData(biasVarianceLimitsFixture as never);
    expect(model.series.length).toBe(3);
    expect(model.domainsLimits.map((l) => l.values)).toEqual([[0.5, 2.3], [5], [7.7, 10]]);
    expect(model.domainsLimits.every((l) => l.orientation === 'vertical')).toBe(true);
  });

  it('bubble.fusedash.json → 50 bubbles', () => {
    const model = normalizeBubbleData(bubbleFixture as never);
    expect(model.points.length).toBe(50);
    expect(model.groups.length).toBe(1);
    expect(model.colorRanges.length).toBeGreaterThan(0);
  });

  it('bubble-grouped.fusedash.json → five market-segment groups', () => {
    const model = normalizeBubbleData(bubbleGroupedFixture as never);
    expect(model.points.length).toBe(bubbleGroupedFixture.data.length);
    expect(model.groups.map((g) => g.key)).toEqual(
      bubbleGroupedFixture.uniqueValues.MD_Market_segment,
    );
    expect(model.groupField).toBe('MD_Market_segment');
  });

  it('radar.fusedash.json → single series with 7 categories', () => {
    const model = normalizeRadarData(radarFixture as never);
    expect(model.series.length).toBe(1);
    expect(model.categories.length).toBe(7);
    expect(model.series[0].points.length).toBe(7);
    expect(model.series[0].color).toBe('#473DD9');
  });

  it('radar-grouped.fusedash.json → six weather series', () => {
    const model = normalizeRadarData(radarGroupedFixture as never);
    expect(model.series.length).toBe(6);
    expect(model.categories.length).toBe(7);
    expect(model.series.every((s) => s.points.length === 7)).toBe(true);
    const expectedGroups = radarGroupedFixture.uniqueValues.weather_main.slice().reverse();
    expect(model.series.map((s) => s.id)).toEqual(expectedGroups);
  });

  it('area-grouped-bar.fusedash.json → categories, groups, line', () => {
    const model = normalizeAreaGroupedBarData(areaGroupedBarFixture as never);
    expect(model.categories.length).toBeGreaterThan(0);
    expect(model.groups.length).toBe(5);
    expect(model.linePoints.length).toBe(model.categories.length);
  });

  it('radial-bar.fusedash.json → eight rings, innermost last', () => {
    const model = normalizeRadialBarData(radialBarFixture as never);
    expect(model.bars.length).toBe(8);
    expect(model.bars[0].key).toBe('Clear');
    expect(model.legend[0].key).toBe('Haze');
  });

  it('network-graph.fusedash.json → ten nodes and nine links', () => {
    const model = normalizeNetworkGraphData(networkGraphFixture as never);
    expect(model.nodes).toHaveLength(10);
    expect(model.links).toHaveLength(9);
    expect(model.breakpoints).toHaveLength(7);
  });

  it('treemap.fusedash.json → five grouped cards', () => {
    const model = normalizeTreemapData(treemapFixture as never);
    expect(model.mode).toBe('grouped');
    expect(model.groups.length).toBe(5);
    expect(model.groups.every((group) => group.tiles.length > 0)).toBe(true);
  });

  it('partial-dependence.fusedash.json → ICE curves + local average', () => {
    const model = normalizePartialDependenceData(pdpFixture as never);
    expect(model.iceSeries.length).toBe(16);
    expect(model.averageSeries.length).toBeGreaterThan(0);
    expect(model.color).toBe('#473DD9');
  });

  it('kpis.fusedash.json → four KPI cards', () => {
    const model = normalizeKpiData(kpisFixture as never);
    expect(model.cards.length).toBe(4);
    expect(model.cards.every((c) => c.value !== '—')).toBe(true);
  });

  it('kpi-high-low.fusedash.json → high/low subtitles', () => {
    const model = normalizeKpiData(kpiHighLowFixture as never);
    expect(model.cards.length).toBe(2);
    expect(model.cards.map((c) => c.subtitle)).toEqual(['2491', '2733']);
  });

  it('every FuseDash fixture chartType dispatches via chart-renderer registry', () => {
    const fixtures = [
      lineFixture,
      areaFixture,
      lineGroupedFixture,
      lollipopFixture,
      lollipopGroupedFixture,
      stepFixture,
      stepRocFixture,
      sparkFixture,
      sparkAreaFixture,
      scatterSparklineFixture,
      histogramFixture,
      histogramSingleFixture,
      histogramSatisfactionFixture,
      punchcardFixture,
      boxplotFixture,
      matrixFixture,
      parallelFixture,
      violinFixture,
      waterfallFixture,
      pieFixture,
      donutFixture,
      polarAreaFixture,
      scatterFixture,
      biasVarianceFixture,
      biasVarianceLimitsFixture,
      bubbleFixture,
      bubbleGroupedFixture,
      radarFixture,
      radarGroupedFixture,
      areaGroupedBarFixture,
      radialBarFixture,
      networkGraphFixture,
      treemapFixture,
      pdpFixture,
      kpisFixture,
      kpiHighLowFixture,
      barFixture,
      barGroupedFixture,
      giniFixture,
      mapFixture,
    ] as Array<{ chartType?: string }>;

    for (const fixture of fixtures) {
      expect(canRenderChartType(fixture.chartType), fixture.chartType).toBe(true);
    }
  });

  it('gini-impurity-entropy.fusedash.json → one curve per yAxe metric', () => {
    const model = normalizeGiniImpurityEntropyData(giniFixture as never);
    expect(model.series.map((s) => s.id)).toEqual(giniFixture.yAxe);
    expect(
      model.series.every((s) => s.points.length === giniFixture.data.length),
    ).toBe(true);
    expect(model.yLabel).toBe('Impurity Index');
  });

  it('map.fusedash.json → country choropleth from layers', () => {
    const model = normalizeMapData(mapFixture as never);
    expect(model.layers).toHaveLength(1);
    expect(model.layers[0].mapType).toBe('country');
    expect(model.layers[0].visualisationType).toBe('choropleth');
    expect(model.layers[0].rows.length).toBeGreaterThan(0);
  });
});
