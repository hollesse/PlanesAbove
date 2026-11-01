import type { LogoLayer } from '../../src/client/ui/domain/livery-file';

// Pure geometry of the logo transform frame (Photoshop-style). A logo is centred on (x, y); rotation is in degrees,
// clockwise on the board (SVG y points down), 0 = upright. Nothing here touches the DOM.

type Point = [number, number];
type Placement = Pick<LogoLayer, 'x' | 'y' | 'scale' | 'rotation'>;
export interface LogoSize { w: number; h: number }
export interface LogoFrame {
  /** Top-left, top-right, bottom-right, bottom-left (in the logo's own orientation) in board coordinates. */
  corners: [Point, Point, Point, Point];
  /** The rotation handle: above the middle of the top edge. */
  rotateHandle: Point;
  center: Point;
}
/** Distance of the rotation handle above the top edge, in board units. */
export const ROTATE_OFFSET = 30;
export const SNAP_STEP = 15;
const MIN_SCALE = 0.01;

const rot = ([px, py]: Point, deg: number): Point => {
  const r = (deg * Math.PI) / 180;
  return [px * Math.cos(r) - py * Math.sin(r), px * Math.sin(r) + py * Math.cos(r)];
};
const at = (l: Placement, local: Point): Point => { const [a, b] = rot(local, l.rotation); return [l.x + a, l.y + b]; };

export function logoFrame(l: Placement, size: LogoSize): LogoFrame {
  const hw = (size.w * l.scale) / 2;
  const hh = (size.h * l.scale) / 2;
  return {
    corners: [at(l, [-hw, -hh]), at(l, [hw, -hh]), at(l, [hw, hh]), at(l, [-hw, hh])],
    rotateHandle: at(l, [0, -hh - ROTATE_OFFSET]),
    center: [l.x, l.y],
  };
}

/** Dragging a corner scales proportionally about the (fixed) centre: the dragged corner follows the pointer's distance. */
export function scaleFromCorner(l: Placement, size: LogoSize, pointer: Point): number {
  const half = Math.hypot(size.w, size.h) / 2;
  const s = Math.hypot(pointer[0] - l.x, pointer[1] - l.y) / half;
  return Math.max(MIN_SCALE, Math.round(s * 1000) / 1000);
}

/** Angle (degrees, -180..180] that turns the handle towards the pointer, seen from the centre. */
export function rotationFromHandle(l: Pick<Placement, 'x' | 'y'>, pointer: Point): number {
  const deg = (Math.atan2(pointer[0] - l.x, -(pointer[1] - l.y)) * 180) / Math.PI;
  return deg <= -180 ? deg + 360 : deg;
}

/** With Shift the angle snaps to 15 degree steps; otherwise it is rounded to one decimal. */
export function snapRotation(deg: number, shift: boolean): number {
  const v = shift ? Math.round(deg / SNAP_STEP) * SNAP_STEP : Math.round(deg * 10) / 10;
  return v === 0 ? 0 : v; // no -0
}

/** Scale so that the logo is `width` board units wide (default ~120). */
export const scaleForWidth = (size: LogoSize, width = 120): number => Math.round((width / size.w) * 1000) / 1000;

/** A new logo layer centred at (x, y), upright. */
export const newLogoLayer = (src: string, size: LogoSize, x: number, y: number): LogoLayer =>
  ({ type: 'logo', src, x, y, scale: scaleForWidth(size), rotation: 0 });
