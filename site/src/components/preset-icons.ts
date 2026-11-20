import { html, svg, type SVGTemplateResult } from 'lit';

/**
 * Preset icons: a small picture of a preset's data, drawn as the chart that shows it, for the preset tiles in
 * Settings. A chart config names one per preset (`icon`); the presets on one page must have different icons.
 *
 * One look for the whole set, from the primitives below:
 * - a 40 × 24 grid, drawn at that size; marks between x 4 and 36, the floor at y 21;
 * - marks filled (bars, heads, dots) or stroked (lines 1.75, stems 1.5), all in the text colour (currentColor);
 * - a second series at 45% opacity, an area's fill at 28%;
 * - guides (axis, zero line, rings) 1 px at 35%, ring tracks at 20%.
 * The icon is decorative: the tile's label names the preset.
 */
const FLOOR = 21;
const SECOND = 0.45;
const FILL = 0.28;
const GUIDE = 0.35;
const TRACK = 0.2;
/** Six positions along the horizontal axis, for lines and areas. */
const XS = [4, 10.4, 16.8, 23.2, 29.6, 36];

const round = (n: number) => Math.round(n * 100) / 100;

/** A point on a circle; the angle in degrees, clockwise from 12 o'clock. */
const polar = (cx: number, cy: number, r: number, angle: number) => {
  const a = (angle * Math.PI) / 180;
  return `${round(cx + r * Math.sin(a))} ${round(cy - r * Math.cos(a))}`;
};

/** The axis under the plot, or the zero line through it. */
const guide = (y = FLOOR + 0.5) => svg`<path d="M3 ${y}h34" stroke-width="1" opacity=${GUIDE} />`;

/** A bar from `from` (the floor or the zero line) to `to`, up or down. */
const bar = (x: number, from: number, to: number, width = 4, opacity = 1) =>
  svg`<rect x=${x} y=${Math.min(from, to)} width=${width} height=${Math.abs(to - from)} rx="1" fill="currentColor" stroke="none" opacity=${opacity} />`;

/** A lollipop: stem from the floor, a round head at the value. */
const stem = (x: number, top: number, opacity = 1) =>
  svg`<g opacity=${opacity}><path d="M${x} ${FLOOR}V${top}" stroke-width="1.5" /><circle cx=${x} cy=${top} r="2.25" fill="currentColor" stroke="none" /></g>`;

const pathThrough = (ys: number[]) => ys.map((y, i) => `${i ? 'L' : 'M'}${XS[i]} ${y}`).join('');

const line = (ys: number[], opacity = 1, dots = false) =>
  svg`<g opacity=${opacity}>
    <path d=${pathThrough(ys)} stroke-width="1.75" />
    ${dots ? ys.map((y, i) => svg`<circle cx=${XS[i]} cy=${y} r="1.6" fill="currentColor" stroke="none" />`) : null}
  </g>`;

/** An area's fill, from the line down to the floor. */
const fill = (ys: number[], opacity = FILL) =>
  svg`<path d="${pathThrough(ys)}L${XS[XS.length - 1]} ${FLOOR}L${XS[0]} ${FLOOR}Z" fill="currentColor" stroke="none" opacity=${opacity} />`;

/** A filled sector from the centre, between two angles. */
const sector = (r: number, from: number, to: number, opacity = 1, cx = 20, cy = 12) =>
  svg`<path d="M${cx} ${cy}L${polar(cx, cy, r, from)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${polar(cx, cy, r, to)}Z" fill="currentColor" stroke="none" opacity=${opacity} />`;

/** A ring's arc from 12 o'clock: clockwise for a positive sweep, counter-clockwise for a negative one. */
const arc = (r: number, sweep: number, cx = 20, cy = 12) =>
  svg`<path d="M${polar(cx, cy, r, 0)}A${r} ${r} 0 ${Math.abs(sweep) > 180 ? 1 : 0} ${sweep > 0 ? 1 : 0} ${polar(cx, cy, r, sweep)}" stroke-width="2.25" />`;

/** A thick ring segment between two angles, square-ended (a donut slice). */
const band = (r: number, from: number, to: number, opacity = 1, width = 4.5, cx = 20, cy = 12) =>
  svg`<path d="M${polar(cx, cy, r, from)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${polar(cx, cy, r, to)}" stroke-width=${width} stroke-linecap="butt" opacity=${opacity} />`;

const ring = (r: number, opacity = GUIDE, cx = 20, cy = 12) =>
  svg`<circle cx=${cx} cy=${cy} r=${r} stroke-width="1" opacity=${opacity} />`;

