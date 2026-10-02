import { describe, expect, it } from 'vitest';
import { FD_DARK, FD_LIGHT, fdColors } from './fusedash-visual.js';

describe('fdColors', () => {
  it('keeps the same keys in both modes', () => {
    expect(Object.keys(FD_DARK).sort()).toEqual(Object.keys(FD_LIGHT).sort());
  });

  it('uses the shell neutrals for dark axes', () => {
    expect(fdColors('dark').gridStroke).toBe('#444B57');
    expect(fdColors('dark').axisLabelFill).toBe('#A4A9B1');
    expect(fdColors('dark').polarGridStroke).toBe('#444B57');
    expect(fdColors('dark').polarCategoryLabelFill).toBe('#A4A9B1');
    expect(fdColors('dark').polarTickPill).toBe('#282E37');
    expect(fdColors('dark').radialBarGridStroke).toBe('#444B57');
    expect(fdColors('dark').radialBarLabelFill).toBe('#A4A9B1');
    expect(fdColors('dark').radarTickFill).toBe('#282E37');
    expect(fdColors('dark').radarTickText).toBe('#EFF0F1');
    expect(fdColors('dark').sliceStroke).toBe('#1a1b1f');
    expect(fdColors('dark').biasVarianceGridStroke).toBe('#444B57');
    expect(fdColors('dark').biasVarianceLabelFill).toBe('#A4A9B1');
    expect(fdColors('dark').parallelAxisStroke).toBe('#444B57');
    expect(fdColors('dark').sankeyNodeRule).toBe('#444B57');
    expect(fdColors('dark').sankeyNodeRuleActive).toBe('#A4A9B1');
    expect(fdColors('dark').networkLabelText).toBe('#EFF0F1');
    expect(fdColors('light').biasVarianceGridStroke).toBe('#d1d5db');
    expect(fdColors('light').sankeyNodeRule).toBe('#D3DBE3');
    expect(fdColors('light').networkLabelText).toBe('rgba(33, 38, 46, 0.9)');
    expect(fdColors('dark').mapSelectionStroke).toBe('#EFF0F1');
    expect(fdColors('dark').mapSpikeLabel).toBe('#EFF0F1');
    expect(fdColors('dark').mapSpikeHalo).toBe('#13161D');
    expect(fdColors('light').mapSpikeLabel).toBe('#000000');
    expect(fdColors('light').mapSpikeHalo).toBe('#ffffff');
    expect(fdColors('light').gridStroke).toBe('#afb3bb');
    expect(fdColors('light').polarGridStroke).toBe('#939ba7');
    expect(fdColors('light').polarCategoryLabelFill).toBe('#5f6877');
    expect(fdColors('light').sliceStroke).toBe('#ffffff');
  });
});
