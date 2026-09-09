import { isExternalImageUrl } from '../../image/lib/url.js';

export type EvidenceSource = { label: string; href?: string; excerpt?: string };

export type EvidenceModel = {
  claim: string;
  severity: string;
  sources: EvidenceSource[];
  table?: unknown;
  text?: string;
  image?: { src?: string; imageUrl?: string; alt?: string };
};

export function normalizeEvidence(raw: unknown): EvidenceModel | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const claim = typeof o.claim === 'string' ? o.claim.trim() : '';
  if (!claim) return null;
  const sourcesRaw = Array.isArray(o.sources) ? o.sources : [];
  const sources: EvidenceSource[] = [];
  for (const item of sourcesRaw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const s = item as Record<string, unknown>;
    const label = typeof s.label === 'string' ? s.label.trim() : '';
    if (!label) continue;
    const href = typeof s.href === 'string' ? s.href.trim() : undefined;
    sources.push({
      label,
      href: href && isExternalImageUrl(href) ? href : undefined,
      excerpt: typeof s.excerpt === 'string' ? s.excerpt : undefined,
    });
  }
  return {
    claim,
    severity: typeof o.severity === 'string' ? o.severity : '',
    sources,
    table: o.table,
    text: typeof o.text === 'string' ? o.text : undefined,
    image:
      o.image && typeof o.image === 'object' && !Array.isArray(o.image)
        ? (o.image as EvidenceModel['image'])
        : undefined,
  };
}