/** A filled rectangle (tiles, cells, segments). */
const tile = (x: number, y: number, w: number, h: number, opacity = 1) =>
  svg`<rect x=${x} y=${y} width=${w} height=${h} rx="0.75" fill="currentColor" stroke="none" opacity=${opacity} />`;

const dot = (cx: number, cy: number, r = 1.6, opacity = 1) =>
  svg`<circle cx=${cx} cy=${cy} r=${r} fill="currentColor" stroke="none" opacity=${opacity} />`;

/** A vertical box and whiskers: low and high whisker ends, the box from q1 to q3 (y grows down). */
const boxWhisker = (x: number, hi: number, q3: number, q1: number, lo: number, width = 4, opacity = 1) =>
  svg`<g opacity=${opacity}><path d="M${x + width / 2} ${hi}V${q3}M${x + width / 2} ${q1}V${lo}" stroke-width="1" /><rect x=${x} y=${q3} width=${width} height=${q1 - q3} rx="0.75" fill="currentColor" stroke="none" /></g>`;

/** A polyline through points, stroked. */
const poly = (points: Array<[number, number]>, opacity = 1, width = 1.5, closed = false) =>
  svg`<path d="${points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')}${closed ? 'Z' : ''}" stroke-width=${width} opacity=${opacity} />`;

/** A ribbon between two columns of nodes, from (x1, y1) to (x2, y2), `h` thick. */
const ribbon = (x1: number, y1: number, x2: number, y2: number, h: number, opacity = FILL) => {
  const m = (x1 + x2) / 2;
  return svg`<path d="M${x1} ${y1}C${m} ${y1} ${m} ${y2} ${x2} ${y2}V${y2 + h}C${m} ${y2 + h} ${m} ${y1 + h} ${x1} ${y1 + h}Z" fill="currentColor" stroke="none" opacity=${opacity} />`;
};

/** Points of a regular polygon around (20, 12), one radius per vertex, from 12 o'clock. */
const radarPoints = (radii: number[]): Array<[number, number]> =>
  radii.map((r, i) => polar(20, 12, r, (i * 360) / radii.length).split(' ').map(Number) as [number, number]);

/** Pairs of bars or stems: the first series, then the second at its right. */
const GROUPS = [5, 17, 29];

