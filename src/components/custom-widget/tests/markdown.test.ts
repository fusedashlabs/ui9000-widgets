import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../lib/markdown.js';

describe('renderMarkdown', () => {
  it('renders headings, lists, and emphasis as Lit templates without throwing', () => {
    const result = renderMarkdown('## Title\n\n**bold** and *em*\n\n- one\n- two');
    expect(result).toBeTruthy();
    expect(String(result.strings.join(''))).toContain('class="md"');
  });

  it('does not treat script tags as HTML', () => {
    const result = renderMarkdown('<script>alert(1)</script>');
    const joined = result.strings.join('');
    expect(joined).not.toContain('<script>');
  });
});
