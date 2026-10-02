// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;

  await Promise.all([
    import('../bar-chart/element/ui9000-bar-chart.js'),
    import('../line-chart/element/ui9000-line-chart.js'),
    import('../area-chart/element/ui9000-area-chart.js'),
    import('../area-grouped-bar-chart/element/ui9000-area-grouped-bar-chart.js'),
    import('../step-line-chart/element/ui9000-step-line-chart.js'),
    import('../spark-line-chart/element/ui9000-spark-line-chart.js'),
    import('../spark-area-chart/element/ui9000-spark-area-chart.js'),
    import('../scatter-sparkline-chart/element/ui9000-scatter-sparkline-chart.js'),
    import('../lollipop/element/ui9000-lollipop.js'),
    import('../scatter-plot-chart/element/ui9000-scatter-plot.js'),
    import('../bubble-chart/element/ui9000-bubble-chart.js'),
    import('../histogram-chart/element/ui9000-histogram-chart.js'),
    import('../box-plot-chart/element/ui9000-box-plot-chart.js'),
    import('../waterfall-chart/element/ui9000-waterfall-chart.js'),
    import('../violin-chart/element/ui9000-violin-chart.js'),
    import('../punchcard-chart/element/ui9000-punchcard-chart.js'),
    import('../matrix-chart/element/ui9000-matrix-chart.js'),
  ]);
});

type Shadowed = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 40));

const labels = [
  { label: 'Jan', value: 10 },
  { label: 'Feb', value: 20 },
];

const cases: Array<{ tag: string; data: unknown }> = [
  { tag: 'ui9000-bar-chart', data: labels },
  { tag: 'ui9000-line-chart', data: labels },
  {
    tag: 'ui9000-area-chart',
    data: [
      {
        id: 'a',
        points: [
          { x: 'Jan', y: 10, y0: 0, y1: 10 },
          { x: 'Feb', y: 20, y0: 0, y1: 20 },
        ],
      },
    ],
  },
  {
    tag: 'ui9000-area-grouped-bar-chart',
    data: {
      data: [
        { age: '40', ca: '0', oldpeak: 1, trestbps: 120 },
        { age: '50', ca: '1', oldpeak: 2, trestbps: 130 },
      ],
      xAxe: ['age'],
      yAxe: ['oldpeak', 'trestbps'],
      groupBy: ['ca'],
    },
  },
  { tag: 'ui9000-step-line-chart', data: labels },
  {
    tag: 'ui9000-spark-line-chart',
    data: {
      points: [
        { x: '2024-01-01', y: 10 },
        { x: '2024-01-02', y: 20 },
      ],
    },
  },
  {
    tag: 'ui9000-spark-area-chart',
    data: {
      points: [
        { x: '2024-01-01', y: 10 },
        { x: '2024-01-02', y: 20 },
      ],
    },
  },
  {
    tag: 'ui9000-scatter-sparkline-chart',
    data: {
      series: [
        {
          id: 'a',
          points: [
            { x: '2024-01-01', y: 10 },
            { x: '2024-01-02', y: 20 },
          ],
        },
      ],
      scatterPoints: [{ x: '2024-01-01', y: 10, groupKey: 'a', color: '#473DD9' }],
    },
  },
  { tag: 'ui9000-lollipop', data: labels },
  {
    tag: 'ui9000-scatter-plot',
    data: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
  },
  {
    tag: 'ui9000-bubble-chart',
    data: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
  },
  { tag: 'ui9000-histogram-chart', data: labels },
  {
    tag: 'ui9000-box-plot-chart',
    data: [
      {
        label: '2013',
        group: 'A',
        q1: 10,
        median: 20,
        q3: 30,
        smallestNonOutlier: 5,
        biggestNonOutlier: 40,
        outliers: [],
      },
    ],
  },
  {
    tag: 'ui9000-waterfall-chart',
    data: [
      { label: 'Start', value: 100 },
      { label: 'End', value: 80 },
    ],
  },
  {
    tag: 'ui9000-violin-chart',
    data: [{ id: 'A', samples: [10, 20, 30, 40] }],
  },
  {
    tag: 'ui9000-punchcard-chart',
    data: [
      { x: 'Mon', y: 'AM', value: 10 },
      { x: 'Tue', y: 'PM', value: 20 },
    ],
  },
  {
    tag: 'ui9000-matrix-chart',
    data: [
      { x: 'A', y: 'R1', value: 1 },
      { x: 'B', y: 'R2', value: 2 },
    ],
  },
];

async function mount(tag: string, data: unknown): Promise<Shadowed> {
  const el = document.createElement(tag) as Shadowed;
  el.style.setProperty('--ui9000-color-surface', '#13161D');
  el.style.setProperty('--ui9000-mode', 'dark');
  el.setAttribute('data', JSON.stringify(data));
  document.body.append(el);
  await el.updateComplete;
  await flush();
  await el.updateComplete;
  return el;
}

describe('family A dark axes', () => {
  it.each(cases)('$tag paints axes from the host theme', async ({ tag, data }) => {
    const el = await mount(tag, data);
    const svg = el.shadowRoot.querySelector('svg');
    expect(svg, tag).not.toBeNull();
    const painted = svg!.innerHTML.toLowerCase();
    expect(painted, tag).toMatch(/#444b57|#a4a9b1/);
    expect(painted, tag).not.toContain('#afb3bb');
    expect(painted, tag).not.toContain('#6c7584');
    el.remove();
  });
});
