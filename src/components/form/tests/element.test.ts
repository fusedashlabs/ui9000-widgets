// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { registerForm } from '../index.js';
import { registerTextInput } from '../../text-input/index.js';

registerTextInput();
registerForm();

describe('ui9000-form', () => {
  it('emits ui9000-submit with field values', async () => {
    const host = document.createElement('ui9000-form');
    host.setAttribute(
      'data',
      JSON.stringify({
        label: 'Triage',
        fields: [{ id: 'assignee', kind: 'text-input', label: 'Assignee', value: 'ada' }],
      }),
    );
    document.body.appendChild(host);
    await host.updateComplete;
    await new Promise((r) => setTimeout(r, 50));

    const submitted: Record<string, unknown>[] = [];
    host.addEventListener('ui9000-submit', (e) => {
      submitted.push((e as CustomEvent<{ values: Record<string, unknown> }>).detail.values);
    });
    const form = host.shadowRoot?.querySelector('form');
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(submitted[0]).toEqual({ assignee: 'ada' });
    host.remove();
  });
});
