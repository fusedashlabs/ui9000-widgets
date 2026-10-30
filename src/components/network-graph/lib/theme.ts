/** Colours of the network graph on the canvas of one page theme. */
export interface GraphThemeColors {
  /** Canvas background (CSS). */
  background: string;
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

/** Toggle, zoom buttons and connections list of the Network + Heatmap design. */
export interface GraphControlColors {
  track: string;
  thumb: string;
  text: string;
  textActive: string;
  button: string;
  buttonHover: string;
  buttonIcon: string;
  title: string;
  itemTitle: string;
  itemSub: string;
  itemHover: string;
  shadow: string;
}

export const GRAPH_ACCENT = '#0098E6';

/** Group colours of the network design, given to node types in order of first appearance. */
export const NETWORK_GROUP_PALETTE = [
  '#A0F1E3',
  '#6FCF97',
  '#C093F9',
  '#EB5757',
  '#F5C02A',
  '#FF5977',
  '#FB865C',
];

export const GRAPH_THEME_COLORS: Record<'light' | 'dark', GraphThemeColors> = {
  dark: {
    background: 'linear-gradient(135deg, #141924 0%, #1C2230 50%, #21293A 100%)',
    link: 'rgba(203, 209, 224, 0.22)',
    linkActive: 'rgba(255, 255, 255, 0.9)',
    linkDimmed: 'rgba(203, 209, 224, 0.08)',
    nodeHalo: '#1C2230',
    ringFill: '#1C2230',
    label: 'rgba(255, 255, 255, 0.75)',
    labelMuted: 'rgba(255, 255, 255, 0.3)',
    labelMid: 'rgba(255, 255, 255, 0.55)',
    labelStrong: '#FFFFFF',
    labelActive: '#0098E6',
    selectedRing: '#FFFFFF',
    focusHalo: 'rgba(255, 255, 255, 0.05)',
    dimmedOpacity: 0.35,
    nodeRestOpacity: 0.55,
    decor: 'rgba(140, 152, 180, 0.28)',
    smallNodeRestOpacity: 0.4,
    nodeEdgeDarker: 0,
    nodeEdgeWidth: 0,
  },
  light: {
    background: 'linear-gradient(135deg, #FBFBFE 0%, #F1F2F8 100%)',
    link: 'rgba(46, 33, 86, 0.3)',
    linkActive: 'rgba(46, 33, 86, 0.85)',
    linkDimmed: 'rgba(46, 33, 86, 0.07)',
    nodeHalo: '#F7F7FB',
    ringFill: '#FFFFFF',
    label: 'rgba(33, 38, 46, 0.85)',
    labelMuted: 'rgba(33, 38, 46, 0.62)',
    labelMid: 'rgba(33, 38, 46, 0.78)',
    labelStrong: '#21262E',
    labelActive: '#0077B6',
    selectedRing: '#2E2156',
    focusHalo: 'rgba(46, 33, 86, 0.06)',
    dimmedOpacity: 0.3,
    // The pale group colours need more strength on a light canvas.
    nodeRestOpacity: 0.9,
    decor: 'rgba(46, 33, 86, 0.18)',
    smallNodeRestOpacity: 0.9,
    nodeEdgeDarker: 1,
    nodeEdgeWidth: 1.5,
  },
};

export const GRAPH_CONTROL_COLORS: Record<'light' | 'dark', GraphControlColors> = {
  dark: {
    track: '#242D3F',
    thumb: '#333B4C',
    text: '#A7ABB2',
    textActive: '#FFFFFF',
    button: '#262E40',
    buttonHover: '#323B50',
    buttonIcon: '#FFFFFF',
    title: '#A5A8AE',
    itemTitle: '#F1F1F2',
    itemSub: '#95979E',
    itemHover: 'rgba(255, 255, 255, 0.06)',
    shadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  light: {
    track: '#ECEAF5',
    thumb: '#FFFFFF',
    text: '#5F6877',
    textActive: '#2E2156',
    button: '#FFFFFF',
    buttonHover: '#F1EFF8',
    buttonIcon: '#2E2156',
    title: '#5F6877',
    itemTitle: '#21262E',
    itemSub: '#5F6877',
    itemHover: 'rgba(46, 33, 86, 0.06)',
    shadow: '0 4px 16px rgba(46, 33, 86, 0.12)',
  },
};
