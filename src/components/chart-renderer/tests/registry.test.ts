import { describe, expect, it } from 'vitest';

import {
  CHART_TYPE_ALIASES,
  canRenderChartType,
  resolveChartTarget,
  SUPPORTED_CHART_TYPES,
} from '../lib/registry.js';

describe('chart renderer registry', () => {
  it('exposes every ported chart type', () => {
    expect(SUPPORTED_CHART_TYPES.length).toBeGreaterThan(20);
    expect(canRenderChartType('lineChart')).toBe(true);
    expect(canRenderChartType('scatterSparklineChart')).toBe(true);
    expect(canRenderChartType('KPIs')).toBe(true);
    expect(canRenderChartType('radialBarChart')).toBe(true);
    expect(canRenderChartType('polarAreaChart')).toBe(true);
    expect(canRenderChartType('networkGraphChart')).toBe(true);
    expect(canRenderChartType('matrixChart')).toBe(true);
    expect(canRenderChartType('treemapChart')).toBe(true);
    expect(canRenderChartType('partialDependenceChart')).toBe(true);
    expect(canRenderChartType('mapChart')).toBe(true);
  });

  it('resolves FuseDash aliases before lookup', () => {
    for (const [alias, canonical] of Object.entries(CHART_TYPE_ALIASES)) {
      expect(resolveChartTarget(alias)?.tag).toBe(resolveChartTarget(canonical)?.tag);
    }
  });

  it('routes radialBarChart to the radial bar element', () => {
    const target = resolveChartTarget('radialBarChart');
    expect(target?.kind).toBe('radial-bar-chart');
    expect(target?.tag).toBe('ui9000-radial-bar-chart');
  });

  it('routes polarAreaChart to the polar area element', () => {
    const target = resolveChartTarget('polarAreaChart');
    expect(target?.kind).toBe('polar-area-chart');
    expect(target?.tag).toBe('ui9000-polar-area-chart');
  });

  it('routes matrixChart to the matrix element', () => {
    const target = resolveChartTarget('matrixChart');
    expect(target?.kind).toBe('matrix-chart');
    expect(target?.tag).toBe('ui9000-matrix-chart');
  });

  it('routes treemapChart to the treemap element with its shell toggles', () => {
    const target = resolveChartTarget('treemapChart');
    expect(target?.kind).toBe('treemap-chart');
    expect(target?.tag).toBe('ui9000-treemap-chart');
    expect(target?.attrs).toEqual({ 'show-legend': true, 'show-tooltip': true });
  });

  it('routes partialDependenceChart to the PDP element', () => {
    const target = resolveChartTarget('partialDependenceChart');
    expect(target?.kind).toBe('partial-dependence-chart');
    expect(target?.tag).toBe('ui9000-partial-dependence-chart');
  });

  it('routes networkGraphChart to the network graph element', () => {
    const target = resolveChartTarget('networkGraphChart');
    expect(target?.kind).toBe('network-graph');
    expect(target?.tag).toBe('ui9000-network-graph');
  });

  it('maps ksPlotChart to step-line with curve overlay', () => {
    const target = resolveChartTarget('ksPlotChart');
    expect(target?.kind).toBe('step-line-chart');
    expect(target?.attrs?.['graf-type']).toBe('curve');
  });

  it('maps barGroupedChart alias to grouped vertical bars', () => {
    const target = resolveChartTarget('barGroupedChart');
    expect(target?.kind).toBe('bar-chart');
    expect(target?.attrs?.orientation).toBe('vertical');
    expect(target?.attrs?.layout).toBe('grouped');
  });

  it('dispatches giniImpurityEntropyChart to the D3 port', () => {
    const target = resolveChartTarget('giniImpurityEntropyChart');
    expect(target?.kind).toBe('gini-impurity-entropy-chart');
    expect(target?.tag).toBe('ui9000-gini-impurity-entropy-chart');
  });

  it('routes mapChart to the MapBox web component and opens the host gate', () => {
    const target = resolveChartTarget('mapChart');
    expect(target?.kind).toBe('map-chart');
    expect(target?.tag).toBe('ui9000-map-chart');
    expect(resolveChartTarget('UniversalMap')?.tag).toBe('ui9000-map-chart');
    expect(canRenderChartType('mapChart')).toBe(true);
    expect(canRenderChartType('UniversalMap')).toBe(true);
  });

  it('returns null for unknown chart types', () => {
    expect(canRenderChartType('customWidget')).toBe(false);
    expect(resolveChartTarget('donutGroupChart')).toBeNull();
    expect(canRenderChartType('donutGroupChart')).toBe(false);
  });
});
