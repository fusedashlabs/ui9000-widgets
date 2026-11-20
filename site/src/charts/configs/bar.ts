import type { AvailabilityContext } from '../../lib/chart-state.js';
import { HEADER_CONTROLS, oneSeries, severalSeries } from '../shared.js';
import type { ChartConfig } from '../types.js';

/** The overlay is only drawn on a vertical chart with one series. */
const cumulativeApplies = ({ seriesCount, values }: AvailabilityContext) =>
  seriesCount < 2 && values.orientation === 'vertical';

const bar: ChartConfig = {
  id: 'bar',
  title: 'Bar',
  category: 'comparison',
  description: 'Presents categorical data with rectangular bars, with lengths proportional to values.',
  tag: 'ui9000-bar-chart',
  keywords: ['column', 'horizontal bar', 'grouped', 'stacked', 'ranking'],
  load: async () => {
    const [, lib, metadata] = await Promise.all([
      import('../../../../src/components/bar-chart/element/ui9000-bar-chart.js'),
      import('../../../../src/components/bar-chart/lib/normalize.js'),
      import('../../../../src/components/bar-chart/metadata.json'),
    ]);
    return {
      countSeries: (data) => lib.normalizeBarData(data as Parameters<typeof lib.normalizeBarData>[0]).length,
      dataRoles: metadata.dataRoles,
    };
  },
  // Presets only pick the sample data, with the axis title its story gives that data. Orientation, layout and
  // the cumulative line are settings.
  presets: [
    {
      id: 'single-series',
      label: 'Single series',
      icon: 'bars',
      data: () => import('../../../../src/stories/fixtures/bar.fusedash.json').then((m) => m.default),
      values: { yLabel: 'Count', chartTitle: 'Product Line Count' },
    },
    {
      id: 'multiple-series',
      label: 'Multiple series',
      icon: 'bars-grouped',
      // The story fixture with other values: there, Northfield's 818M flattens most of the 70 bars, and 14 regions
      // get 6 axis labels. Here the 6 labelled regions, the same 5 groups, 205M–818M (smallest 25% of the largest).
      data: () => import('../data/bar-grouped.fusedash.json').then((m) => m.default),
      values: { chartTitle: 'Total Revenue by Region and Crop Group' },
    },
    {
      id: 'positive-and-negative',
      label: 'Positive and negative',
      icon: 'bars-diverging',
      data: () => import('../../../../src/stories/BarChart.stories.js').then((m) => m.Divergent.args?.data),
      values: { yLabel: 'Net change', chartTitle: 'Net Change by Month' },
    },
  ],
  // Each hiddenWhen and inertWhen was checked by rendering every preset in both orientations: the control changes
  // no pixel there. Horizontal with the cumulative line draws no line (an open question).
  controls: [
    {
      property: 'orientation',
      type: 'enum',
      options: ['vertical', 'horizontal'],
      default: 'vertical',
      description: 'Bars grow up from the category axis (vertical) or across from it (horizontal).',
    },
    {
      property: 'layout',
      type: 'enum',
      options: ['grouped', 'stacked'],
      default: 'grouped',
      description: 'With two or more series: bars side by side (grouped) or on top of each other (stacked).',
      hiddenWhen: oneSeries,
    },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the bars.' },
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend above the plot, one entry per series.',
      inertWhen: (ctx) => ctx.seriesCount < 2 && !(ctx.values.cumulativeLine === true && cumulativeApplies(ctx)),
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a bar.' },
    {
      property: 'cumulativeLine',
      type: 'boolean',
      default: false,
      description: 'Running-total line over the bars.',
      hiddenWhen: severalSeries,
      inertWhen: ({ values }) => values.orientation !== 'vertical',
    },
    { property: 'xLabel', type: 'string', default: '', description: 'Title under the horizontal axis.' },
    { property: 'yLabel', type: 'string', default: '', description: 'Title beside the vertical axis.' },
    {
      property: 'scale',
      type: 'enum',
      options: ['compact', 'default', 'comfortable'],
      default: 'default',
      description: 'Padding around the plot.',
    },
    ...HEADER_CONTROLS,
  ],
  // The ten presets this page had before, as data preset plus settings.
  legacyPresets: {
    default: { preset: 'single-series' },
    horizontal: { preset: 'single-series', values: { orientation: 'horizontal', yLabel: '' } },
    grouped: { preset: 'multiple-series', values: { orientation: 'horizontal' } },
    stacked: { preset: 'multiple-series', values: { orientation: 'horizontal', layout: 'stacked' } },
    'horizontal-grouped': { preset: 'multiple-series', values: { orientation: 'horizontal' } },
    'horizontal-stacked': { preset: 'multiple-series', values: { orientation: 'horizontal', layout: 'stacked' } },
    divergent: { preset: 'positive-and-negative' },
    'cumulative-line': { preset: 'single-series', values: { cumulativeLine: true } },
    'vertical-grouped': { preset: 'multiple-series' },
    'vertical-stacked': { preset: 'multiple-series', values: { layout: 'stacked' } },
  },
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    orientation: 'Which axis field is the category: "horizontal" reads the category from yAxe and the value from xAxe.',
    xAxe: 'Field of a row with the category (the value, when orientation is "horizontal").',
    yAxe: 'Field of a row with the value (the category, when orientation is "horizontal").',
    groupBy: 'Field that splits the rows into series. Null or empty: one series.',
    formatting: 'Colour per series: key, and the step in the palette (1-based).',
    uniqueValues: 'Order of the categories and series, per field.',
    data: 'The rows.',
    points: 'One series: a list of points.',
    'points.x': 'The category.',
    'points.y': 'The value. Negative values grow the other way from zero.',
  },
  whenToUse: {
    useFor: [
      'Comparing a handful of discrete groups on one metric, such as counts or scores per severity, host or rule.',
      'Splitting each bar by a second category: grouped to compare the parts, stacked to show the total.',
      'Horizontal bars when category names are long, so labels stay readable.',
      'Positive and negative values around zero, such as net change.',
    ],
    avoid: [
      'More than about 40 categories: a table or a histogram reads better.',
      'Location-only data: it belongs on a map.',
    ],
  },
};

export default bar;
