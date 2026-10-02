import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import type { PieSlice } from '../lib/types.js';
import { renderPieChart } from '../render/draw.js';

const slices: PieSlice[] = [
  { key: 'a', label: 'A', value: 1, color: '#473DD9', percentage: 50 },
  { key: 'b', label: 'B', value: 1, color: '#36C4A5', percentage: 50 },
];

describe('renderPieChart theme', () => {
  it('strokes slices with the dark outline when themeMode is dark', () => {
    const host = document.createElement('div');
    renderPieChart(host, {
      slices,
      width: 200,
      height: 200,
      theme: DEFAULT_THEME,
      themeMode: 'dark',
      showTooltip: false,
    });
    const path = host.querySelector('path');
    expect(path?.getAttribute('stroke')?.toLowerCase()).toBe(FD.donutSliceStrokeDark.toLowerCase());
  });
});
