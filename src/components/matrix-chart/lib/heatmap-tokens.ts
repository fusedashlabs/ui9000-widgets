/** Colours of the heatmap: the matrix chart and the heatmap view of the network graph. */
export interface HeatmapTokens {
  cell: string;
  emptyCell: string;
  negativeCell: string;
  gridLine: string;
  hoverCell: string;
  rowTotal: string;
  columnTotal: string;
  header: string;
  labelFrom: string;
  labelTo: string;
  bar: string;
  text: string;
  headerText: string;
  /** A colour, or `auto` to pick the readable one for each total. */
  totalsText: string;
  title: string;
  caption: string;
  subtitle: string;
  dotRing: string;
  /** Fill opacity of the largest column and row totals. */
  columnTotalsMax: number;
  rowTotalsMax: number;
  cornerIconOpacity: number;
}

export const HEATMAP_LIGHT_TOKENS: HeatmapTokens = {
  cell: '#0098E6',
  emptyCell: 'rgba(0, 153, 255, 0.02)',
  negativeCell: '#DFE1E4',
  gridLine: 'rgba(46, 56, 77, 0.18)',
  hoverCell: '#000000',
  rowTotal: '#C093FA',
  columnTotal: '#A0F1E3',
  header: '#F1F4F7',
  labelFrom: '#FFFFFF',
  labelTo: '#F1F4F7',
  bar: '#8CD1F4',
  text: '#21262E',
  headerText: '#21262E',
  totalsText: '#21262E',
  title: '#21262E',
  caption: '#21262E',
  subtitle: '#5F6877',
  dotRing: 'rgba(33, 38, 46, 0.35)',
  columnTotalsMax: 1,
  rowTotalsMax: 1,
  cornerIconOpacity: 1,
};

export const HEATMAP_DARK_TOKENS: HeatmapTokens = {
  cell: '#0098E6',
  emptyCell: 'rgba(0, 153, 255, 0.03)',
  negativeCell: '#DADAE1',
  gridLine: 'rgba(36, 45, 61, 0.5)',
  hoverCell: '#000000',
  rowTotal: '#C093FA',
  columnTotal: '#A0F1E3',
  header: 'rgba(28, 36, 50, 0.5)',
  labelFrom: 'rgba(28, 36, 50, 0.5)',
  labelTo: '#1C2432',
  bar: '#0098E6',
  text: '#FFFFFF',
  headerText: 'rgba(255, 255, 255, 0.6)',
  totalsText: 'rgba(255, 255, 255, 0.87)',
  title: '#FFFFFF',
  caption: '#F0F0F1',
  subtitle: '#9D9FA1',
  dotRing: 'transparent',
  columnTotalsMax: 0.76,
  rowTotalsMax: 0.92,
  cornerIconOpacity: 0.5,
};

/** Dots in front of the row names when the caller gives no row colours. */
export const HEATMAP_ROW_DOT_COLORS = [
  '#EB5757',
  '#6FCF97',
  '#FB865C',
  '#A0F1E3',
  '#FF5977',
  '#F6DE55',
  '#C093F9',
];

export function heatmapTokens(mode: 'light' | 'dark'): HeatmapTokens {
  return mode === 'dark' ? HEATMAP_DARK_TOKENS : HEATMAP_LIGHT_TOKENS;
}
