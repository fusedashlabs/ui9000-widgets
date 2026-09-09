export type WidgetMode = 'light' | 'dark' | 'auto';

export type WidgetScale = 'compact' | 'default' | 'comfortable';

export interface WidgetTheme {
  /** Primary series / accent color */
  primary: string;
  /** Secondary series color */
  secondary: string;
  /** Chart background */
  background: string;
  /** Axis / grid lines */
  grid: string;
  /** Primary text */
  text: string;
  /** Muted / label text */
  textMuted: string;
  /** Font family for labels */
  fontFamily: string;
}

export interface WidgetContextValue {
  theme: WidgetTheme;
  scale: WidgetScale;
  styleId: string;
  mode: WidgetMode;
}

/** Simple label/value pair used by chat tools and legacy fixtures */
export interface DataPoint {
  label: string;
  value: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

/** FuseDash Qualitative2Colors1 defaults */
export const DEFAULT_THEME: WidgetTheme = {
  primary: '#473DD9',
  secondary: '#36C4A5',
  background: 'transparent',
  grid: '#afb3bb',
  text: '#111827',
  textMuted: '#6c7584',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

export const DEFAULT_CONTEXT: WidgetContextValue = {
  theme: DEFAULT_THEME,
  scale: 'default',
  styleId: 'default',
  mode: 'light',
};

export const SCALE_PADDING: Record<WidgetScale, number> = {
  compact: 8,
  default: 16,
  comfortable: 24,
};
