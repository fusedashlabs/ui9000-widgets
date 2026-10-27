import type { AssetHealthSection, TroubleState } from './types.js';

const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const SHORT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** `1204` → `1,204`. */
export function formatAssetHealthCount(value: number): string {
  return Number.isFinite(value) ? GROUPED.format(value) : '—';
}

/** `7412` → `7.4K`. */
export function formatShort(value: number): string {
  return Number.isFinite(value) ? SHORT.format(value) : '—';
}

/** 0.41 → `41%`. */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** `9 systems of record`, `1 person`. */
export function assetCount(section: AssetHealthSection, n = section.assets): string {
  return `${formatAssetHealthCount(n)} ${section.unit[n === 1 ? 0 : 1]}`;
}

/** How many of the goal's agents have their work with a section right now. */
export const crewSize = (section: AssetHealthSection) => section.crew.working + section.crew.overBudget + section.crew.held;

/** `14m`, `2h 7m`. */
export function formatAgo(minutes: number): string {
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export const TROUBLE_WORD: Record<TroubleState, string> = { blocked: 'blocked', failed: 'failed', awaiting: 'awaiting', slowed: 'slowed' };

export const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
