import { BOARD } from './layout.js';

/**
 * One camera for the whole board. The agent picture (WebGL, or its canvas
 * fallback) and the SVG overlay both project through it, so clouds, rings,
 * diamonds and links stay locked together. Everything is laid out in the
 * 1280 × 620 design space and orbits about the scene pivot.
 */

export const PIVOT_X = 640;
export const PIVOT_Y = 300;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const PITCH_LIMIT = 1.05;

/** The orbit camera over the board. */
export interface StageCamera {
  /** Radians; wraps at ±π. */
  yaw: number;
  /** Radians; clamped. */
  pitch: number;
  /** 1 = 100%. */
  zoom: number;
  /** Screen px. */
  panX: number;
  panY: number;
}

export const DEFAULT_CAMERA: StageCamera = { yaw: -0.34, pitch: 0.26, zoom: 1, panX: 0, panY: 0 };

/** Flat plan view, or orbiting 3D. */
export type SceneDims = '2D' | '3D';

export interface CamPose {
  yaw: number;
  pitch: number;
  /** Focal length; effectively infinite in 2D, which flattens to a plan view. */
  focal: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Perspective scale at that depth. */
  k: number;
  /** Depth after rotation (larger = further away). */
  z: number;
}

export type Project = (x: number, y: number, z?: number) => Projected;

/** In 2D the camera looks straight down the z axis with no perspective. */
export function camPose(dims: SceneDims, camera: Pick<StageCamera, 'yaw' | 'pitch'>): CamPose {
  return dims === '2D' ? { yaw: 0, pitch: 0, focal: 1e9 } : { yaw: camera.yaw, pitch: camera.pitch, focal: 1500 };
}

/** Projection about a pivot: the scene pivot turns the whole constellation. */
export function projector(pose: CamPose, cx = PIVOT_X, cy = PIVOT_Y): Project {
  const cyw = Math.cos(pose.yaw);
  const syw = Math.sin(pose.yaw);
  const cpt = Math.cos(pose.pitch);
  const spt = Math.sin(pose.pitch);
  return (x, y, z = 0) => {
    const ox = x - cx;
    const oy = y - cy;
    const x1 = ox * cyw - z * syw;
    const z1 = ox * syw + z * cyw;
    const y1 = oy * cpt - z1 * spt;
    const z2 = oy * spt + z1 * cpt;
    const k = pose.focal / (pose.focal + z2);
    return { x: cx + x1 * k, y: cy + y1 * k, k, z: z2 };
  };
}

/** Yaw wraps into (−π, π] so it can't grow without bound across drags. */
export function wrapYaw(yaw: number): number {
  return yaw - Math.PI * 2 * Math.floor((yaw + Math.PI) / (Math.PI * 2));
}

export const clampPitch = (pitch: number) => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));

const clampZoom = (zoom: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));

/** Zoom by a factor, keeping the pan proportional so the view zooms about its centre. */
export function zoomCamera(camera: StageCamera, factor: number): Pick<StageCamera, 'zoom' | 'panX' | 'panY'> {
  const zoom = clampZoom(camera.zoom * factor);
  const k = zoom / camera.zoom;
  return { zoom, panX: camera.panX * k, panY: camera.panY * k };
}

/** The map window, in plot px. */
export interface Frame {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Air the design box keeps round the clouds: it may run a touch past its window. */
const OVERSCAN = 1.03;
/**
 * Largest the scene is drawn against its design size. Type keeps one size on
 * screen whatever the scale, so past this a bigger plot gives the map air.
 */
const MAX_SCALE = 1.6;
/** Design px per screen px beyond which callouts fold their readout away (the map under ~90% of its design size). */
export const COMPACT_ABOVE = 1.1;
/**
 * Past this the board is drawn under ~45% of its design size, smaller than
 * the design ever is: a callout that would land on another, or on another
 * goal, steps aside, and the diamonds' names show only under the pointer.
 */
export const TINY_ABOVE = 2.2;

/**
 * How the design space sits on screen at rest: scaled to fit the map window
 * (with a little overscan), never past 160%, and centred in it. `scale` is
 * screen px per design px before the camera's zoom.
 */
export function fitScene(plot: { width: number; height: number }, frame: Frame): { scale: number; cx: number; cy: number } {
  const box = Math.min(plot.width / BOARD.width, plot.height / BOARD.height);
  const fit = Math.min((frame.x1 - frame.x0) / BOARD.width, (frame.y1 - frame.y0) / BOARD.height);
  const scale = Math.max(0.05, Math.min(box, MAX_SCALE, Math.max(box * 0.5, fit * OVERSCAN)));
  return { scale, cx: (frame.x0 + frame.x1) / 2, cy: (frame.y0 + frame.y1) / 2 };
}

/** Design space → plot px, and back, for a fit and a camera. */
export interface SceneView {
  /** Screen px per design px (fit × zoom). */
  scale: number;
  /** Design px per screen px: a 1px hairline is `unit` wide in the design space. */
  unit: number;
  toX: (x: number) => number;
  toY: (y: number) => number;
  fromX: (x: number) => number;
  fromY: (y: number) => number;
}

export function sceneView(fit: { scale: number; cx: number; cy: number }, camera: Pick<StageCamera, 'zoom' | 'panX' | 'panY'>): SceneView {
  const scale = fit.scale * camera.zoom;
  const ox = fit.cx + camera.panX - (BOARD.width / 2) * scale;
  const oy = fit.cy + camera.panY - (BOARD.height / 2) * scale;
  return {
    scale,
    unit: 1 / scale,
    toX: (x) => ox + x * scale,
    toY: (y) => oy + y * scale,
    fromX: (x) => (x - ox) / scale,
    fromY: (y) => (y - oy) / scale,
  };
}
