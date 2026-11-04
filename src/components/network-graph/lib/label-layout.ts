import {
  measureTextWidth,
  wrapLabel,
  type MeasureText,
} from '../../matrix-chart/lib/heatmap-layout.js';
import {
  FOOTPRINT_PADDING,
  NODE_HALO_WIDTH,
  NODE_LABEL_FONT_SIZE,
  NODE_LABEL_GAP,
  NODE_LABEL_LINE_HEIGHT,
  NODE_LABEL_MAX_WIDTH,
  NODE_LABEL_SIZES,
  RING_NODE_MAX_SIZE,
} from './graph-constants.js';
import { NODE_SIZES } from './domain.js';

/** Name size: large nodes get the largest names, as in the design. */
export function getNodeLabelSize(radius: number): number {
  if (radius >= NODE_SIZES.lg * 1.5) return NODE_LABEL_SIZES.large;
  if (radius > RING_NODE_MAX_SIZE) return NODE_LABEL_SIZES.mid;
  return NODE_LABEL_SIZES.small;
}

export interface NodeLabelLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

/** Lines and type of the name drawn under a node of `radius`. */
export function getNodeLabelLayout(
  label: string,
  radius: number,
  measure: MeasureText = measureTextWidth,
): NodeLabelLayout {
  const fontSize = getNodeLabelSize(radius);
  return {
    fontSize,
    lineHeight: Math.round((fontSize * NODE_LABEL_LINE_HEIGHT) / NODE_LABEL_FONT_SIZE),
    lines: wrapLabel(label, NODE_LABEL_MAX_WIDTH, fontSize, 2, measure),
  };
}

/** Box a node takes around its centre: the circle with its halo and the name under it. */
export interface Footprint {
  halfWidth: number;
  /** Above the centre. */
  top: number;
  /** Below the centre, down to the last line of the name. */
  bottom: number;
}

export function getNodeFootprint(
  label: string,
  radius: number,
  measure: MeasureText = measureTextWidth,
): Footprint {
  const { lines, fontSize, lineHeight } = getNodeLabelLayout(label, radius, measure);
  const labelWidth = Math.max(0, ...lines.map((line) => measure(line, fontSize)));
  const outer = radius + NODE_HALO_WIDTH;
  return {
    halfWidth: Math.max(outer, labelWidth / 2) + FOOTPRINT_PADDING,
    top: outer + FOOTPRINT_PADDING,
    bottom:
      Math.max(outer, radius + NODE_LABEL_GAP + lines.length * lineHeight) + FOOTPRINT_PADDING,
  };
}

/** Area a node needs: its collision circle or its footprint, the larger. */
export function getNodeArea(collideRadius: number, footprint: Footprint): number {
  return Math.max(
    Math.PI * collideRadius ** 2,
    2 * footprint.halfWidth * (footprint.top + footprint.bottom),
  );
}
