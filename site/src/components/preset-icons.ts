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

/** A filled polygon through points. */
const shape = (points: Array<[number, number]>, opacity = 1) =>
  svg`<path d="${points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')}Z" fill="currentColor" stroke="none" opacity=${opacity} />`;

/** Five regions that tile a small map, for the map icons. */
const REGIONS: Array<Array<[number, number]>> = [
  [[4, 6], [12, 4], [15, 9], [11, 14], [5, 12]],
  [[12, 4], [22, 3], [23, 9], [15, 9]],
  [[15, 9], [23, 9], [24, 16], [17, 19], [11, 14]],
  [[22, 3], [33, 5], [36, 11], [30, 13], [23, 9]],
  [[23, 9], [30, 13], [31, 20], [24, 16]],
];

/** The regions' outlines, the map under bubbles, spikes and markers. */
const regionOutlines = () => REGIONS.map((r) => poly(r, GUIDE, 1, true));

/** A spike: a thin triangle standing on (x, y), `h` tall. */
const spike = (x: number, y: number, h: number, opacity = 1) => shape([[x - 1.3, y], [x, y - h], [x + 1.3, y]], opacity);

/** A map pin: a head over a short stem ending at (x, y). */
const pin = (x: number, y: number) => svg`<path d="M${x} ${y}V${y - 3}" stroke-width="1.25" />${dot(x, y - 4.2, 1.9)}`;

/** A diamond centred on (x, y): a claim. */
const diamond = (x: number, y: number, r = 1.7, opacity = 1) => shape([[x, y - r], [x + r, y], [x, y + r], [x - r, y]], opacity);

const ellipse = (cx: number, cy: number, rx: number, ry: number, opacity = GUIDE) =>
  svg`<ellipse cx=${cx} cy=${cy} rx=${rx} ry=${ry} stroke-width="1" opacity=${opacity} />`;

/** A cloud of `n` dots around (cx, cy), laid on a sunflower spiral so it reads as a crowd, with a ring round it. */
const cloud = (cx: number, cy: number, r: number, n: number, ringed = true) =>
  svg`${ringed ? ring(r + 1.4, GUIDE, cx, cy) : null}${Array.from({ length: n }, (_, i) => {
    const d = r * Math.sqrt((i + 0.5) / n);
    const a = i * 137.5;
    return dot(round(cx + d * Math.sin((a * Math.PI) / 180)), round(cy - d * Math.cos((a * Math.PI) / 180)), 0.7);
  })}`;

/** Nodes as [x, y, r] and links as index pairs: a node-link graph. */
const graph = (nodes: Array<[number, number, number]>, links: Array<[number, number]>) =>
  svg`${links.map(([a, b]) => svg`<path d="M${nodes[a][0]} ${nodes[a][1]}L${nodes[b][0]} ${nodes[b][1]}" stroke-width="1" opacity=${SECOND} />`)}${nodes.map(([x, y, r]) => dot(x, y, r))}`;

/** A goal's tree on the baseline: a trunk that forks into tips, `h` tall. */
const tree = (x: number, h: number, opacity = 1) => {
  const fork = FLOOR - h * 0.55;
  const top = FLOOR - h;
  return svg`<g opacity=${opacity}><path d="M${x} ${FLOOR}V${fork}M${x} ${fork}L${x - h * 0.3} ${top}M${x} ${fork}V${top}M${x} ${fork}L${x + h * 0.3} ${top}" stroke-width="1.25" />${[
    x - h * 0.3,
    x,
    x + h * 0.3,
  ].map((tx) => dot(round(tx), top, 1.1))}</g>`;
};

/** A line from a goal's root up to a resource group at the top, curving as it rises. */
const rise = (x1: number, x2: number, opacity = SECOND) =>
  svg`<path d="M${x1} ${FLOOR}C${x1} 10 ${x2} 10 ${x2} 4" stroke-width="1" opacity=${opacity} />`;

