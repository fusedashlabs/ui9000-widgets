// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { registerButton } from '../components/button/index.js';
import { registerCheckbox } from '../components/checkbox/index.js';
import { registerDateInput } from '../components/date-input/index.js';
import { registerMultiSelect } from '../components/multi-select/index.js';
import { registerNumberInput } from '../components/number-input/index.js';
import { registerSelect } from '../components/select/index.js';
import { registerTextInput } from '../components/text-input/index.js';

const CONTROLS = [
  'ui9000-text-input',
  'ui9000-number-input',
  'ui9000-select',
  'ui9000-multi-select',
  'ui9000-checkbox',
  'ui9000-date-input',
  'ui9000-button',
] as const;

registerTextInput();
registerNumberInput();
registerSelect();
registerMultiSelect();
registerCheckbox();
registerDateInput();
registerButton();

describe('labelled engine controls', () => {
  it.each(CONTROLS)('%s does not render an interactive control without a label', async (tag) => {
    const host = document.createElement(tag);
    host.setAttribute('data', JSON.stringify({ name: 'x', value: '1' }));
    document.body.appendChild(host);
    await (host as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
    expect(host.shadowRoot?.querySelector('input, select, textarea, button')).toBeNull();
    expect(host.shadowRoot?.textContent).toMatch(/Label required/);
    host.remove();
  });
});
