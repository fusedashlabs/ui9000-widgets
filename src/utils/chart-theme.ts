/**
 * Chart appearance — the only file to edit when series colors change.
 *
 * Palettes mirror the client page styles (`default`, `palette1` … `palette4`):
 * Qualitative 2 / 4 / 12 and SequentialColors1. Charts read them through
 * `pickQualitativePalette`, `seriesColor`, and `sequentialColors`.
 *
 * Text comes from `@fuselab-creative/design-system` (`fontFamilies`, `typography`),
 * the same tokens the client `Typography` component renders. Shell and plot
 * text read the CSS variables set from `CHART_TYPE`.
 */

import { fontFamilies, typography } from '@fuselab-creative/design-system';
import { type ChartStyleId } from '../context/chart-style.js';

export { CHART_STYLE_IDS, parseChartStyleId, type ChartStyleId } from '../context/chart-style.js';

/** Design-system `fontFamilies.body`. */
export const FONT_FAMILY = fontFamilies.body;

const bodySm = typography.body.sm.regular;
const bodyXs = typography.body.xs.regular;
const bodyMd = typography.body.md.regular;

function px(value: string): number {
  return Number.parseFloat(value);
}

/** `letter-spacing` accepts lengths. Design-system tracking is a percent of the font size. */
function cssTracking(value: string): string {
  const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(value.trim());
  if (!percent) return value;
  return `${Number(percent[1]) / 100}em`;
}

/**
 * Which design-system body style each piece of chart text uses.
 * Title matches the client `WidgetHeaderTitle` (`typography.body.sm.regular`).
 * Axis, legend and tooltip rows use that same style. Subtitles are
 * `typography.body.xs.regular`. Tooltip headings and empty states are
 * `typography.body.md.regular`.
 */
export const CHART_TYPE = {
  fontFamily: FONT_FAMILY,
  /** Axis ticks, legends, plot labels — body/sm */
  axis: px(bodySm.fontSize),
  axisWeight: Number(bodySm.fontWeight),
  axisLine: px(bodySm.lineHeight),
  /** Tooltip rows and secondary labels — body/sm */
  label: px(bodySm.fontSize),
  labelWeight: Number(bodySm.fontWeight),
  labelLine: px(bodySm.lineHeight),
  /** Widget title — body/sm, same as client Typography */
  title: px(bodySm.fontSize),
  titleWeight: Number(bodySm.fontWeight),
  titleLine: px(bodySm.lineHeight),
  /** Subtitle — body/xs */
  subtitle: px(bodyXs.fontSize),
  subtitleWeight: Number(bodyXs.fontWeight),
  subtitleLine: px(bodyXs.lineHeight),
  subtitleTracking: cssTracking(bodyXs.letterSpacing),
  /** Tooltip heading — body/md */
  heading: px(bodyMd.fontSize),
  headingWeight: Number(bodyMd.fontWeight),
  headingLine: px(bodyMd.lineHeight),
  /** Empty state — body/md */
  empty: bodyMd.fontSize,
  emptyWeight: Number(bodyMd.fontWeight),
  emptyLine: px(bodyMd.lineHeight),
} as const;

type QualitativeSet = { q2: string[]; q4: string[]; q12: string[] };

/** Client `Qualitative2Colors1`, `Qualitative4Colors`, `Qualitative12Colors`. */
export const QUALITATIVE: Record<ChartStyleId, QualitativeSet> = {
  default: {
    q2: ['#473DD9', '#36C4A5'],
    q4: ['#473DD9', '#36C4A5', '#FF8C47', '#56546D'],
    q12: [
      '#473DD9',
      '#938CFF',
      '#36C4A5',
      '#ADF4E5',
      '#BDBCC8',
      '#56546D',
      '#FF8C47',
      '#FFCEB0',
      '#FF4781',
      '#FFB0C9',
      '#47B0FF',
      '#B0DDFF',
    ],
  },
  palette1: {
    q2: ['#2039B4', '#88B802'],
    q4: ['#2039B4', '#88B802', '#D2382D', '#56546D'],
    q12: [
      '#2039B4',
      '#6C7ED9',
      '#88B802',
      '#CEE78B',
      '#BDBCC8',
      '#56546D',
      '#D2382D',
      '#EAA39E',
      '#92BAD4',
      '#CDDFEB',
      '#AAAA97',
      '#D8D8CF',
    ],
  },
  palette2: {
    q2: ['#852738', '#DE6A1C'],
    q4: ['#852738', '#19B2D9', '#DE6A1C', '#636874'],
    q12: [
      '#852738',
      '#C95F72',
      '#19B2D9',
      '#66D7F4',
      '#DE6A1C',
      '#F8A269',
      '#5942CB',
      '#816DE5',
      '#969AA2',
      '#636874',
      '#E866E4',
      '#FF9FFC',
    ],
  },
  palette3: {
    q2: ['#4B625C', '#C29E1D'],
    q4: ['#4B625C', '#94BC26', '#C29E1D', '#CABB9F'],
    q12: [
      '#4B625C',
      '#6A8A82',
      '#94BC26',
      '#B5D955',
      '#C29E1D',
      '#DDBE4D',
      '#636874',
      '#969AA2',
      '#60838B',
      '#87B8C4',
      '#7D6D4F',
      '#B0996F',
    ],
  },
  palette4: {
    q2: ['#3D9E6E', '#D58000'],
    q4: ['#55B685', '#8B74DC', '#E77975', '#338BCC'],
    q12: [
      '#77C59D',
      '#506387',
      '#EC9491',
      '#A45000',
      '#B5A3F5',
      '#267FC1',
      '#309263',
      '#2C3F64',
      '#C25553',
      '#671400',
      '#725CC5',
      '#025B9E',
    ],
  },
};

/** Client `SequentialColors1` — low → high, one ramp per page style. */
export const SEQUENTIAL: Record<ChartStyleId, string[]> = {
  default: ['#D6D3FF', '#B5B0FF', '#938CFF', '#7369FF', '#5448FF', '#473DD9', '#3C33B5'],
  palette1: ['#BBC3ED', '#9AA7E5', '#6C7ED9', '#4F65D1', '#233FC6', '#2039B4', '#192D8D'],
  palette2: ['#EAC1C8', '#E0A3AE', '#D27989', '#C95F72', '#BC374F', '#AB3248', '#852738'],
  palette3: ['#D1DBD8', '#BAC9C6', '#9BB1AB', '#88A19B', '#6A8A82', '#607E76', '#4B625C'],
  palette4: ['#77C59D', '#55B685', '#3D9E6E', '#309263', '#248657', '#187A4C', '#0C6E40'],
};

/** Same rule as the client: ≤2 → Q2, 3–4 → Q4, >4 → Q12. */
export function qualitativePalette(styleId: ChartStyleId, count: number): string[] {
  const set = QUALITATIVE[styleId] ?? QUALITATIVE.default;
  if (count > 4) return set.q12;
  if (count > 2) return set.q4;
  return set.q2;
}

export function sequentialPalette(styleId: ChartStyleId): string[] {
  return SEQUENTIAL[styleId] ?? SEQUENTIAL.default;
}
