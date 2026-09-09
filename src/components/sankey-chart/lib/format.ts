export { formatCapitalizedWords } from '../../../utils/format-text.js';
import { formatFuseNumber } from '../../../utils/format-text.js';

/** Mirrors client `formatNumber` (Intl, up to 3 decimals). */
export function formatSankeyValue(value: number): string {
  return formatFuseNumber(value);
}

/** FuseDash cuts node labels at 7 characters (and only then offers a tooltip). */
export const NODE_LABEL_MAX = 7;

export function truncateNodeLabel(text: string, max = NODE_LABEL_MAX): string {
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}
