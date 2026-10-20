import type { AgentState, ParticleTone } from '../lib/index.js';

/**
 * Agent colours. Dark is sampled from the design board (Tailwind v4 tones:
 * emerald-500 #00bc7d, amber-500 #fe9a00, violet-500 #8e51ff, rose-500
 * #ff2056). Light keeps the hues one step darker so they hold on white.
 * Marks drawn once (rings, diamonds, markers) take their colour from the
 * stylesheet; the many specks take it from here.
 */
export interface PerimeterPalette {
  particles: Record<ParticleTone, string[]>;
  fringe: { grey: string; light: string; rose: string };
  strandException: string;
  glowHealthy: string;
  glowImpure: string;
}

const DARK: PerimeterPalette = {
  particles: {
    healthy: ['#00bc7d', '#00d492', '#009966', '#5ee9b5'],
    degraded: ['#fe9a00', '#ffb900', '#e17100', '#fe9a00'],
    blocked: ['#8e51ff', '#a684ff', '#7f22fe', '#8e51ff'],
    failed: ['#ff2056', '#ff637e', '#ec003f', '#ff2056'],
    idle: ['#a1a1a1', '#737373', '#d4d4d4', '#a1a1a1'],
    core: ['#ffffff', '#d0fae5', '#a4f4cf', '#ecfdf5'],
  },
  fringe: { grey: '#6c6c6c', light: '#c4c4c4', rose: '#c70036' },
  strandException: 'rgba(255, 100, 103, 0.55)',
  glowHealthy: 'rgba(0, 188, 125, 0.11)',
  glowImpure: 'rgba(255, 32, 86, 0.17)',
};

const LIGHT: PerimeterPalette = {
  particles: {
    healthy: ['#009966', '#00bc7d', '#007a55', '#00a76f'],
    degraded: ['#e17100', '#fe9a00', '#bb4d00', '#e17100'],
    blocked: ['#7f22fe', '#8e51ff', '#7008e7', '#7f22fe'],
    failed: ['#ec003f', '#ff2056', '#c70036', '#ec003f'],
    idle: ['#a1a1a1', '#737373', '#d4d4d4', '#a1a1a1'],
    core: ['#006045', '#007a55', '#004f3b', '#006045'],
  },
  fringe: { grey: '#a3a3a3', light: '#737373', rose: '#ec003f' },
  strandException: 'rgba(231, 0, 11, 0.45)',
  glowHealthy: 'rgba(0, 188, 125, 0.08)',
  glowImpure: 'rgba(255, 32, 86, 0.1)',
};

export function perimeterPalette(mode: 'light' | 'dark'): PerimeterPalette {
  return mode === 'dark' ? DARK : LIGHT;
}

/** The legend swatch for each agent state: the first shade of its specks. */
export function stateColor(mode: 'light' | 'dark', state: AgentState): string {
  return perimeterPalette(mode).particles[state][0]!;
}
