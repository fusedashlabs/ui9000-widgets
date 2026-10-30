import { describe, expect, it } from 'vitest';

import { getLayoutRadius } from '../lib/fit.js';

describe("getLayoutRadius", () => {
  const BASE = 632.5;
  const GAP = 46;
  const EDGE = 24;
  const MAX_FILL = 0.6;

  // Collision circles of nodes of these radii.
  const areasOf = (radii: number[]) =>
    radii.map((r) => Math.PI * (r + GAP) ** 2);
  // Share of the circle (inside the edge gap) the nodes take.
  const fillOf = (radius: number, areas: number[]) =>
    areas.reduce((sum, area) => sum + area, 0) /
    (Math.PI * (radius - EDGE) ** 2);

  it("keeps the base radius while the nodes fit", () => {
    const areas = areasOf(Array.from({ length: 24 }, () => 20));
    expect(getLayoutRadius(BASE, areas, EDGE, MAX_FILL)).toBe(BASE);
  });

  it("grows the circle for a graph too large for it", () => {
    // 102 nodes of the ontology dataset: 1.29 of the base circle.
    const areas = areasOf(
      Array.from({ length: 102 }, (_, i) => 4.74 + (i % 10) * 4)
    );
    expect(fillOf(BASE, areas)).toBeGreaterThan(1);

    const radius = getLayoutRadius(BASE, areas, EDGE, MAX_FILL);
    expect(radius).toBeGreaterThan(BASE);
    expect(fillOf(radius, areas)).toBeCloseTo(MAX_FILL, 5);
  });

  it("keeps the base radius without nodes", () => {
    expect(getLayoutRadius(BASE, [], EDGE, MAX_FILL)).toBe(BASE);
  });
});
