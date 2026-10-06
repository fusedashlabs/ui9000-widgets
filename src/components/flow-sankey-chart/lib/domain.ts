import { FD } from '../../../utils/fusedash-visual.js';

import {
  SEVERITY_KEYS,
  type FlowLinkDatum,
  type FlowSankeyModel,
  type SeverityKey,
} from './types.js';

/** Legend-ready label for a severity key. */
export const SEVERITY_LABELS: Readonly<Record<SeverityKey, string>> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

/** The colour unclassified marks are drawn in, and so the Info key swatch. */
export function neutralColor(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? FD.flowSankeyRailDark : FD.flowSankeyRail;
}

/** Severity colour, or the neutral rail when the flow is unclassified. */
export function severityColor(
  severity: SeverityKey | null,
  neutral: string,
): string {
  return severity ? FD.flowSankeySeverity[severity] : neutral;
}

export interface FlowLegendEntry {
  key: SeverityKey;
  label: string;
  color: string;
}

/**
 * Legend entries for the severities the model actually uses, High → Info.
 *
 * `neutral` is the colour unclassified marks were drawn in; passing it keeps
 * the Info swatch identical to the plot rather than merely similar.
 */
export function buildSeverityLegend(
  model: FlowSankeyModel,
  neutral?: string,
): FlowLegendEntry[] {
  return model.severities.map((key) => ({
    key,
    label: SEVERITY_LABELS[key],
    color: key === 'info' && neutral ? neutral : FD.flowSankeySeverity[key],
  }));
}

export { SEVERITY_KEYS };

/**
 * Every link reachable from `nodeId` in both directions — the full cause →
 * impact path the Figma "Selected Flow Highlight" state lights up.
 */
export function connectedLinkKeys(
  links: FlowLinkDatum[],
  keyOf: (link: FlowLinkDatum, index: number) => string,
  nodeId: string,
): Set<string> {
  const downstream = new Map<string, number[]>();
  const upstream = new Map<string, number[]>();

  links.forEach((link, index) => {
    const out = downstream.get(link.source);
    if (out) out.push(index);
    else downstream.set(link.source, [index]);

    const back = upstream.get(link.target);
    if (back) back.push(index);
    else upstream.set(link.target, [index]);
  });

  const keys = new Set<string>();

  const walk = (
    start: string,
    edges: Map<string, number[]>,
    next: (link: FlowLinkDatum) => string,
  ): void => {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const id = queue.shift() as string;
      for (const index of edges.get(id) ?? []) {
        const link = links[index];
        keys.add(keyOf(link, index));
        const step = next(link);
        if (!seen.has(step)) {
          seen.add(step);
          queue.push(step);
        }
      }
    }
  };

  walk(nodeId, downstream, (link) => link.target);
  walk(nodeId, upstream, (link) => link.source);
  return keys;
}
