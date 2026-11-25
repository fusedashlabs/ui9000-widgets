import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const biasAndVariance: ChartConfig = {
  id: 'bias-and-variance',
  title: 'Bias and variance',
  category: 'model-error',
  description: 'Shows a model’s error split into bias and variance as its complexity grows.',
  tag: 'ui9000-bias-variance-tradeoff-chart',
  keywords: ['tradeoff', 'complexity', 'overfitting', 'underfitting'],
  load: async () => {
    await import('../../../../src/components/bias-variance-tradeoff-chart/element/ui9000-bias-variance-tradeoff-chart.js');
  },
  presets: [
    {
      id: 'curves',
      label: 'Curves',
      icon: 'tradeoff',
      data: () => import('../../../../src/stories/fixtures/bias-variance-tradeoff.fusedash.json').then((m) => m.default),
    },
    {
      id: 'with-limits',
      label: 'With fit bands',
      icon: 'tradeoff-bands',
      data: () => import('../../../../src/stories/fixtures/bias-variance-tradeoff-limits.fusedash.json').then((m) => m.default),
    },
  ],
  controls: [
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the curves.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend of the curves.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The complexity and each curve’s value in a tooltip when hovering.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title of the chart.',
    xAxe: 'The complexity, along the horizontal axis.',
    yAxe: 'The error, up the vertical axis.',
    groupBy: 'The field that names each curve: bias, variance, total.',
    data: 'One row per point: the complexity, the value and the curve it belongs to.',
    axisDetails: 'Labels and formats of the fields.',
    domainsLimits: 'Bands across the complexity axis, such as underfit, optimal and overfit.',
    description: 'Text about the chart, not drawn.',
  },
  whenToUse: {
    useFor: ['Explaining why a more complex model stops getting better.', 'Picking the complexity where the total error is lowest.'],
    avoid: ['A single error curve: a line chart is enough.', 'Errors measured on data the model was trained on.'],
  },
};

export default biasAndVariance;
