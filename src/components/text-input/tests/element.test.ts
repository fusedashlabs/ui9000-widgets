// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { registerTextInput } from '../index.js';

registerTextInput();

describe('ui9000-text-input', () => {
  it('does not render an input without a label', async () => {
    const host = document.createElement('ui9000-text-input');
    host.setAttribute('data', JSON.stringify({ name: 'x', value: '1' }));
    document.body.appendChild(host);
    await host.updateComplete;
    expect(host.shadowRoot?.querySelector('input')).toBeNull();
    expect(host.shadowRoot?.textContent).toMatch(/Label required/);
    host.remove();
  });

  it('renders a labelled input with the JSON value', async () => {
    const host = document.createElement('ui9000-text-input');
    host.setAttribute('data', JSON.stringify({ label: 'Assignee', name: 'assignee', value: 'ada' }));
    document.body.appendChild(host);
    await host.updateComplete;
    expect(host.shadowRoot?.querySelector('label')?.textContent).toBe('Assignee');
    expect((host.shadowRoot?.querySelector('input') as HTMLInputElement | null)?.value).toBe('ada');
    host.remove();
  });
});
