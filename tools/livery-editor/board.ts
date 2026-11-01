import type { LiveryFile } from '../../src/client/ui/domain/livery-file';

export type Point = [number, number];

/** Editor-side drawing state: finished layers live in the file, the path being drawn is a draft of points. */
export interface Draft { points: Point[] }

export const MIN_POINTS = 3;

/** Board coordinates are whole numbers, so the file stays small and a click is exactly reproducible. */
export const snap = (x: number, y: number): Point => [Math.round(x), Math.round(y)];
export const addPoint = (d: Draft, p: Point): Draft => ({ points: [...d.points, p] });
export const canClose = (d: Draft): boolean => d.points.length >= MIN_POINTS;

/** Closing turns the draft into a coloured path layer on top of the file's layers. */
export function closeDraft(file: LiveryFile, d: Draft, color: string): LiveryFile {
  if (!canClose(d)) return file;
  return { ...file, layers: [...file.layers, { type: 'path', points: d.points, color }] };
}

/** A click within this many board units of the first point closes the path. */
export const CLOSE_RADIUS = 12;

export function isNearFirstPoint(d: Draft, p: Point): boolean {
  if (!d.points.length) return false;
  const [fx, fy] = d.points[0];
  return Math.hypot(p[0] - fx, p[1] - fy) <= CLOSE_RADIUS;
}

/** Whether a click at p would close the draft (needs MIN_POINTS and proximity to the first point). */
export const closesAt = (d: Draft, p: Point): boolean => canClose(d) && isNearFirstPoint(d, p);
