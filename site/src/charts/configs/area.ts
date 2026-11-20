import { HEADER_CONTROLS, SCALE_INERT, oneSeries } from '../shared.js';
import type { ChartConfig } from '../types.js';

const area: ChartConfig = {
  id: 'area',
  title: 'Area',
  category: 'comparison',
  description: 'A line with the space under it filled, to show volume over an ordered axis; series can overlap or stack.',
  tag: 'ui9000-area-chart',
  keywords: ['filled line', 'volume'],
  load: async () => {
    const [, lib] = await Promise.all([
      import('../../../../src/components/area-chart/element/ui9000-area-chart.js'),
      import('../../../../src/components/area-chart/lib/normalize.js'),
    ]);
    return {
      countSeries: (data) => lib.normalizeAreaData(data as Parameters<typeof lib.normalizeAreaData>[0]).series.length,
    };
  },
  presets: [
    {
      id: 'single-series',
      label: 'Single series',
      icon: 'area',
      // The Storybook story's data: the grouped fixture summed per year, one series.
      data: () => import('../../../../src/stories/AreaChart.stories.js').then((m) => m.Single.args?.data),
      values: { chartTitle: 'Average Price Over Years' },
    },
    {
      id: 'multiple-series',
      label: 'Multiple series',
      icon: 'area-overlap',
      data: () => import('../../../../src/stories/fixtures/area.fusedash.json').then((m) => m.default),
      values: { chartTitle: 'Average Price by Market Segment Over Years' },
    },
  ],
  // Checked by rendering the three stories and the layout per preset.
  controls: [
    {
      // The element has no layout attribute: it stacks when the data says stacked: true (and has a groupBy).
      property: 'layout',
      target: 'data.stacked',
      dataValues: { grouped: false, stacked: true },
      type: 'enum',
      options: ['grouped', 'stacked'],
      default: 'grouped',
      description: 'With two or more series: areas drawn over each other from zero (grouped), or stacked into a total.',
      hiddenWhen: oneSeries,
    },
    { property: 'showPoints', type: 'boolean', default: true, description: 'A marker on every point.' },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the areas.' },
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend above the plot, one entry per series.',
      hiddenWhen: oneSeries,
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering the plot.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [
    SCALE_INERT,
    // The payload's markers win; every preset is a FuseDash payload, so the attribute changes nothing here.
    { property: 'marker', attribute: 'marker', reason: 'Ignored for FuseDash payloads: the payload\'s markers win (rendered).' },
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    stacked: 'true (with a groupBy) stacks the series into a total. The Layout setting writes it.',
    markers: 'Marker shape per series key ("default" with one series). Wins over the marker attribute.',
    xAxe: 'Field of a row with the position along the horizontal axis, in the order of uniqueValues.',
    yAxe: 'Field of a row with the value.',
    groupBy: 'Field that splits the rows into series, one area each. Absent or empty: one area.',
    formatting: 'Colour per series: key, and the step in the palette (1-based).',
    uniqueValues: 'Order of the horizontal axis and of the series, per field.',
    axisDetails: 'Unit and label per field, for the axes and tooltips.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: [
      'A total that changes over time, where the filled shape makes the volume easy to feel.',
      'Stacked: how a total over time splits into a few parts.',
    ],
    avoid: [
      'Comparing series precisely: overlapping areas hide each other, and stacked ones only share a baseline at the bottom.',
      'Categories with no order: use a bar chart.',
    ],
  },
};

export default area;
