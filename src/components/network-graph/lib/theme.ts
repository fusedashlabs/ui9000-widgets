import { lightTheme } from '@fuselab-creative/design-system';

import { fdColors, hexWithAlpha, seriesColor } from '../../../utils/fusedash-visual.js';

type Mode = 'light' | 'dark';

/** SVG paints the host's surface directly; other ink comes from `fdColors`. */
const SURFACE = 'var(--ui9000-color-surface, #ffffff)';

/** Colours of the network graph for one page theme and style. */
export interface GraphThemeColors {
  /** First series colour of the page style: selection and the focus view. */
  accent: string;
  link: string;
  /** Links of the selected node. */
  linkActive: string;
  /** Other links while a node is selected. */
  linkDimmed: string;
  /** Ring drawn around every node: it separates overlapping nodes. */
  nodeHalo: string;
  /** Fill inside the small, ring-shaped nodes. */
  ringFill: string;
  label: string;
  labelMuted: string;
  /** Names of middle-sized nodes. */
  labelMid: string;
  labelStrong: string;
  /** Name of the selected node. */
  labelActive: string;
  /** Ring around the selected node. */
  selectedRing: string;
  /** Large soft circle behind the selected node. */
  focusHalo: string;
  /** Opacity of nodes that are not related to the selected one. */
  dimmedOpacity: number;
  /** Node colour strength at rest; hover, selection and neighbours are full. */
  nodeRestOpacity: number;
  /** Dashed circles, ticks and diagonals behind the graph. */
  decor: string;
  /** Colour strength of the smallest nodes at rest. */
  smallNodeRestOpacity: number;
  /** Node edges in the node colour made this much darker; 0 keeps the node colour. */
  nodeEdgeDarker: number;
  /** Edge width of the filled nodes; 0 draws none. */
  nodeEdgeWidth: number;
}

/** Call inside `withSeriesMode`, so the accent follows the page style. */
export function graphThemeColors(mode: Mode): GraphThemeColors {
  const fd = fdColors(mode);
  const dark = mode === 'dark';
  const accent = seriesColor(0, undefined, mode);
  return {
    accent,
    link: hexWithAlpha(fd.axisLabelFill, 40),
    linkActive: fd.networkLabelText,
    linkDimmed: hexWithAlpha(fd.axisLabelFill, 12),
    nodeHalo: SURFACE,
    ringFill: SURFACE,
    label: fd.networkLabelText,
    labelMuted: fd.axisLabelFill,
    labelMid: fd.axisLabelFill,
    labelStrong: fd.networkLabelText,
    labelActive: accent,
    selectedRing: fd.networkLabelText,
    focusHalo: hexWithAlpha(fd.axisLabelFill, 12),
    dimmedOpacity: dark ? 0.35 : 0.3,
    nodeRestOpacity: dark ? 0.85 : 0.9,
    decor: hexWithAlpha(fd.gridStroke, dark ? 60 : 40),
    smallNodeRestOpacity: dark ? 0.75 : 0.9,
    nodeEdgeDarker: dark ? 0 : 1,
    nodeEdgeWidth: dark ? 0 : 1.5,
  };
}

/** Colours of the metric charts. */
export function graphChartColors(mode: Mode): {
  line: string;
  point: string;
  grid: string;
  text: string;
} {
  const fd = fdColors(mode);
  return {
    line: seriesColor(0, undefined, mode),
    point: SURFACE,
    grid: hexWithAlpha(fd.gridStroke, 40),
    text: fd.axisLabelFill,
  };
}

/** Colours of the focus view. */
export function graphFocusColors(mode: Mode): {
  accent: string;
  canvas: string;
  curve: string;
  dotted: string;
  halo: string;
  haloStroke: string;
  ring: string;
  anchor: string;
  title: string;
  label: string;
  labelStrong: string;
} {
  const fd = fdColors(mode);
  return {
    accent: seriesColor(0, undefined, mode),
    canvas: SURFACE,
    curve: hexWithAlpha(fd.axisLabelFill, 40),
    dotted: hexWithAlpha(fd.axisLabelFill, 32),
    halo: hexWithAlpha(fd.axisLabelFill, 8),
    haloStroke: hexWithAlpha(fd.gridStroke, 30),
    ring: hexWithAlpha(fd.gridStroke, 50),
    anchor: fd.axisLabelFill,
    title: fd.axisLabelFill,
    label: fd.axisLabelFill,
    labelStrong: fd.networkLabelText,
  };
}

/** The design system ships these colours but leaves them out of its types. */
type SystemColors = Record<
  'success' | 'error',
  { text: { default: string; inverted: string } }
>;

/** Rise and fall of a trend, from the design system's status colours. */
export function trendColors(mode: Mode): { up: string; down: string } {
  const { success, error } = (lightTheme.colors as unknown as { system: SystemColors }).system;
  const shade = mode === 'dark' ? 'inverted' : 'default';
  return { up: success.text[shade], down: error.text[shade] };
}
