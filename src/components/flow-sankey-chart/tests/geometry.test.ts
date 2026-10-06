import { describe, expect, it } from 'vitest';

import figmaFixture from '../../../stories/fixtures/flow-sankey.figma.json';
import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeFlowSankeyData, type FlowGraphPayload } from '../lib/index.js';
import { renderFlowSankeyChart } from '../render/draw.js';

type Point = [number, number];

/**
 * A graph whose ribbons are tall enough that the bow moves measurably across
 * one ribbon's thickness — the case where a flat-ended ribbon visibly tears
 * away from its curved rail.
 */
const SPARSE = {
  stages: ['Root Cause Category', 'Subcategory', 'Impact/Outcome'],
  nodes: [
    { id: 'iv', label: 'Input Voltage', stage: 0 },
    { id: 'acl', label: 'AC Main Low', stage: 1 },
    { id: 'ach', label: 'AC Main High', stage: 1 },
    { id: 'ovl', label: 'Output Voltage Low', stage: 2 },
    { id: 'ovh', label: 'Output Voltage High', stage: 2 },
  ],
  links: [
    { source: 'iv', target: 'acl', value: 62 },
    { source: 'iv', target: 'ach', value: 28 },
    { source: 'acl', target: 'ovl', value: 62 },
    { source: 'ach', target: 'ovh', value: 28 },
  ],
};

/** Every coordinate pair in a path, whatever commands separate them. */
function points(d: string): Point[] {
  return (d.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g) ?? []).map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return [x, y] as Point;
  });
}

/** Distance from a point to a polyline, treating it as connected segments. */
function distanceToPolyline(p: Point, line: Point[]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i += 1) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const t =
      lengthSq === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / lengthSq),
          );
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
}

/**
 * The two bowed edges of a rail band. `bowedBandPath` emits the left edge top
 * to bottom, then the right edge bottom to top, so the halves split evenly.
 */
function railEdges(d: string): Point[][] {
  const all = points(d);
  const half = all.length / 2;
  return [all.slice(0, half), all.slice(half)];
}

function render(data: unknown, width = 1200, height = 760): HTMLElement {
  const container = document.createElement('div');
  renderFlowSankeyChart(container, {
    model: normalizeFlowSankeyData(data as FlowGraphPayload),
    width,
    height,
    theme: DEFAULT_THEME,
  });
  return container;
}

/** How many of a ribbon's own points sit on one of the rail edges. */
function pointsOnRails(ribbon: Element, rails: Point[][]): number {
  return points(ribbon.getAttribute('d') ?? '').filter(
    (p) => Math.min(...rails.map((edge) => distanceToPolyline(p, edge))) <= 1,
  ).length;
}

describe('ribbon / rail geometry', () => {
  for (const [name, data] of [
    ['the sparse graph', SPARSE],
    ['the Figma fixture', figmaFixture],
  ] as const) {
    it(`joins every ribbon to its rails across the full thickness — ${name}`, () => {
      const container = render(data);
      const rails = [
        ...container.querySelectorAll('.flow-rails path'),
      ].flatMap((rail) => railEdges(rail.getAttribute('d') ?? ''));
      expect(rails.length).toBeGreaterThan(0);

      const ribbons = [...container.querySelectorAll('.flow-links path')];
      expect(ribbons.length).toBeGreaterThan(0);

      for (const ribbon of ribbons) {
        // Both ends are cut along the bowed rail, so each contributes several
        // points. A flat-ended ribbon touches the rail only on its centre line
        // and would score 2 at best.
        expect(pointsOnRails(ribbon, rails)).toBeGreaterThanOrEqual(6);
      }
    });
  }

  it('draws ribbons as closed filled areas, not thick strokes', () => {
    const ribbons = [...render(SPARSE).querySelectorAll('.flow-links path')];

    for (const ribbon of ribbons) {
      expect(ribbon.getAttribute('d')?.trimEnd().endsWith('Z')).toBe(true);
      expect(ribbon.getAttribute('stroke')).toBe('none');
      expect(ribbon.getAttribute('fill')).toBeTruthy();
      expect(ribbon.getAttribute('stroke-width')).toBeNull();
    }
  });

  it('keeps a ribbon exactly as thick as the value it carries', () => {
    const container = render(SPARSE);
    const ribbons = [...container.querySelectorAll('.flow-links path')];

    // Input Voltage splits 62 / 28, so the two ribbons leaving it must stack to
    // the full node height with no slack between them.
    const heights = ribbons.map((r) => {
      const ys = points(r.getAttribute('d') ?? '').map((p) => p[1]);
      return Math.max(...ys) - Math.min(...ys);
    });
    const [low, high] = [Math.max(...heights), Math.min(...heights)];

    expect(low / high).toBeCloseTo(62 / 28, 1);
  });
});
