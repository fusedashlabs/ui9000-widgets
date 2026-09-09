// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeBarData } from '../lib/index.js';
import { renderBarChart, type RenderBarChartOptions } from '../render/draw.js';

const single = normalizeBarData([
  { label: 'Jan', value: 30 },
  { label: 'Feb', value: 45 },
  { label: 'Mar', value: 20 },
]);

const multi = normalizeBarData({
  series: [
    {
      id: 'north',
      name: 'North',
      points: [
        { x: 'Q1', y: 10 },
        { x: 'Q2', y: 25 },
      ],
    },
    {
      id: 'south',
      name: 'South',
      points: [
        { x: 'Q1', y: 18 },
        { x: 'Q2', y: 12 },
      ],
    },
  ],
});

const mixedSigns = normalizeBarData([
  { label: 'A', value: 40 },
  { label: 'B', value: -25 },
]);

let host: HTMLElement;

function render(
  series = single,
  options: Partial<RenderBarChartOptions> = {},
): SVGSVGElement {
  renderBarChart(host, {
    series,
    width: 640,
    height: 320,
    theme: DEFAULT_THEME,
    ...options,
  });
  const svg = host.querySelector('svg');
  expect(svg).not.toBeNull();
  return svg as SVGSVGElement;
}

/** Rect geometry recovered from the bar's path — bars are drawn as paths. */
function barBox(path: SVGPathElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const numbers = (path.getAttribute('d') ?? '')
    .match(/-?\d+(\.\d+)?/g)
    ?.map(Number) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  // "M x y H x A r r 0 0 1 x y V y ..." — take every coordinate pair loosely by
  // scanning the command list instead of parsing arcs precisely.
  const commands = (path.getAttribute('d') ?? '').split(/(?=[MHVAZ])/);
  let cx = 0;
  let cy = 0;
  for (const command of commands) {
    const kind = command[0];
    const args = command.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (kind === 'M') {
      [cx, cy] = args;
    } else if (kind === 'H') {
      cx = args[0];
    } else if (kind === 'V') {
      cy = args[0];
    } else if (kind === 'A') {
      cx = args[5];
      cy = args[6];
    } else {
      continue;
    }
    xs.push(cx);
    ys.push(cy);
  }
  expect(numbers.length).toBeGreaterThan(0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function bars(svg: SVGSVGElement): SVGPathElement[] {
  return Array.from(svg.querySelectorAll<SVGPathElement>('path.bar'));
}

/** Series colors, resolved through each bar's own `fill="url(#…)"` gradient. */
function barColors(svg: SVGSVGElement): Set<string> {
  const colors = new Set<string>();
  for (const bar of bars(svg)) {
    const id = /url\(#([^)]+)\)/.exec(bar.getAttribute('fill') ?? '')?.[1];
    if (!id) continue;
    const gradient = svg.querySelector(`#${id}`);
    for (const stop of Array.from(gradient?.querySelectorAll('stop') ?? [])) {
      const color = stop.getAttribute('stop-color');
      if (color) colors.add(color);
    }
  }
  return colors;
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.replaceChildren(host);
});

describe('renderBarChart', () => {
  it('renders one bar per category for a single series', () => {
    const svg = render();
    expect(bars(svg)).toHaveLength(3);
  });

  it('clears the container between renders', () => {
    render();
    render();
    expect(host.querySelectorAll('svg')).toHaveLength(1);
  });

  it('renders nothing without series, size, or categories', () => {
    renderBarChart(host, { series: [], width: 640, height: 320, theme: DEFAULT_THEME });
    expect(host.querySelector('svg')).toBeNull();

    renderBarChart(host, { series: single, width: 0, height: 320, theme: DEFAULT_THEME });
    expect(host.querySelector('svg')).toBeNull();

    renderBarChart(host, {
      series: [{ id: 'empty', points: [] }],
      width: 640,
      height: 320,
      theme: DEFAULT_THEME,
    });
    expect(host.querySelector('svg')).toBeNull();
  });

  it('scales vertical bar height with the value', () => {
    const svg = render();
    const [jan, feb, mar] = bars(svg).map(barBox);
    expect(feb.height).toBeGreaterThan(jan.height);
    expect(jan.height).toBeGreaterThan(mar.height);
    // all sit on the same baseline
    expect(jan.y + jan.height).toBeCloseTo(feb.y + feb.height, 5);
  });

  it('caps the plain vertical bar at 40px and keeps it centred in its band', () => {
    const svg = render(single, { width: 1200 });
    const boxes = bars(svg).map(barBox);
    for (const box of boxes) {
      expect(box.width).toBeLessThanOrEqual(40);
    }
    const gap1 = boxes[1].x - boxes[0].x;
    const gap2 = boxes[2].x - boxes[1].x;
    expect(gap1).toBeCloseTo(gap2, 5);
  });

  it('grows negative bars below the baseline', () => {
    const svg = render(mixedSigns);
    const [pos, neg] = bars(svg).map(barBox);
    const baseline = svg.querySelector('.baseline');
    const baselineY = Number(baseline?.getAttribute('y1'));
    expect(pos.y + pos.height).toBeCloseTo(baselineY, 5);
    expect(neg.y).toBeCloseTo(baselineY, 5);
    expect(neg.y + neg.height).toBeGreaterThan(baselineY);
  });

  it('separates grouped bars within a category', () => {
    const svg = render(multi);
    const boxes = bars(svg).map(barBox);
    expect(boxes).toHaveLength(4);
    // two bars per category, side by side and non-overlapping
    const q1 = boxes.slice(0, 2).sort((a, b) => a.x - b.x);
    expect(q1[0].x + q1[0].width).toBeLessThanOrEqual(q1[1].x);
  });

  it('stacks segments onto a shared column', () => {
    const svg = render(multi, { layout: 'stacked' });
    const boxes = bars(svg).map(barBox);
    expect(boxes).toHaveLength(4);
    const q1 = boxes.filter((b) => b.x === boxes[0].x);
    expect(q1).toHaveLength(2);
    // segments share the column and touch end to end
    const sorted = q1.sort((a, b) => a.y - b.y);
    expect(sorted[0].y + sorted[0].height).toBeCloseTo(sorted[1].y, 5);
  });

  it('lays horizontal bars out from the left baseline', () => {
    const svg = render(single, { orientation: 'horizontal' });
    const boxes = bars(svg).map(barBox);
    expect(boxes).toHaveLength(3);
    const left = boxes[0].x;
    for (const box of boxes) {
      expect(box.x).toBeCloseTo(left, 5);
    }
    // Feb (45) is the longest
    expect(boxes[1].width).toBeGreaterThan(boxes[0].width);
    expect(boxes[0].width).toBeGreaterThan(boxes[2].width);
  });

  it('stacks horizontally when asked', () => {
    const svg = render(multi, { orientation: 'horizontal', layout: 'stacked' });
    const boxes = bars(svg).map(barBox);
    const row = boxes.filter((b) => b.y === boxes[0].y).sort((a, b) => a.x - b.x);
    expect(row).toHaveLength(2);
    expect(row[0].x + row[0].width).toBeCloseTo(row[1].x, 5);
  });

  it('draws the grid and baseline only when asked', () => {
    expect(render().querySelectorAll('.grid line').length).toBeGreaterThan(0);
    expect(render(single, { showGrid: false }).querySelectorAll('.grid line')).toHaveLength(0);
  });

  it('draws the cumulative overlay for single series only', () => {
    const svg = render(single, { cumulativeLine: true });
    expect(svg.querySelectorAll('.cumulative path')).toHaveLength(1);
    expect(svg.querySelectorAll('.cumulative circle')).toHaveLength(3);

    expect(render(multi, { cumulativeLine: true }).querySelectorAll('.cumulative')).toHaveLength(
      0,
    );
  });

  it('labels categories under a vertical chart and beside a horizontal one', () => {
    const vertical = render();
    expect(
      Array.from(vertical.querySelectorAll('.category-axis text')).map((t) => t.textContent),
    ).toEqual(['Jan', 'Feb', 'Mar']);

    const horizontal = render(single, { orientation: 'horizontal' });
    const labels = Array.from(horizontal.querySelectorAll('.category-axis text'));
    expect(labels.map((t) => t.textContent)).toEqual(['Jan', 'Feb', 'Mar']);
    // shared left gutter — start-aligned like line chart
    expect(labels[0].getAttribute('text-anchor')).toBe('start');
  });

  it('keeps the horizontal left gutter compact and truncates long labels', () => {
    const svg = render(
      normalizeBarData([{ label: 'California, Los Angeles', value: 40 }]),
      { orientation: 'horizontal' },
    );
    const label = svg.querySelector('.category-axis text');
    expect(label?.textContent).not.toBe('California, Los Angeles');
    expect(label?.textContent?.endsWith('...')).toBe(true);

    const [bar] = bars(svg).map(barBox);
    // shared LEFT_GUTTER_MARGIN is 56 — not the 180px full-label gutter
    expect(bar.x).toBeLessThan(80);
    expect(bar.x).toBeGreaterThan(40);
  });

  it('formats value ticks compactly', () => {
    const svg = render(
      normalizeBarData([
        { label: 'A', value: 1_000_000 },
        { label: 'B', value: 2_000_000 },
      ]),
    );
    const ticks = Array.from(svg.querySelectorAll('.value-axis text')).map((t) => t.textContent);
    expect(ticks.some((t) => t?.endsWith('M'))).toBe(true);
  });

  it('reveals the hovered category column and reports every series value', () => {
    const hovers: { category: string; values: number[] }[] = [];
    const svg = render(multi, {
      onHover: ({ category, entries }) =>
        hovers.push({ category, values: entries.map((e) => e.value) }),
    });

    const target = svg.querySelector('.hover-target') as SVGRectElement;
    const move = new MouseEvent('mousemove', { clientX: 400, clientY: 100, bubbles: true });
    target.dispatchEvent(move);

    expect(hovers).toHaveLength(1);
    expect(hovers[0].values).toHaveLength(2);
    expect(svg.querySelectorAll('.category-highlight .hover-guide')).toHaveLength(1);

    target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(svg.querySelectorAll('.category-highlight *')).toHaveLength(0);
  });

  it('skips hover wiring when tooltips are off', () => {
    const svg = render(single, { showTooltip: false, onHover: () => undefined });
    expect(svg.querySelector('.hover-target')).toBeNull();
  });

  it('uses theme colors for multi-series bars', () => {
    expect(barColors(render(multi))).toContain(DEFAULT_THEME.primary);
  });

  it('lets an explicit series color beat the theme', () => {
    const colored = normalizeBarData({
      series: [{ id: 'a', color: '#ff0000', points: [{ x: 'A', y: 1 }] }],
    });
    expect(barColors(render(colored))).toEqual(new Set(['#ff0000']));
  });

  it('renders axis unit labels', () => {
    const svg = render(single, { xLabel: 'Month', yLabel: 'USD' });
    const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent);
    expect(texts).toContain('Month');
    expect(texts).toContain('USD');
  });

  it('extends a horizontal chart past the host when rows do not fit', () => {
    const many = normalizeBarData(
      Array.from({ length: 12 }, (_, i) => ({ label: `C${i}`, value: i + 1 })),
    );
    const svg = render(many, { orientation: 'horizontal', height: 120 });
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(120);
  });

  it('pins the horizontal value axis when an overflow container is provided', () => {
    const many = normalizeBarData(
      Array.from({ length: 12 }, (_, i) => ({ label: `C${i}`, value: i + 1 })),
    );
    const axisHost = document.createElement('div');
    const svg = render(many, {
      orientation: 'horizontal',
      height: 120,
      xAxisContainer: axisHost,
    });
    expect(svg.querySelector('.value-axis')).toBeNull();
    expect(axisHost.querySelector('.value-axis')).not.toBeNull();
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(120);
  });

  it('keeps grouped horizontal bars at 24px when overflowing', () => {
    const many = normalizeBarData({
      series: [
        {
          id: 'a',
          points: Array.from({ length: 10 }, (_, i) => ({ x: `C${i}`, y: 10 })),
        },
        {
          id: 'b',
          points: Array.from({ length: 10 }, (_, i) => ({ x: `C${i}`, y: 8 })),
        },
      ],
    });
    const svg = render(many, { orientation: 'horizontal', height: 80 });
    const boxes = bars(svg).map(barBox);
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.height).toBeCloseTo(24, 0);
    }
  });
});
