import { describe, expect, it } from 'vitest';

import { parseLabelledField } from './labelled-control.js';

describe('parseLabelledField', () => {
  it('uses JSON value when the host value is unset', () => {
    const field = parseLabelledField(
      JSON.stringify({ label: 'Assignee', name: 'assignee', value: 'ada' }),
      {},
    );
    expect(field).toMatchObject({ label: 'Assignee', name: 'assignee', value: 'ada' });
  });

  it('keeps an explicit empty host value (cleared field)', () => {
    const field = parseLabelledField(
      JSON.stringify({ label: 'Assignee', value: 'ada' }),
      { value: '' },
    );
    expect(field?.value).toBe('');
  });
});
