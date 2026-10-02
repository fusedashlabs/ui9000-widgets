import { describe, expect, it } from 'vitest';

import { resolveUniqueValuesOrder } from './fuse-widget.js';

describe('resolveUniqueValuesOrder', () => {
  it('keeps first-seen order when the keys are a one-shot iterator', () => {
    const groups = new Map([
      ['active_listings', []],
      ['pending_sales', []],
    ]);
    expect(resolveUniqueValuesOrder(groups.keys(), undefined, 'measure')).toEqual([
      'active_listings',
      'pending_sales',
    ]);
  });

  it('orders a one-shot iterator by uniqueValues and appends extras', () => {
    const groups = new Map([
      ['pending_sales', []],
      ['active_listings', []],
      ['new_listings', []],
    ]);
    expect(
      resolveUniqueValuesOrder(groups.keys(), { measure: ['active_listings', 'pending_sales'] }, 'measure'),
    ).toEqual(['active_listings', 'pending_sales', 'new_listings']);
  });
});
