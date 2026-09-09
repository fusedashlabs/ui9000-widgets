/** Vite `base`: `/` locally, `/storybook/` on https://mcp.ui9000.com/storybook/. */
export function storybookAssetUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return `${base}${path.replace(/^\//, '')}`;
}
