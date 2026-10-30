import { describe, expect, it } from 'vitest';

import { matrixYLabelGutter, matrixYLabelMaxChars } from '../lib/y-labels.js';

const FONT_SIZE = 12;

describe('matrixYLabelGutter', () => {
  it('keeps the minimum for short labels', () => {
    expect(matrixYLabelGutter(['Red', 'Pink'], 800, FONT_SIZE)).toBe(80);
  });

  it('follows the longest label', () => {
    expect(matrixYLabelGutter(['Short', 'Conservative Judges'], 800, FONT_SIZE)).toBe(153);
  });

  it('stops at 180px on a narrow chart', () => {
    expect(matrixYLabelGutter(['x'.repeat(60)], 400, FONT_SIZE)).toBe(180);
  });

  it('allows 35% of a wide chart', () => {
    expect(matrixYLabelGutter(['x'.repeat(60)], 1000, FONT_SIZE)).toBe(350);
  });

  it('falls back to the minimum without labels or width', () => {
    expect(matrixYLabelGutter([], 0, FONT_SIZE)).toBe(80);
  });
});

describe('matrixYLabelMaxChars', () => {
  it('fits a label as long as the gutter was made for', () => {
    const label = 'Conservative Judges';
    const gutter = matrixYLabelGutter([label], 800, FONT_SIZE);
    expect(matrixYLabelMaxChars(gutter, FONT_SIZE)).toBeGreaterThanOrEqual(label.length);
  });

  it('never cuts below three characters', () => {
    expect(matrixYLabelMaxChars(0, FONT_SIZE)).toBe(3);
  });
});
