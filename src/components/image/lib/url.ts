/** Text + image panes — MCP is read-only (no editor, upload, or AI chat). */

const HTTP_URL = /^https?:\/\//i;

export function normalizeTextContent(widget: { text?: unknown }): string | null {
  if (typeof widget.text !== 'string') return null;
  const text = widget.text.trim();
  return text ? text : null;
}

export function isExternalImageUrl(url: string): boolean {
  return HTTP_URL.test(url.trim());
}

export function normalizeImageContent(widget: {
  imageUrl?: unknown;
  src?: unknown;
  alt?: unknown;
}): { src: string; alt: string } | null {
  const raw = typeof widget.imageUrl === 'string' ? widget.imageUrl : widget.src;
  if (typeof raw !== 'string') return null;
  const src = raw.trim();
  if (!src || src === '-' || !isExternalImageUrl(src)) return null;
  const alt = typeof widget.alt === 'string' && widget.alt.trim() ? widget.alt.trim() : 'Preview';
  return { src, alt };
}
