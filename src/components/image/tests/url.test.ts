// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { registerImage } from '../index.js';
import { normalizeImageContent } from '../lib/url.js';

registerImage();

describe('ui9000-image', () => {
  it('rejects javascript and data URLs', () => {
    expect(normalizeImageContent({ imageUrl: 'javascript:alert(1)' })).toBeNull();
    expect(normalizeImageContent({ src: 'data:image/png;base64,aaa' })).toBeNull();
    expect(normalizeImageContent({ src: 'https://example.com/a.png', alt: 'Shot' })).toEqual({
      src: 'https://example.com/a.png',
      alt: 'Shot',
    });
  });

  it('does not set src for a javascript URL payload', async () => {
    const host = document.createElement('ui9000-image');
    host.setAttribute('data', JSON.stringify({ src: 'javascript:alert(1)' }));
    document.body.appendChild(host);
    await host.updateComplete;
    expect(host.shadowRoot?.querySelector('img')).toBeNull();
    expect(host.shadowRoot?.textContent).toMatch(/http\(s\)/);
    host.remove();
  });
});
