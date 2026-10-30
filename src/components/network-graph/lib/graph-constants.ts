/** Internal canvas: node positions and the drag area live in these units. */
export const CANVAS_WIDTH = 2000;
export const CANVAS_HEIGHT = 1375;
export const VIEWBOX_OFFSET_X = CANVAS_WIDTH * -0.4;
export const VIEWBOX_OFFSET_Y = CANVAS_HEIGHT * -0.35;

/** Controls how compact nodes are at the start. */
export const INITIAL_NODE_RADIUS_RATIO = 0.2;
export const NODE_BORDER_WIDTH = 1;

/** Nodes are drawn larger than the legend sizes so the graph fills the circle. */
export const NODE_DISPLAY_SCALE = 1.5;
/** Nodes up to the `sm` legend size are coloured rings, larger ones are filled. */
export const RING_NODE_MAX_SIZE = 6 * NODE_DISPLAY_SCALE;
export const NODE_HALO_WIDTH = 3;
/** Ring nodes: stroke as a share of the radius. */
export const NODE_RING_SHARE = 0.42;
export const SELECTED_RING_WIDTH = 2;
export const FOCUS_HALO_RATIO = 3.2;
export const PLUS_BADGE_RADIUS = 15;
export const NODE_LABEL_FONT_SIZE = 19;
export const NODE_LABEL_LINE_HEIGHT = 23;
export const NODE_LABEL_GAP = 6;
export const NODE_LABEL_MAX_WIDTH = 210;
export const NODE_LABEL_SIZES = { large: 19, mid: 15, small: 12 } as const;
export const LINK_WIDTH = 1;
export const ACTIVE_LINK_WIDTH = 1.5;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 8;
/** Simulation steps run before the first paint. */
export const WARM_UP_TICKS = 150;
export const CENTER_PULL = 0.012;
export const ISOLATED_NODE_PULL = 0.3;
/** Connections panel: ring radius around each dot grows with the link value. */
export const CONNECTION_RING_MIN = 7;
export const CONNECTION_RING_MAX = 34;
/** Radius of the dashed circle the graph fills, share of the canvas height. */
export const LAYOUT_RADIUS_RATIO = 0.46;
/** Free space between the outermost nodes and the circle. */
export const LAYOUT_EDGE_GAP = 24;
/** Largest share of the circle the nodes may take before the circle grows. */
export const LAYOUT_MAX_FILL = 0.6;
/** Link length as a share of the circle radius. */
export const MIN_LINK_SHARE = 0.22;
export const MAX_LINK_SHARE = 0.48;
/** Room between nodes (names sit under them). */
export const COLLIDE_GAP = 46;
/** Air around the box of a node and its name. */
export const FOOTPRINT_PADDING = 6;
/** Repulsion that spreads the nodes over the circle: stronger for few nodes. */
export const MIN_CHARGE = 400;
export const MAX_CHARGE = 6000;
/** Share of the way back into the circle a released node covers per tick. */
export const CIRCLE_BOUNDS_STRENGTH = 0.12;
/** Background of the graph, as shares of the layout circle radius. */
export const DECOR_INNER_SHARE = 0.48;
export const DECOR_TICK_SHARE = 0.026;
export const DECOR_DIAGONAL_FROM = 0.36;
export const DECOR_DIAGONAL_TO = 1.3;
