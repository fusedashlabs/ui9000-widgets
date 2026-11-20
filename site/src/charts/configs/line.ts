import { HEADER_CONTROLS, SCALE_INERT, oneSeries } from '../shared.js';
import type { ChartConfig } from '../types.js';

const line: ChartConfig = {
  id: 'line',
  title: 'Line',
  category: 'comparison',
  description: 'Connects values along an ordered axis to show how they rise and fall, one line per series.',
  tag: 'ui9000-line-chart',
  keywords: ['trend', 'time series'],
  load: async () => {
    const [, lib] = await Promise.all([
      import('../../../../src/components/line-chart/element/ui9000-line-chart.js'),
      import('../../../../src/components/line-chart/lib/normalize.js'),
    ]);
    return { countSeries: (data) => lib.normalizeLineData(data as Parameters<typeof lib.normalizeLineData>[0]).length };
  },
  presets: [
    {
      id: 'single-series',
      label: 'Single series',
      icon: 'line',
      data: () => import('../../../../src/stories/fixtures/line.fusedash.json').then((m) => m.default),
      values: { chartTitle: 'Count Over Time' },
    },
    {
      id: 'multiple-series',
      label: 'Multiple series',
      icon: 'lines',
      data: () => import('../../../../src/stories/fixtures/line-grouped.fusedash.json').then((m) => m.default),
      values: { chartTitle: 'Revenue by Crop Group Over Years' },
    },
  ],
  // Checked by rendering both stories and, for Marker, with points off.
  controls: [
    {
      property: 'curve',
      type: 'enum',
      options: ['linear', 'monotone', 'step'],
      default: 'linear',
      description: 'How points are joined: straight segments, a smooth curve through every point, or steps.',
    },
    {
      property: 'showPoints',
      type: 'boolean',
      default: true,
      description: 'A marker on every point.',
    },
    {
      property: 'marker',
      type: 'enum',
      options: ['donut', 'circle', 'square', 'rhombus', 'triangle', 'disabled'],
      optionLabels: { disabled: 'None' },
      default: 'donut',
      description: 'Shape of the point markers; "disabled" draws none.',
      inertWhen: ({ values }) => values.showPoints === false,
    },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the lines.' },
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend above the plot, one entry per series.',
      hiddenWhen: oneSeries,
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering the plot.' },
    { property: 'xLabel', type: 'string', default: '', description: 'Title under the horizontal axis.' },
    { property: 'yLabel', type: 'string', default: '', description: 'Title beside the vertical axis.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [
    SCALE_INERT,
    { property: 'showArea', attribute: 'show-area', reason: 'Draws nothing in this version: no area under the lines, on or off (rendered).' },
  ],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the position along the horizontal axis, in the order of uniqueValues.',
    yAxe: 'Field of a row with the value.',
    groupBy: 'Field that splits the rows into series, one line each. Absent or empty: one line.',
    formatting: 'Colour per series: key, and the step in the palette (1-based).',
    uniqueValues: 'Order of the horizontal axis and of the series, per field.',
    data: 'The rows.',
    points: 'One series: a list of points.',
    'points.x': 'Position along the horizontal axis.',
    'points.y': 'The value.',
  },
  whenToUse: {
    useFor: [
      'A value over time or another ordered axis, where the direction of change matters more than each value.',
      'Comparing the trend of a few series on the same scale.',
      'Many points: a line stays readable where bars would crowd.',
    ],
    avoid: [
      'Categories with no order: use a bar chart.',
      'More than about 6 series: the lines tangle. Show fewer, or one chart per series.',
    ],
  },
};

export default line;
