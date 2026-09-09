import { describe, expect, it } from 'vitest';

import {
  effectiveLabelLimit,
  maxCharsForSlot,
  truncateString,
} from './truncate.js';

describe('truncateString', () => {
  it('appends ellipsis when over limit', () => {
    expect(truncateString('Open Field Fruit Crop', 10)).toBe('Open Field...');
  });

  it('returns unchanged when within limit', () => {
    expect(truncateString('2020', 25)).toBe('2020');
  });
});

describe('maxCharsForSlot', () => {
  it('scales with band width', () => {
    expect(maxCharsForSlot(55, 11)).toBeLessThan(25);
    expect(maxCharsForSlot(200, 11)).toBeGreaterThan(10);
  });
});

describe('effectiveLabelLimit', () => {
  it('uses min of maxLength and slot fit', () => {
    expect(effectiveLabelLimit(40, 25, 11)).toBeLessThanOrEqual(25);
  });
});
