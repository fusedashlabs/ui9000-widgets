import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

import { FALLBACK_FILL } from './constants.js';
import type { ColorRange } from './types.js';

export function hexToRgba(hex: string, alpha = 1): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (clean.length === 8) clean = clean.slice(0, 6);
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return hex.startsWith('rgb') ? hex : FALLBACK_FILL;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Mirrors client `darkenColor` — blend hex toward black (amount 0–1). */
export function darkenColor(hex: string, amount: number): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return hex;
  const t = Math.max(0, Math.min(1, amount));
  const r = Math.round(parseInt(clean.slice(0, 2), 16) * (1 - t));
  const g = Math.round(parseInt(clean.slice(2, 4), 16) * (1 - t));
  const b = Math.round(parseInt(clean.slice(4, 6), 16) * (1 - t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

export function formatMapValue(value: number): string {
  return formatCompactNumber(value);
}

export function formatRangeLabel(range: ColorRange): string {
  return `${formatCompactNumber(range.start)}–${formatCompactNumber(range.end)}`;
}

export function numericValue(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}