/** A half ring over the baseline round the reasoning graph's root: a stage. */
const halfRing = (r: number) => svg`<path d="M${20 - r} ${FLOOR}A${r} ${r} 0 0 1 ${20 + r} ${FLOOR}" stroke-width="1" opacity=${GUIDE} />`;

/** From the root (20, 21) out to a point at radius `r`, `angle` degrees off vertical. */
const fanPoint = (r: number, angle: number): [number, number] => polar(20, FLOOR, r, angle).split(' ').map(Number) as [number, number];

/** Reasoning paths: each a list of [radius, angle] steps out from the root; the first drawn bold as the active path. */
const fan = (paths: Array<Array<[number, number]>>, activeFirst = true) =>
  svg`${paths.map((steps, i) => {
    const points: Array<[number, number]> = [[20, FLOOR], ...steps.map(([r, a]) => fanPoint(r, a))];
    const active = activeFirst && i === 0;
    return svg`${poly(points, active ? 1 : SECOND, active ? 1.75 : 1)}${points.slice(1).map(([x, y]) => dot(x, y, active ? 1.5 : 1.1, active ? 1 : SECOND))}`;
  })}`;

/** Points of a curve y = f(p) for p from 0 to 1, across the plot, for the impurity icons. */
const curve = (f: (p: number) => number, steps = 12): Array<[number, number]> =>
  Array.from({ length: steps + 1 }, (_, i) => [round(4 + (32 * i) / steps), round(FLOOR - 17 * f(i / steps))]);

const entropy = (p: number) => (p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)));
const gini = (p: number) => 2 * 2 * p * (1 - p) * 0.5;
const misclassification = (p: number) => 2 * Math.min(p, 1 - p) * 0.5;

const dashed = (points: Array<[number, number]>, width = 1.75) =>
  svg`<path d="${points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')}" stroke-width=${width} stroke-dasharray="2.5 2" />`;

