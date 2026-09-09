import { isExternalImageUrl } from '../../image/lib/url.js';

export type EntityField = { label: string; value: string };
export type EntityLink = { label: string; href: string };

export type EntityModel = {
  id: string;
  title: string;
  fields: EntityField[];
  links: EntityLink[];
  actions: string[];
};

export function normalizeEntity(raw: unknown): EntityModel | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!id || !title) return null;
  const fields: EntityField[] = [];
  if (Array.isArray(o.fields)) {
    for (const item of o.fields) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const f = item as Record<string, unknown>;
      const label = typeof f.label === 'string' ? f.label : '';
      const value = f.value == null ? '' : String(f.value);
      if (label) fields.push({ label, value });
    }
  }
  const links: EntityLink[] = [];
  if (Array.isArray(o.links)) {
    for (const item of o.links) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const l = item as Record<string, unknown>;
      const label = typeof l.label === 'string' ? l.label.trim() : '';
      const href = typeof l.href === 'string' ? l.href.trim() : '';
      if (label && href && isExternalImageUrl(href)) links.push({ label, href });
    }
  }
  const actions = Array.isArray(o.actions)
    ? o.actions.filter((a): a is string => typeof a === 'string' && !!a.trim())
    : [];
  return { id, title, fields, links, actions };
}
