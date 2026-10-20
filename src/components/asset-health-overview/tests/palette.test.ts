import { describe, expect, it } from 'vitest';

import { assetHealthPalette, DARK_PALETTE, LIGHT_PALETTE } from '../lib/palette.js';

describe('assetHealthPalette', () => {
  it('keeps the Figma dark ink and a distinct light stage', () => {
    expect(assetHealthPalette('dark')).toBe(DARK_PALETTE);
    expect(assetHealthPalette('light')).toBe(LIGHT_PALETTE);
    expect(DARK_PALETTE.ink).toBe('#FAFAFA');
    expect(DARK_PALETTE.floor).toBe('#0B0C0B');
    expect(LIGHT_PALETTE.ink).toBe('#171717');
    expect(LIGHT_PALETTE.floor).not.toBe(DARK_PALETTE.floor);
    expect(LIGHT_PALETTE.glowBlend).toBe('multiply');
    expect(DARK_PALETTE.glowBlend).toBe('screen');
    expect(DARK_PALETTE.stage).toBe('#0A0A0A');
    expect(LIGHT_PALETTE.stage).toBe('#F5F5F5');
    expect(DARK_PALETTE.stageBorder).toBe(DARK_PALETTE.line);
    expect(LIGHT_PALETTE.stageBorder).toBe(LIGHT_PALETTE.line);
  });
});
