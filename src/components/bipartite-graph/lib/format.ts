import { formatCount } from '../../goals-perimeter/lib/index.js';
import type { BipartiteResource } from './types.js';

/** `31,204 cameras`, `1 person`, `24 assets` for a group whose instances have no name, or null when it gives no count. */
export function formatAssets(resource: BipartiteResource): string | null {
  if (resource.count === null) return null;
  const [one, many] = resource.unit ?? ['asset', 'assets'];
  return `${formatCount(resource.count)} ${resource.count === 1 ? one : many}`;
}

/** 23400 → `23.4k`, 940 → `940`, 1200000 → `1.2M`. */
export function formatShort(value: number): string {
  const trim = (n: number) => (n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''));
  if (value >= 1e6) return `${trim(value / 1e6)}M`;
  if (value >= 1e3) return `${trim(value / 1e3)}k`;
  return formatCount(value);
}
