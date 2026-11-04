import { describe, expect, it } from 'vitest';

import {
  FOOTPRINT_PADDING,
  NODE_HALO_WIDTH,
  NODE_LABEL_GAP,
} from '../lib/graph-constants.js';

import {
  getNodeArea,
  getNodeFootprint,
  getNodeLabelLayout,
} from '../lib/label-layout.js';

// Half the font size per character keeps the expectations readable.
const measure = (text: string, fontSize: number) =>
  (text.length * fontSize) / 2;

describe("getNodeLabelLayout", () => {
  // Radius 12: a mid size node, named in 15px type.
  it("wraps a long name on two lines", () => {
    const layout = getNodeLabelLayout(
      "Conservative Judges - Support and Oppose together",
      12,
      measure
    );
    expect(layout.lines).toHaveLength(2);
    expect(layout.fontSize).toBe(15);
    expect(layout.lineHeight).toBe(18);
  });
});

describe("getNodeFootprint", () => {
  it("is as wide as a circle wider than its name", () => {
    const footprint = getNodeFootprint("Tax", 48, measure);
    expect(footprint.halfWidth).toBe(48 + NODE_HALO_WIDTH + FOOTPRINT_PADDING);
    expect(footprint.top).toBe(48 + NODE_HALO_WIDTH + FOOTPRINT_PADDING);
  });

  it("is as wide as a name wider than its circle", () => {
    // 12px type on a small ring node: 20 characters are 120 wide.
    const footprint = getNodeFootprint("Bachmann - Oppose ab", 7, measure);
    expect(footprint.halfWidth).toBe(60 + FOOTPRINT_PADDING);
  });

  it("reaches down to the last line of the name", () => {
    const footprint = getNodeFootprint(
      "Conservative Judges - Support and Oppose together",
      12,
      measure
    );
    expect(footprint.bottom).toBe(
      12 + NODE_LABEL_GAP + 2 * 18 + FOOTPRINT_PADDING
    );
  });
});

describe("getNodeArea", () => {
  it("takes the larger of the circle and the footprint", () => {
    const footprint = { halfWidth: 100, top: 10, bottom: 40 };
    expect(getNodeArea(10, footprint)).toBe(10000);
    expect(getNodeArea(100, footprint)).toBeCloseTo(Math.PI * 10000);
  });
});