const ICONS = {
  /** Bar, Single series: five bars of one series. */
  bars: svg`${guide()}${[9, 14, 7, 16, 11].map((h, i) => bar(4 + i * 7, FLOOR, FLOOR - h))}`,

  /** Bar, Multiple series: three categories, two series side by side. */
  'bars-grouped': svg`${guide()}${GROUPS.map(
    (x, i) => svg`${bar(x, FLOOR, FLOOR - [12, 8, 15][i], 3)}${bar(x + 4, FLOOR, FLOOR - [7, 13, 10][i], 3, SECOND)}`,
  )}`,

  /** Bar, Positive and negative: bars up and down from a zero line. */
  'bars-diverging': svg`${guide(12.5)}${[7, -6, 9, -4, 5].map((v, i) => (v > 0 ? bar(4 + i * 7, 12, 12 - v) : bar(4 + i * 7, 13, 13 - v)))}`,

  /** Lollipop, Single series: five stems of one series. */
  lollipop: svg`${guide()}${[10, 14, 7, 16, 12].map((h, i) => stem(6 + i * 7, FLOOR - h))}`,

  /** Lollipop, Multiple series: three categories, two stems each. */
  'lollipop-grouped': svg`${guide()}${GROUPS.map(
    (x, i) => svg`${stem(x + 1.5, FLOOR - [12, 9, 15][i])}${stem(x + 6.5, FLOOR - [8, 14, 10][i], SECOND)}`,
  )}`,

  /** Area, Single series: one filled area. */
  area: svg`${guide()}${fill([15, 11, 13, 7, 9, 5])}${line([15, 11, 13, 7, 9, 5])}`,

  /** Area, Multiple series: two areas from the floor, the lower one over the higher. */
  'area-overlap': svg`${guide()}${fill([13, 8, 11, 6, 9, 5])}${fill([17, 14, 16, 12, 15, 11])}${line([13, 8, 11, 6, 9, 5])}${line(
    [17, 14, 16, 12, 15, 11],
    SECOND,
  )}`,

  /** Line, Single series: one line with its points. */
  line: svg`${guide()}${line([16, 10, 13, 6, 9, 4], 1, true)}`,

  /** Line, Multiple series: two lines with their points. */
  lines: svg`${guide()}${line([15, 10, 12, 6, 8, 4], 1, true)}${line([19, 15, 17, 13, 15, 10], SECOND, true)}`,

  /** Polar area, By category: six equal-angle sectors of different radius. */
  polar: svg`${ring(11)}${[10, 6.5, 8.5, 5, 9, 7].map((r, i) => sector(r, i * 60 + 2, i * 60 + 58))}`,

  /** Polar area, By category and group: four sectors, each split into two groups. */
  'polar-grouped': svg`${ring(11)}${[
    [10, 7],
    [6, 9],
    [8.5, 5],
    [9.5, 6],
  ].map(([a, b], i) => svg`${sector(a, i * 90 + 2, i * 90 + 44)}${sector(b, i * 90 + 46, i * 90 + 88, SECOND)}`)}`,

  /** Radial bar, Positive values: three rings, each arc clockwise from the top. */
  radial: svg`${[10, 7, 4].map((r) => ring(r, TRACK))}${arc(10, 280)}${arc(7, 190)}${arc(4, 110)}`,

  /** Radial bar, Positive and negative: arcs both ways from a zero line at the top. */
  'radial-diverging': svg`${[10, 7, 4].map((r) => ring(r, TRACK))}<path d="M20 0.5V9" stroke-width="1" opacity=${GUIDE} />${arc(
    10,
    130,
  )}${arc(7, -100)}${arc(4, 160)}`,

  /** Pie, By category: a full disc of four shares (40, 25, 20, 15%), a hairline gap between them. */
  pie: svg`${[
    [0, 144],
    [144, 234],
    [234, 306],
    [306, 360],
  ].map(([from, to], i) => sector(10.5, from + 2, to - 2, i % 2 ? SECOND : 1))}`,

  /** Donut, By category: a ring of four shares (40, 25, 20, 15%), a gap between them. */
  donut: svg`${[
    [0, 144],
    [144, 234],
    [234, 306],
    [306, 360],
  ].map(([from, to], i) => band(8.5, from + 4, to - 4, i % 2 ? SECOND : 1))}`,

  /** Treemap, By category: four tiles whose areas shrink from the left. */
  treemap: svg`${tile(4, 2, 17, 20)}${tile(22, 2, 14, 11, SECOND)}${tile(22, 14, 7, 8)}${tile(30, 14, 6, 8, SECOND)}`,

  /** Treemap, By category and group: two groups, each split into tiles. */
  'treemap-grouped': svg`${tile(4, 2, 10, 20)}${tile(15, 2, 4, 11, SECOND)}${tile(15, 14, 4, 8, SECOND)}${tile(21, 2, 15, 9)}${tile(
    21,
    12,
    8,
    10,
    SECOND,
  )}${tile(30, 12, 6, 10, SECOND)}`,

  /** Band utilization: three rows, each split into three segments that add up to the full width. */
  bands: svg`${[
    [9, 14],
    [6, 18],
    [12, 9],
  ].map(([a, b], i) => svg`${tile(4, 3 + i * 7, a, 5)}${tile(5 + a, 3 + i * 7, b, 5, SECOND)}${tile(6 + a + b, 3 + i * 7, 30 - a - b, 5, FILL)}`)}`,

  /** Step line, KS plot: one cumulative staircase rising from the floor. */
  steps: svg`${guide()}${poly([[4, 21], [9, 21], [9, 17], [15, 17], [15, 11], [21, 11], [21, 8], [28, 8], [28, 4], [36, 4]], 1, 1.75)}`,

  /** Step line, ROC: two staircases above a diagonal guide. */
  roc: svg`<path d="M4 21L36 3" stroke-width="1" opacity=${GUIDE} />${poly(
    [[4, 21], [4, 12], [11, 12], [11, 7], [20, 7], [20, 4], [36, 4]],
    1,
    1.75,
  )}${poly([[4, 21], [7, 21], [7, 16], [16, 16], [16, 11], [27, 11], [27, 6], [36, 6]], SECOND, 1.75)}`,

  /** Scatter sparkline: dots along a rising trend, no axes. */
  'spark-dots': svg`${[16, 13, 15, 10, 12, 8, 9, 5].map((y, i) => dot(4 + i * 4.57, y + 2, 1.5))}`,

  /** Histogram, Single: touching bins that rise and fall. */
  histogram: svg`${guide()}${[4, 9, 15, 17, 12, 7, 3].map((h, i) => bar(4 + i * 4.57, FLOOR, FLOOR - h, 4.57))}`,

  /** Histogram, Grouped: two sets of touching bins, the second behind at 45%. */
  'histogram-grouped': svg`${guide()}${[6, 11, 14, 10, 6, 3, 1].map((h, i) => bar(4 + i * 4.57, FLOOR, FLOOR - h, 4.57, SECOND))}${[
    2, 5, 9, 15, 12, 6, 3,
  ].map((h, i) => bar(4 + i * 4.57, FLOOR, FLOOR - h, 3))}`,

  /** Box plot, Single: four boxes with whiskers. */
  boxes: svg`${guide()}${[
    [4, 9, 14, 19],
    [7, 11, 15, 20],
    [2, 6, 10, 15],
    [6, 10, 16, 19],
  ].map(([hi, q3, q1, lo], i) => boxWhisker(5 + i * 8, hi, q3, q1, lo, 5))}`,

  /** Box plot, Grouped: pairs of boxes, the second at 45%. */
  'boxes-grouped': svg`${guide()}${GROUPS.map(
    (x, i) =>
      svg`${boxWhisker(x, [4, 6, 3][i], [9, 10, 7][i], [14, 15, 12][i], [19, 20, 17][i], 3.5)}${boxWhisker(x + 4.5, [7, 3, 6][i], [11, 8, 10][i], [16, 13, 15][i], [20, 18, 19][i], 3.5, SECOND)}`,
  )}`,

  /** Violin: three mirrored density shapes. */
  violin: svg`${[8, 20, 32].map(
    (x, i) =>
      svg`<path d="M${x} 2C${x + [2, 1, 3][i]} 6 ${x + [5, 4, 4][i]} 9 ${x + [4, 5, 3][i]} 13S${x + 1} 19 ${x} 22C${x - 1} 19 ${x - [4, 5, 3][i]} 17 ${x - [4, 5, 3][i]} 13S${x - [2, 1, 3][i]} 6 ${x} 2Z" fill="currentColor" stroke="none" opacity=${i === 1 ? SECOND : 1} />`,
  )}`,

  /** Scatter: dots of two groups spread along a rising cloud. */
  dots: svg`${guide()}${[
    [6, 17], [9, 15], [12, 16], [15, 12], [19, 13], [23, 9], [27, 10], [31, 6], [34, 5],
  ].map(([x, y]) => dot(x, y))}${[[8, 11], [14, 8], [21, 5], [26, 15], [33, 12]].map(([x, y]) => dot(x, y, 1.6, SECOND))}`,

  /** Bubble, Single: circles of different sizes on two axes. */
  bubbles: svg`${guide()}${[
    [8, 15, 3], [15, 10, 4.5], [24, 13, 2.5], [31, 6, 4],
  ].map(([x, y, r]) => dot(x, y, r))}`,

  /** Bubble, Grouped: circles of two groups, the second at 45%. */
  'bubbles-grouped': svg`${guide()}${[
    [8, 15, 3], [22, 12, 4], [32, 6, 3],
  ].map(([x, y, r]) => dot(x, y, r))}${[[14, 7, 3.5], [28, 16, 2.5]].map(([x, y, r]) => dot(x, y, r, SECOND))}`,

  /** Matrix, Large grid: a dense grid of cells, the shade is the value. */
  'matrix-dense': svg`${Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => tile(4 + col * 4, 3 + row * 4.75, 3.25, 4, [1, 0.6, 0.3, 0.45, 0.8, 0.25, 0.55, 0.9][(col + row * 3) % 8])),
  )}`,

  /** Matrix, Small grid: a few large cells, some empty. */
  matrix: svg`${Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      const v = [1, 0.5, 0, 0.75, 0.3, 0, 0.9, 0.4, 0, 0.6, 0.25, 0, 0.8, 0.5, 0][col + row * 5];
      return v ? tile(4 + col * 6.5, 3 + row * 6.5, 5.5, 5.5, v) : svg`<rect x=${4 + col * 6.5 + 0.5} y=${3.5 + row * 6.5} width="4.5" height="4.5" rx="0.75" stroke-width="1" opacity=${GUIDE} />`;
    }),
  )}`,

  /** Punchcard, Single: one row of circles, the size is the value. */
  punchcard: svg`<path d="M3 12h34" stroke-width="1" opacity=${GUIDE} />${[2, 3.5, 2.5, 4.5, 3, 1.5].map((r, i) => dot(6 + i * 5.6, 12, r))}`,

  /** Punchcard, Grouped: a grid of circles, the size is the value. */
  'punchcard-grouped': svg`${Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 6 }, (_, col) => dot(6 + col * 5.6, 5 + row * 7, [1, 2, 2.75, 1.5, 2.5, 0.75, 2.25, 1.25, 3, 2, 1, 2.5, 0.75, 2.75, 1.75, 2.5, 1.5, 1][col + row * 6])),
  )}`,

  /** Radar, Single: one filled polygon over a hexagon grid. */
  radar: svg`${poly(radarPoints([11, 11, 11, 11, 11, 11]), GUIDE, 1, true)}${poly(radarPoints([10, 6, 8, 5, 9, 7]), 1, 1.5, true)}`,

  /** Radar, Grouped: two polygons over a hexagon grid. */
  'radar-grouped': svg`${poly(radarPoints([11, 11, 11, 11, 11, 11]), GUIDE, 1, true)}${poly(radarPoints([6, 10, 5, 9, 6, 8]), SECOND, 1.5, true)}${poly(
    radarPoints([10, 6, 8, 5, 9, 7]),
    1,
    1.5,
    true,
  )}`,

  /** Parallel coordinates: four vertical axes crossed by three lines. */
  parallel: svg`${[5, 15, 25, 35].map((x) => svg`<path d="M${x} 2V22" stroke-width="1" opacity=${GUIDE} />`)}${poly([[5, 5], [15, 14], [25, 7], [35, 18]])}${poly(
    [[5, 18], [15, 6], [25, 16], [35, 5]],
    SECOND,
  )}${poly([[5, 11], [15, 19], [25, 4], [35, 11]], SECOND)}`,

  /** Flow sankey, Stages: nodes in three stages joined by ribbons. */
  flow: svg`${ribbon(6, 3, 18, 2, 7)}${ribbon(6, 10, 18, 13, 9)}${ribbon(20, 2, 32, 4, 7)}${ribbon(20, 11, 32, 14, 9, FILL * 0.6)}${[
    [4, 3, 16], [18, 2, 9], [18, 13, 9], [32, 4, 7], [32, 14, 7],
  ].map(([x, y, h]) => tile(x, y, 2.5, h))}`,

  /** Flow sankey, Links only: two levels of nodes joined by ribbons, no stage columns. */
  'flow-links': svg`${ribbon(9, 4, 30, 3, 10)}${ribbon(9, 15, 30, 16, 5)}${[
    [7, 4, 10], [7, 15, 5], [30, 3, 10], [30, 16, 5],
  ].map(([x, y, h]) => tile(x, y, 2.5, h))}`,

  /** Sankey: sources on the left fanning out to targets on the right. */
  sankey: svg`${ribbon(6, 2, 32, 2, 5)}${ribbon(6, 7, 32, 13, 4)}${ribbon(6, 13, 32, 8, 4, SECOND)}${ribbon(6, 17, 32, 18, 4, SECOND)}${[
    [4, 2, 9], [4, 13, 8], [32, 2, 10], [32, 13, 9],
  ].map(([x, y, h]) => tile(x, y, 2.5, h))}`,

  /** Waterfall: a starting total, steps up and down floating on it, and an end total. */
  waterfall: svg`${guide()}${bar(4, FLOOR, 9, 4)}${bar(10, 9, 5, 4, SECOND)}${bar(16, 5, 12, 4, SECOND)}${bar(22, 12, 8, 4, SECOND)}${bar(28, 8, 14, 4, SECOND)}${bar(
    33,
    FLOOR,
    14,
    3.5,
  )}`,

  /** Area and bars: a filled line over grouped bars on one axis. */
  'area-bars': svg`${guide()}${fill([10, 7, 9, 4, 6, 3], FILL * 0.6)}${GROUPS.map(
    (x, i) => svg`${bar(x, FLOOR, FLOOR - [8, 11, 7][i], 3)}${bar(x + 4, FLOOR, FLOOR - [5, 8, 10][i], 3, SECOND)}`,
  )}${line([10, 7, 9, 4, 6, 3])}`,
} satisfies Record<string, SVGTemplateResult>;

export type PresetIconId = keyof typeof ICONS;

export const PRESET_ICON_IDS = Object.keys(ICONS) as PresetIconId[];

export function presetIcon(id: PresetIconId) {
  return html`<svg
    class="preset-icon"
    viewBox="0 0 40 24"
    width="40"
    height="24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    ${ICONS[id]}
  </svg>`;
}
