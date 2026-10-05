// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import {
  MATRIX_Y_LABEL_MIN_GUTTER,
  matrixYLabelGutter,
  matrixYLabelMaxChars,
  normalizeMatrixData,
} from '../lib/index.js';
import { renderMatrixChart } from '../render/draw.js';

// FUS-4142: the "Issue x District Support" matrix of the ticket.
const issues = [
  '2nd Amendment',
  'Conservative Judges',
  'Healthcare',
  'Illegal Immigration',
  'School Choice',
  'Taxes',
  'Tort Reform',
  'Traditional Marriage',
  'Walmart',
];
const districts = ['AZ-1', 'AZ-6', 'CA-22', 'CO-8', 'FL-25', 'IA-1', 'IA-3', 'MI-7'];
const model = normalizeMatrixData(
  issues.flatMap((issue, i) => districts.map((d, j) => ({ x: d, y: issue, value: (i + j) / 20 }))),
);

function yLabels(width: number, left: number): string[] {
  const plot = document.createElement('div');
  document.body.append(plot);
  renderMatrixChart(plot, {
    model,
    width,
    height: 360,
    margin: { ...FD.matrixMargin, left },
    theme: DEFAULT_THEME,
  });
  return Array.from(plot.querySelectorAll('.y-axis text')).map((t) => t.textContent ?? '');
}

describe('matrix Y labels in the chat preview (FUS-4142)', () => {
  it('the fixed 80px gutter cut 7 of the 9 issue names', () => {
    const labels = yLabels(760, MATRIX_Y_LABEL_MIN_GUTTER);
    expect(labels.filter((l) => l.endsWith('...'))).toHaveLength(7);
  });

  it('a gutter sized from the labels shows every issue name in full', () => {
    const gutter = matrixYLabelGutter(model.yDomain, 760, FD.axisLabelSize);
    expect(gutter).toBeGreaterThan(MATRIX_Y_LABEL_MIN_GUTTER);
    expect(yLabels(760, gutter)).toEqual(issues);
  });

  it('keeps the 80px minimum for short labels and caps the gutter', () => {
    expect(matrixYLabelGutter(['A', 'B'], 760, 11)).toBe(MATRIX_Y_LABEL_MIN_GUTTER);
    const long = ['A very long issue name that goes on and on and on and on and on and on and on'];
    expect(matrixYLabelGutter(long, 400, 11)).toBe(180);
    expect(matrixYLabelGutter(long, 1200, 11)).toBe(Math.floor(1200 * 0.35));
  });

  it('cuts from the gutter: 80px still holds 9 characters', () => {
    expect(matrixYLabelMaxChars(MATRIX_Y_LABEL_MIN_GUTTER, 11)).toBe(9);
    expect(matrixYLabelMaxChars(180, 11)).toBeGreaterThan(20);
  });
});
