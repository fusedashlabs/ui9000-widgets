import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';
import type { DataContext } from '../../lib/chart-state.js';

/** The overlays draw from `meta` (pHat, ci, split); without it they have nothing to show (rendered). */
const noMeta = ({ data }: DataContext) => !(data && typeof data === 'object' && (data as { meta?: unknown }).meta);

const giniAndEntropy: ChartConfig = {
  id: 'gini-and-entropy',
  title: 'Gini and entropy',
  category: 'model-impurity',
  description: 'Compares entropy, Gini impurity and misclassification error over the class probability.',
  tag: 'ui9000-gini-impurity-entropy-chart',
  keywords: ['impurity', 'decision tree', 'misclassification'],
  load: async () => {
    await import('../../../../src/components/gini-impurity-entropy-chart/element/ui9000-gini-impurity-entropy-chart.js');
  },
  presets: [
    {
      id: 'curves',
      label: 'Curves',
      icon: 'impurity',
      data: () => import('../../../../src/stories/fixtures/gini-impurity-entropy.fusedash.json').then((m) => m.default),
    },
    {
      id: 'annotated',
      label: 'With annotations',
      icon: 'impurity-marked',
      data: () => import('../../../../src/stories/GiniImpurityEntropyChart.stories.js').then((m) => m.WithAnnotations.args?.data),
      values: { showPHat: true, showCI: true, showSplit: true },
    },
  ],
  controls: [
    { property: 'showPHat', attribute: 'show-p-hat', type: 'boolean', default: false, label: 'Show estimate', description: 'The estimated probability, from meta.pHat, as a line.', hiddenWhen: noMeta },
    { property: 'showCI', attribute: 'show-ci', type: 'boolean', default: false, label: 'Show interval', description: 'The estimate’s confidence interval, from meta.ci, as a band.', hiddenWhen: noMeta },
    { property: 'showSplit', type: 'boolean', default: false, description: 'The two sides of a split, from meta.split, marked on the curves.', hiddenWhen: noMeta },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the curves.' },
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend of the curves.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The probability and each measure in a tooltip when hovering.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title of the chart.',
    xAxe: 'The class probability p, along the horizontal axis.',
    yAxe: 'The measures drawn: entropy, gini and mis.',
    data: 'One row per value of p, with each measure.',
    axisDetails: 'Labels and formats of the fields.',
    meta: 'Annotations: pHat (an estimate), ci (its interval) and split (the two sides of a split).',
  },
  whenToUse: {
    useFor: ['Teaching how a decision tree chooses its splits.', 'Showing where a node’s estimate sits on the impurity curves.'],
    avoid: ['More than two classes: the curves are for a probability between two.'],
  },
};

export default giniAndEntropy;
