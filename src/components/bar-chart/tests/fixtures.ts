import type { BarChartData } from '../lib/types.js';

/**
 * Agreed mock fixture for the Barchart port — the payload the FuseDash
 * side-by-side comparison renders.
 *
 * Shaped to exercise every branch of the renderer: six categories for label
 * thinning, three series for the >2 palette family, values spanning zero, and a
 * category one series is missing from.
 */

/** `VerticalBarChart` / `HorizontalBarChart` — one series. */
export const BAR_FIXTURE_SINGLE: BarChartData = {
  points: [
    { x: 'Jan', y: 30 },
    { x: 'Feb', y: 45 },
    { x: 'Mar', y: 20 },
    { x: 'Apr', y: 52 },
    { x: 'May', y: 38 },
    { x: 'Jun', y: 61 },
  ],
};

/** `GroupedBarChart` / `StackedVerticalBarChart` — three series (`groupBy`). */
export const BAR_FIXTURE_MULTI: BarChartData = {
  series: [
    {
      id: 'north',
      name: 'North',
      points: [
        { x: 'Q1', y: 32 },
        { x: 'Q2', y: 45 },
        { x: 'Q3', y: 28 },
        { x: 'Q4', y: 51 },
      ],
    },
    {
      id: 'south',
      name: 'South',
      points: [
        { x: 'Q1', y: 24 },
        { x: 'Q2', y: 31 },
        { x: 'Q3', y: 40 },
        { x: 'Q4', y: 36 },
      ],
    },
    {
      id: 'west',
      name: 'West',
      // Q2 is absent on purpose — a missing group key must leave a gap, not a zero
      points: [
        { x: 'Q1', y: 18 },
        { x: 'Q3', y: 33 },
        { x: 'Q4', y: 27 },
      ],
    },
  ],
};

/** Values on both sides of the baseline. */
export const BAR_FIXTURE_DIVERGENT: BarChartData = {
  points: [
    { x: 'Jan', y: 24 },
    { x: 'Feb', y: -18 },
    { x: 'Mar', y: 41 },
    { x: 'Apr', y: -32 },
    { x: 'May', y: 12 },
  ],
};

/**
 * Every variant the component renders, keyed by its `chartTypeKeys` entry.
 * `tests/metadata.test.ts` checks this stays in step with `metadata.json`.
 */
export const BAR_FIXTURE_VARIANTS = [
  {
    chartType: 'barChart',
    title: 'Vertical (plain)',
    data: BAR_FIXTURE_SINGLE,
  },
  {
    chartType: 'barHorizontal',
    title: 'Horizontal (plain)',
    data: BAR_FIXTURE_SINGLE,
  },
  {
    chartType: 'barGrouped',
    title: 'Vertical grouped',
    data: BAR_FIXTURE_MULTI,
  },
  {
    chartType: 'barStacked',
    title: 'Vertical stacked',
    data: BAR_FIXTURE_MULTI,
  },
  {
    chartType: 'barHorizontalGrouped',
    title: 'Horizontal grouped',
    data: BAR_FIXTURE_MULTI,
  },
  {
    chartType: 'barHorizontalStacked',
    title: 'Horizontal stacked',
    data: BAR_FIXTURE_MULTI,
  },
  {
    chartType: 'cumulativeBar',
    title: 'Vertical + cumulative line',
    data: BAR_FIXTURE_SINGLE,
  },
  {
    chartType: 'barChart',
    title: 'Positive and negative values',
    data: BAR_FIXTURE_DIVERGENT,
  },
] as const;
