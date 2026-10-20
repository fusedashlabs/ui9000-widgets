/** Host / Storybook appearance for the asset health stage. */
export type AssetHealthMode = 'light' | 'dark';

/**
 * Ink and chrome for the GoalRings scene. Semantic greens / ambers / reds stay
 * readable on both stages; surfaces invert with the mode.
 *
 * Dark values match the Figma GoalRings sample (`C` / `RGB` in node 278:52371).
 * Light is the same structure on a pale stage for hosts that paint light cards.
 */
export interface AssetHealthPalette {
  ink: string;
  soft: string;
  muted: string;
  dim: string;
  line: string;
  line2: string;
  surface: string;
  floor: string;
  step: string;
  stepTop: string;
  deep: string;
  ok: string;
  okBright: string;
  warn: string;
  coral: string;
  crit: string;
  /** Inner wall rim stroke. */
  rim: string;
  /** Bright core of a problem beam. */
  beamCore: string;
  /** Glow / haze blend — `screen` on dark, `multiply` on light. */
  glowBlend: 'screen' | 'multiply' | 'normal';
  shadowOpacity: number;
  /** Host `.stage` chrome — applied as `--aho-*` from the element. */
  stage: string;
  stageBorder: string;
  empty: string;
  rgb: {
    ok: string;
    warn: string;
    crit: string;
    neutral: string;
  };
}

export const DARK_PALETTE: AssetHealthPalette = {
  ink: '#FAFAFA',
  soft: '#E5E5E5',
  muted: '#A1A1A1',
  dim: '#737373',
  line: '#262626',
  line2: '#333333',
  surface: '#141414',
  floor: '#0B0C0B',
  step: '#121312',
  stepTop: '#0E0F0E',
  deep: '#0A0A0A',
  ok: '#00BC7D',
  okBright: '#5EE9B5',
  warn: '#FE9A00',
  coral: '#FF6467',
  crit: '#FF2056',
  rim: '#525252',
  beamCore: '#FFE4E9',
  glowBlend: 'screen',
  shadowOpacity: 0.7,
  stage: '#0A0A0A',
  stageBorder: '#262626',
  empty: '#A1A1A1',
  rgb: { ok: '0,188,125', warn: '254,154,0', crit: '255,32,86', neutral: '229,229,229' },
};

export const LIGHT_PALETTE: AssetHealthPalette = {
  ink: '#171717',
  soft: '#404040',
  muted: '#737373',
  dim: '#A3A3A3',
  line: '#E5E5E5',
  line2: '#D4D4D4',
  surface: '#FFFFFF',
  floor: '#F4F4F5',
  step: '#EBEBEB',
  stepTop: '#F8F8F8',
  deep: '#FFFFFF',
  ok: '#00A86B',
  okBright: '#059669',
  warn: '#D97706',
  coral: '#E5484D',
  crit: '#E11D48',
  rim: '#A3A3A3',
  beamCore: '#FECDD3',
  glowBlend: 'multiply',
  shadowOpacity: 0.18,
  stage: '#F5F5F5',
  stageBorder: '#E5E5E5',
  empty: '#737373',
  rgb: { ok: '0,168,107', warn: '217,119,6', crit: '225,29,72', neutral: '82,82,82' },
};

export function assetHealthPalette(mode: AssetHealthMode): AssetHealthPalette {
  return mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
