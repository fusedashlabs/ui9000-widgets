// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { registerTable } from '../index.js';

registerTable();

describe('ui9000-table', () => {
  it('renders a sticky header and emits ui9000-select', async () => {
    const host = document.createElement('ui9000-table');
    host.setAttribute(
      'data',
      JSON.stringify({
        columns: [{ key: 'host', label: 'Host' }],
        cells: [[{ text: 'web-1' }], [{ text: 'web-2' }]],
      }),
    );
    document.body.appendChild(host);
    await host.updateComplete;

    const root = host.shadowRoot!;
    expect(root.querySelector('[data-header]')?.textContent).toBe('Host');
    expect(root.innerHTML).not.toContain('<script');

    const selected: string[] = [];
    host.addEventListener('ui9000-select', (e) => {
      selected.push((e as CustomEvent<{ id: string }>).detail.id);
    });
    (root.querySelector('tbody tr') as HTMLElement).click();
    expect(selected).toEqual(['web-1']);
    host.remove();
  });
});