/** Bias and variance: bias (dips, then climbs), variance (creeps up) and their total, bold. */
const TRADEOFF = svg`${poly([[4, 13.2], [10, 18.3], [15.6, 19.2], [21.5, 18.8], [24.4, 17.6], [27.3, 15], [30.2, 12.5], [36, 6.5]], SECOND)}${poly(
  [[4, 19.2], [12, 18.3], [20, 17.5], [28, 16.6], [36, 16.1]],
  SECOND,
)}${poly([[4, 13.2], [10, 15.6], [18.5, 16.5], [24.4, 14.7], [27.3, 12.7], [30.2, 8.7], [36, 2.7]], 1, 1.75)}`;

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

  /** Map, Choropleth: countries filled by their value. */
  'map-fill': svg`${REGIONS.map((r, i) => shape(r, [1, 0.45, 0.7, 0.3, 0.85][i]))}`,

  /** Map, Bubbles: circles sized by value on the countries. */
  'map-bubbles': svg`${regionOutlines()}${[[9, 9, 3], [18, 6, 1.8], [19, 14, 3.5], [29, 8, 2.5], [27, 16, 1.6]].map(([x, y, r]) => dot(x, y, r))}`,

  /** Map, Spikes: spikes as tall as the value on the countries. */
  'map-spikes': svg`${regionOutlines()}${[[9, 11, 7], [18, 8, 4], [19, 17, 10], [29, 11, 6], [27, 18, 3]].map(([x, y, h]) => spike(x, y, h))}`,

  /** Map, Markers: a pin on each country. */
  'map-markers': svg`${regionOutlines()}${[[9, 11], [18, 8], [19, 17], [29, 11]].map(([x, y]) => pin(x, y))}`,

  /** Map, Combined layers: filled countries with bubbles and a spike over them. */
  'map-layers': svg`${REGIONS.map((r, i) => shape(r, [0.35, 0.15, 0.25, 0.1, 0.3][i]))}${[[9, 9, 2.5], [29, 8, 2]].map(([x, y, r]) => dot(x, y, r))}${spike(19, 17, 10)}`,

  /** Network, Default: many nodes of different sizes, linked. */
  network: graph(
    [[8, 7, 2.5], [17, 4, 1.6], [20, 13, 3], [30, 6, 2], [33, 16, 2.2], [9, 18, 1.6], [26, 20, 1.4]],
    [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [0, 5], [2, 6], [4, 6]],
  ),

  /** Network, Chat graph: a few nodes and links. */
  'network-small': graph(
    [[9, 8, 3], [21, 5, 2], [16, 17, 2.5], [31, 13, 2.2]],
    [[0, 1], [0, 2], [1, 3], [2, 3]],
  ),

  /** Network, Panels: a graph beside a details column. */
  'network-panels': svg`${graph(
    [[7, 7, 2], [15, 5, 1.5], [14, 14, 2.5], [22, 11, 1.8], [8, 18, 1.4]],
    [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4]],
  )}${[3, 8, 13, 18].map((y, i) => tile(27, y, 9, 3.25, i ? SECOND : 1))}`,

  /** Bipartite, Default: goals on the left, resource groups on the right, joined by ribbons. */
  bipartite: svg`${ribbon(11, 3, 31, 2, 3)}${ribbon(11, 6, 31, 12, 2, FILL * 0.6)}${ribbon(11, 10, 31, 7, 3)}${ribbon(11, 16, 31, 13, 2.5, FILL * 0.6)}${ribbon(
    11,
    18.5,
    31,
    18,
    2.5,
  )}${[[7, 5], [7, 12], [7, 18.5]].map(([x, y]) => svg`${ring(3, GUIDE, x, y)}${dot(x, y, 1.6)}`)}${[2, 7, 12.5, 18].map((y) => tile(31, y, 4, 3.25))}`,

  /** Bipartite, Without a catalog: the same goals against only the groups they name. */
  'bipartite-named': svg`${ribbon(11, 3, 31, 4, 3)}${ribbon(11, 10, 31, 6, 3, FILL * 0.6)}${ribbon(11, 16, 31, 15, 3)}${[[7, 5], [7, 12], [7, 18.5]].map(
    ([x, y]) => svg`${ring(3, GUIDE, x, y)}${dot(x, y, 1.6)}`,
  )}${[4, 15].map((y) => tile(31, y, 4, 5))}`,

  /** Goal burst, Default: the agents in the middle, their calls thrown out as spikes, the held ones bold. */
  burst: svg`${[7, 10.5].map((r) => svg`<circle cx="20" cy="12" r=${r} stroke-width="1" stroke-dasharray="1 1.5" opacity=${GUIDE} />`)}${cloud(20, 12, 2.6, 9, false)}${[
    7, 9, 6, 10.5, 8, 5.5, 9.5, 7, 11, 6.5, 8.5, 6,
  ].map((len, i) => {
    const [x1, y1] = polar(20, 12, 3.6, i * 30 + 8).split(' ');
    const [x2, y2] = polar(20, 12, Math.min(len, 11), i * 30 + 8).split(' ');
    return svg`<path d="M${x1} ${y1}L${x2} ${y2}" stroke-width=${i % 4 === 1 ? 1.75 : 1} opacity=${i % 4 === 1 ? 1 : SECOND} />`;
  })}`,

  /** Goal burst, Nothing held: every call through, all spikes alike. */
  'burst-clear': svg`${[7, 10.5].map((r) => svg`<circle cx="20" cy="12" r=${r} stroke-width="1" stroke-dasharray="1 1.5" opacity=${GUIDE} />`)}${cloud(20, 12, 2.6, 9, false)}${[
    6, 7, 5.5, 6.5, 7, 6, 5.5, 7, 6.5, 6, 7, 5.5,
  ].map((len, i) => {
    const [x1, y1] = polar(20, 12, 3.6, i * 30 + 8).split(' ');
    const [x2, y2] = polar(20, 12, len, i * 30 + 8).split(' ');
    return svg`<path d="M${x1} ${y1}L${x2} ${y2}" stroke-width="1" opacity=${SECOND} />`;
  })}`,

  /** Goal burst, Without kinds: the spikes in a few plain sectors, no time rings. */
  'burst-plain': svg`${cloud(20, 12, 2.6, 9, false)}${[0, 1, 2, 4, 5, 6, 8, 9, 10].map((i) => {
    const [x1, y1] = polar(20, 12, 3.6, i * 30 + 8).split(' ');
    const [x2, y2] = polar(20, 12, [8, 10, 7, 0, 9, 7, 10, 0, 8, 6, 9][i], i * 30 + 8).split(' ');
    return svg`<path d="M${x1} ${y1}L${x2} ${y2}" stroke-width="1" opacity=${i === 5 ? 1 : SECOND} />`;
  })}`,

  /** Goals & insights, Default: the goal over a column of hourly rings, claims on them, a connected goal each side. */
  column: svg`${[9, 13, 17, 21].map((y) => ellipse(20, y, 8, 1.8))}${dot(20, 4, 2.4)}${[[15, 9], [25, 13], [17, 17], [23, 21]].map(([x, y], i) =>
    diamond(x, y, 1.5, i % 2 ? SECOND : 1),
  )}${[[5, 7], [35, 7]].map(([x, y]) => svg`${ring(2.5, 1, x, y)}`)}<path d="M7.5 7.5L15 9M32.5 7.5L25 13" stroke-width="1" opacity=${SECOND} />`,

  /** Goals & insights, One connected goal: one goal beside the column. */
  'column-one': svg`${[9, 13, 17, 21].map((y) => ellipse(20, y, 8, 1.8))}${dot(20, 4, 2.4)}${[[15, 9], [25, 13], [17, 17], [23, 21]].map(([x, y], i) =>
    diamond(x, y, 1.5, i % 2 ? SECOND : 1),
  )}${ring(2.5, 1, 5, 7)}<path d="M7.5 7.5L15 9" stroke-width="1" opacity=${SECOND} />`,

  /** Goals & insights, Without connected goals: the column alone under its goal. */
  'column-alone': svg`${[9, 13, 17, 21].map((y) => ellipse(20, y, 8, 1.8))}${dot(20, 4, 2.4)}${[[15, 9], [25, 13], [17, 17], [23, 21]].map(([x, y], i) =>
    diamond(x, y, 1.5, i % 2 ? SECOND : 1),
  )}`,

  /** Goals dependencies, Default: goal trees on the baseline, the centre one full, lines rising to the groups. */
  trees: svg`${guide()}${[10, 20, 30].map((x) => tile(x - 2, 2, 4, 2.5, SECOND))}${rise(20, 10, 1)}${rise(20, 30)}${rise(8, 20)}${tree(20, 11)}${tree(8, 6, SECOND)}${tree(32, 6, SECOND)}`,

  /** Goals dependencies, Another goal at the centre: a smaller goal full, one line traced. */
  'trees-shifted': svg`${guide()}${[10, 20, 30].map((x) => tile(x - 2, 2, 4, 2.5, SECOND))}${rise(10, 30, 1)}${rise(26, 20)}${tree(10, 10)}${tree(26, 6, SECOND)}${tree(34, 5, SECOND)}`,

  /** Goals dependencies, Fewer goals: three trees and the groups they name. */
  'trees-few': svg`${guide()}${[13, 27].map((x) => tile(x - 2, 2, 4, 2.5, SECOND))}${rise(20, 13, 1)}${rise(20, 27)}${tree(20, 10)}${tree(9, 6, SECOND)}${tree(31, 6, SECOND)}`,

  /** Goals perimeter, Default: goals as clouds of agents, rings round them, lines between. */
  clouds: svg`<path d="M10 8L28 7M10 8L20 17M28 7L20 17" stroke-width="1" opacity=${GUIDE} />${cloud(10, 8, 3.5, 14)}${cloud(28, 7, 3, 11)}${cloud(20, 17, 3, 11)}`,

  /** Goals perimeter, Agent nodes: one goal's agents in a big cloud, its groups on an orbit. */
  'cloud-agents': svg`${cloud(20, 12, 6.5, 34, false)}<circle cx="20" cy="12" r="9.5" stroke-width="1" stroke-dasharray="1 1.5" opacity=${GUIDE} />${[30, 150, 260].map(
    (a) => {
      const [x, y] = polar(20, 12, 9.5, a).split(' ').map(Number);
      return tile(x - 1.5, y - 1.5, 3, 3);
    },
  )}`,

  /** Goals perimeter, Automatic layout: the clouds laid out in a grid. */
  'clouds-auto': svg`${cloud(9, 7, 2.6, 8)}${cloud(31, 7, 2.6, 8)}${cloud(9, 17, 2.6, 8)}${cloud(31, 17, 2.6, 8)}${cloud(20, 12, 2.6, 8)}`,

  /** Reasoning orchestration, Default: paths fanning out from the root across stage rings, the active one bold. */
  fan: svg`${[8, 15].map(halfRing)}${fan([
    [[8, -10], [15, 10], [19, 4]],
    [[8, -55], [15, -60]],
    [[8, 40], [15, 50]],
    [[8, -10], [15, -25]],
  ])}`,

  /** Reasoning orchestration, Extra stages: more stage rings, the paths go deeper. */
  'fan-stages': svg`${[5, 10, 15].map(halfRing)}${fan([
    [[5, 0], [10, -15], [15, 0], [19, 10]],
    [[5, -50], [10, -60], [15, -65]],
    [[5, 45], [10, 55]],
  ])}`,

  /** Reasoning orchestration, Fewer paths: only the active path. */
  'fan-path': svg`${[8, 15].map(halfRing)}${fan([[[8, -10], [15, 10], [19, 4]]])}`,

  /** Reasoning orchestration, Nodes and links only: the tree with no stages drawn. */
  'fan-plain': fan(
    [
      [[9, 0], [16, 0]],
      [[9, -60], [16, -55]],
      [[9, -30], [16, -30]],
      [[9, 30], [16, 30]],
      [[9, 60], [16, 55]],
    ],
    true,
  ),

  /** Partial dependence, Default: faint curves for single rows under a dashed average. */
  ice: svg`${guide()}${line([16, 13, 11, 9, 8, 7], FILL * 1.4)}${line([19, 17, 14, 12, 12, 11], FILL * 1.4)}${line([12, 10, 7, 5, 5, 4], FILL * 1.4)}${line(
    [17, 16, 15, 12, 10, 9],
    FILL * 1.4,
  )}${dashed([[XS[0], 16], [XS[1], 14], [XS[2], 12], [XS[3], 9.5], [XS[4], 8.75], [XS[5], 7.75]])}`,

  /** Bias and variance, Default: bias dipping then climbing, variance creeping up, their total lowest in between. */
  tradeoff: svg`${guide()}${TRADEOFF}`,

  /** Bias and variance, With fit bands: the same curves over an underfit and an overfit band, the optimum marked between. */
  'tradeoff-bands': svg`${tile(5.5, 2, 5.2, 19, FILL)}${tile(26.4, 2, 6.7, 19, FILL)}<path d="M18.5 2V21" stroke-width="1" opacity=${SECOND} />${guide()}${TRADEOFF}`,

  /** Gini and entropy, Default: three impurity curves over the class probability, entropy the tallest. */
  impurity: svg`${guide()}${poly(curve(misclassification), SECOND)}${poly(curve(gini), SECOND)}${poly(curve(entropy), 1, 1.75)}`,

  /** Gini and entropy, With annotations: the curves with the estimate marked and its interval shaded. */
  'impurity-marked': svg`${tile(4 + 32 * 0.54, 2, 32 * 0.16, 19, FILL)}${guide()}${poly(curve(misclassification), SECOND)}${poly(curve(gini), SECOND)}${poly(
    curve(entropy),
    1,
    1.75,
  )}<path d="M${round(4 + 32 * 0.62)} 2V21" stroke-width="1.25" stroke-dasharray="2 1.5" />`,
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
