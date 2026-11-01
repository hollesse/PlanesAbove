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
