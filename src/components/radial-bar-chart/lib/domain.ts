import { scaleLinear, type ScaleLinear } from 'd3-scale';

import { FD } from '../../../utils/fusedash-visual.js';

/** Full sweep of the rings: 270° in radians (0 = 12 o'clock, clockwise). */
export const RADIAL_BAR_SWEEP = (FD.radialBarSweepDeg / 180) * Math.PI;

/**
 * Client `radialScale`: value → angle over [0, 270°], `.nice()`-ed, with the
 * lower bound pinned to zero unless the data actually goes negative.
 */
export function radialBarAngleScale(
  values: number[],
): ScaleLinear<number, number> {
  const finite = values.filter((v) => Number.isFinite(v));
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 0;

  const scale = scaleLinear()
    .domain([min < 0 ? min : 0, max])
    .range([0, RADIAL_BAR_SWEEP])
    .nice();

  const [niceMin, niceMax] = scale.domain();
  scale.domain([min < 0 ? niceMin : 0, niceMax]);
  return scale;
}

/**
 * Client `radiusScale`. Domain and range are the same interval, so `.nice()`
 * widens the domain only — the rings end up slightly inset from the raw radii.
 */
export function radialBarRadiusScale(
  innerRadius: number,
  outerRadius: number,
): ScaleLinear<number, number> {
  return scaleLinear()
    .domain([innerRadius, outerRadius])
    .rangeRound([innerRadius, outerRadius])
    .nice();
}

/** Client `arcWidth`: half of the free space per ring, clamped to 4–24px. */
export function radialBarArcWidth(
  innerRadius: number,
  outerRadius: number,
  ringCount: number,
): number {
  if (ringCount <= 0) return FD.radialBarMinArcWidth;
  const free = outerRadius - innerRadius - ringCount;
  return Math.max(
    FD.radialBarMinArcWidth,
    Math.min(FD.radialBarMaxArcWidth, (free / ringCount) * 0.5),
  );
}

/** Client `maxLengthBarLabel`: characters that fit between the hole and the rim. */
export function radialBarLabelLimit(
  innerRadius: number,
  outerRadius: number,
): number {
  return Math.max(
    1,
    Math.ceil((outerRadius - innerRadius) / FD.radialBarLabelCharWidth),
  );
}

export type RadialBarMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/**
 * Client anchoring: the labels straight above and below the hole are centred on
 * their tick, the rest sit beside it.
 */
export function radialBarTickAnchor(angle: number): 'start' | 'middle' | 'end' {
  const vertical = Math.abs(Math.abs(angle) - Math.PI / 2) < 1e-9;
  if (vertical) return 'middle';
  return angle > -Math.PI / 2 && angle < Math.PI / 2 ? 'start' : 'end';
}

/**
 * Client `outerRadius`: the circle inscribed in the frame, whatever the aspect
 * ratio.
 *
 * Value labels are drawn 12px beyond the rim and are allowed to run past the
 * SVG edge, exactly as in FuseDash: a square or portrait body clips the
 * right-hand label against the widget viewBox (420x420 loses ~20px of it,
 * 360x600 ~48px), while every landscape body has room to spare. Matching the
 * client ring size is the accepted trade — do not shrink the circle to rescue
 * the label.
 *
 * One difference remains, and it is in our favour: the client scales a
 * `0 0 width height+40` viewBox into a `100%`-sized element, so its whole
 * drawing letterboxes and its 12px text is not really 12px. We keep a 1:1
 * pixel viewBox, so labels clip against the container edge instead of that
 * inset box — same ring, same failure mode, a few px different boundary.
 */
export function radialBarOuterRadius(
  width: number,
  height: number,
  margin: RadialBarMargin,
): number {
  return Math.max(
    0,
    Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2,
  );
}
