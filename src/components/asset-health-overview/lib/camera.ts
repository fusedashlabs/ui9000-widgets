/**
 * One camera for the arena. The agents' canvas and the SVG overlay both
 * project through it, so the seats, the gates and the walls stay locked
 * together. Everything is laid out in a 1280 × 620 design space and turns
 * about the pivot.
 */

export const VIEW_W = 1280;
export const VIEW_H = 620;
export const PIVOT_X = 640;
export const PIVOT_Y = 300;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const PITCH_LIMIT = 1.05;

export interface CamPose {
  yaw: number;
  pitch: number;
  /** Focal length; effectively infinite in plan, which flattens the view. */
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

/** Where the operator has turned, zoomed and panned the view (pan in screen px). */
export interface StageCamera {
  yaw: number;
  pitch: number;
  zoom: number;
  panX: number;
  panY: number;
}

/** The camera at rest, as the Agent operations stage keeps it. */
export const DEFAULT_CAMERA: StageCamera = { yaw: -0.34, pitch: 0.26, zoom: 1, panX: 0, panY: 0 };

/** Projection about the pivot. */
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
export function zoomCamera(camera: StageCamera, factor: number): StageCamera {
  const zoom = clampZoom(camera.zoom * factor);
  const k = zoom / camera.zoom;
  return { ...camera, zoom, panX: camera.panX * k, panY: camera.panY * k };
}
