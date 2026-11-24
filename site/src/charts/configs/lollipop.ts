import { HEADER_CONTROLS, SCALE_INERT, oneSeries } from '../shared.js';
import type { ChartConfig } from '../types.js';

const lollipop: ChartConfig = {
  id: 'lollipop',
  title: 'Lollipop',
  category: 'comparison',
  description: 'Compares values across categories with a thin stem and a marker at the value: a lighter bar chart.',
  tag: 'ui9000-lollipop',
  keywords: ['dot plot', 'stem'],
  load: async () => {
    const [, lib] = await Promise.all([
      import('../../../../src/components/lollipop/element/ui9000-lollipop.js'),
      import('../../../../src/components/lollipop/lib/normalize.js'),
    ]);
    return {
      countSeries: (data) => lib.normalizeLollipopData(data as Parameters<typeof lib.normalizeLollipopData>[0]).length,
    };
  },
  presets: [
    {
      id: 'single-series',
      label: 'Single series',
      icon: 'lollipop',
      // The story fixture with other values: there, four of the six stems sit flat on zero. Smallest ≈ 28% of the
      // largest, so every stem reads. One formatting entry instead of the fixture's one per category, so the one
      // series draws in one colour (step 1 of its palette), as Bar's does.
      data: () => import('../data/lollipop-single.fusedash.json').then((m) => m.default),
      values: { chartTitle: 'Average Density by Growing Method' },
    },
    {
      id: 'multiple-series',
      label: 'Multiple series',
      icon: 'lollipop-grouped',
      // The story fixture with other values: there, Fresh market, Fresh+ Processing and Other (0.7–1.8K) sit on the
      // axis under Fresh (up to 38.9K). Here those three are 10–18K; Fresh and Not specified are the fixture's.
      data: () => import('../data/lollipop-grouped.fusedash.json').then((m) => m.default),
      values: { chartTitle: 'Average Price by Market Segment Over Years' },
    },
  ],
  // Checked by rendering every Storybook story.
  controls: [
    {
      property: 'orientation',
      type: 'enum',
      options: ['vertical', 'horizontal'],
      default: 'vertical',
      description: 'Stems grow up from the category axis (vertical) or across from it (horizontal).',
    },
    {
      // Written into the data as `stacked`: the element stacks whenever the data says stacked: true, and the
      // layout attribute cannot undo that. The data field works both ways.
      property: 'layout',
      target: 'data.stacked',
      dataValues: { grouped: false, stacked: true },
      type: 'enum',
      options: ['grouped', 'stacked'],
      default: 'grouped',
      description: 'With two or more series: one stem per series side by side (grouped), or the series stacked on one stem.',
      hiddenWhen: oneSeries,
    },
    {
      property: 'marker',
      type: 'enum',
      options: ['rhombus', 'donut', 'circle', 'square', 'triangle', 'disabled'],
      optionLabels: { disabled: 'None' },
      default: 'rhombus',
      description: 'Shape at the end of each stem; "disabled" draws stems only.',
    },
    { property: 'showGrid', type: 'boolean', default: true, description: 'Grid lines behind the stems.' },
    {
      property: 'showLegend',
      type: 'boolean',
      default: true,
      description: 'Legend above the plot, one entry per series.',
      hiddenWhen: oneSeries,
    },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'Values in a tooltip when hovering a marker.' },
    { property: 'xLabel', type: 'string', default: '', description: 'Title under the horizontal axis.' },
    { property: 'yLabel', type: 'string', default: '', description: 'Title beside the vertical axis.' },
    ...HEADER_CONTROLS,
  ],
  hidden: [SCALE_INERT],
  dataFields: {
    name: 'Title in the header when chart-title is not set.',
    stacked: 'true stacks the series on one stem. The Layout setting writes it.',
    xAxe: 'Field of a row with the category.',
    yAxe: 'Field of a row with the value.',
    groupBy: 'Field that splits the rows into series. Absent or empty: one series.',
    formatting:
      "Colour per series: key, and the step in the palette (1-based). With one series, an entry keyed by a category colours that category; the others take the first entry's colour.",
    uniqueValues: 'Order of the categories and series, per field.',
    data: 'The rows.',
    points: 'One series: a list of points.',
    'points.label': 'The category.',
    'points.value': 'The value.',
  },
  whenToUse: {
    useFor: [
      'The same comparisons as a bar chart when many bars would look heavy: the stems keep the eye on the values.',
      'Ranked lists, sorted by value, where the gaps between items matter.',
      'A few series over a handful of categories, side by side or stacked.',
    ],
    avoid: [
      'Values close together: small differences are easier to read as bar lengths.',
      'Parts of a whole: use a stacked bar or a pie.',
    ],
  },
};

export default lollipop;
