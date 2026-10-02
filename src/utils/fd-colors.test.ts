import { describe, expect, it } from 'vitest';
import { FD_DARK, FD_LIGHT, fdColors } from './fusedash-visual.js';

describe('fdColors', () => {
  it('keeps the same keys in both modes', () => {
    expect(Object.keys(FD_DARK).sort()).toEqual(Object.keys(FD_LIGHT).sort());
  });

  it('uses the shell neutrals for dark axes', () => {
    expect(fdColors('dark')).toEqual({
      gridStroke: '#444B57',
      axisLabelFill: '#A4A9B1',
      axisStroke: '#444B57',
    });
    expect(fdColors('light').gridStroke).toBe('#afb3bb');
    expect(fdColors('light').axisLabelFill).toBe('#6c7584');
  });
});
