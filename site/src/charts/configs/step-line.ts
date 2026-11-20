import { HEADER_CONTROLS, SCALE_INERT } from '../shared.js';
import type { ChartConfig } from '../types.js';

const stepLine: ChartConfig = {
  id: 'step-line',
  title: 'Step line',
  category: 'ordered-series',
  description: 'Draws a value that changes in steps along an ordered axis, such as a KS plot or a ROC curve.',
  tag: 'ui9000-step-line-chart',
  keywords: ['ks plot', 'roc curve', 'cdf', 'staircase'],
  load: async () => {
    await import('../../../../src/components/step-line-chart/element/ui9000-step-line-chart.js');
  },
  presets: [
    {
      id: 'ks-plot',
      label: 'KS plot',
      icon: 'steps',
      data: () => import('../../../../src/stories/fixtures/step-line.fusedash.json').then((m) => m.default),
      values: { grafType: 'curve' },
    },
    {
      id: 'roc',
      label: 'ROC',
      icon: 'roc',
      data: () => import('../../../../src/stories/fixtures/step-line-roc.fusedash.json').then((m) => m.default),
      values: { grafType: 'line' },
    },
  ],
  controls: [
    {
      property: 'grafType',
      attribute: 'graf-type',
      label: 'Reference',
      type: 'enum',
      options: ['none', 'curve', 'line'],
      default: 'none',
      description: 'A reference over the steps: none, a smooth ideal curve, or a straight diagonal line.',
    },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the steps.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend above the plot, one entry per series.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering the plot.' },
    { property: 'xLabel', type: 'string', default: '', description: 'Title under the horizontal axis.' },
    { property: 'yLabel', type: 'string', default: '', description: 'Title beside the vertical axis.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [SCALE_INERT],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    xAxe: 'Field of a row with the position along the axis.',
    yAxe: 'Field of a row with the value.',
    groupBy: 'Field that splits the rows into series. Empty: one series.',
    formatting: 'Colour per series.',
    uniqueValues: 'Order of the positions and series.',
    data: 'The rows.',
  },
  whenToUse: {
    useFor: [
      'Cumulative distributions and classifier curves: KS plots, ROC curves, CDFs.',
      'A value that holds until the next change, rather than moving smoothly between points.',
    ],
    avoid: ['Values that change continuously: a line chart reads better.', 'Unordered categories.'],
  },
};

export default stepLine;
