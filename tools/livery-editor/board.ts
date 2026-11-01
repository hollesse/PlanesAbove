import type { LiveryFile, PathLayer } from '../../src/client/ui/domain/livery-file';

export type Point = [number, number];

/** Editor-side drawing state: finished layers live in the file, the path being drawn is a draft of points. */
export interface Draft { points: Point[]; via?: (Point | null)[] }

export const MIN_POINTS = 3;

/** Board coordinates are whole numbers, so the file stays small and a click is exactly reproducible. */
export const snap = (x: number, y: number): Point => [Math.round(x), Math.round(y)];
export const addPoint = (d: Draft, p: Point): Draft => ({ ...d, points: [...d.points, p] });
export const canClose = (d: Draft): boolean => d.points.length >= MIN_POINTS;

/** Closing turns the draft into a coloured path layer on top of the file's layers. */
export function closeDraft(file: LiveryFile, d: Draft, color: string): LiveryFile {
  if (!canClose(d)) return file;
  const layer: PathLayer = { type: 'path', points: d.points, color };
  // the closing segment (and any segment never touched) stays straight: pad with null up to points.length
  if (d.via?.some(Boolean)) layer.via = d.points.map((_, k) => d.via![k] ?? null);
  return { ...file, layers: [...file.layers, layer] };
}

/** Set (or with null clear) the via point of draft segment i; `via` is kept exactly as long as `points`. */
export function setDraftVia(d: Draft, i: number, p: Point | null): Draft {
  const via = d.points.map((_, k) => d.via?.[k] ?? null);
  via[i] = p;
  return { ...d, via };
}

const num = (v: number) => String(Math.round(v * 100) / 100);

/** SVG path data of the draft as an OPEN path (no closing segment); a segment with `via` bends through it (control = 2*via - midpoint). */
export function draftPathData(d: Draft): string {
  const p = d.points;
  if (!p.length) return '';
  let out = `M${num(p[0][0])} ${num(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1], via = d.via?.[i];
    out += via
      ? ` Q${num(2 * via[0] - (a[0] + b[0]) / 2)} ${num(2 * via[1] - (a[1] + b[1]) / 2)} ${num(b[0])} ${num(b[1])}`
      : ` L${num(b[0])} ${num(b[1])}`;
  }
  return out;
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

/** Shift constraint: project p onto the horizontal or vertical through `from` (|dx| >= |dy| -> horizontal). */
export function constrainAxis(from: Point, p: Point): Point {
  return Math.abs(p[0] - from[0]) >= Math.abs(p[1] - from[1]) ? [p[0], from[1]] : [from[0], p[1]];
}

/** Where the next segment ends for a mouse at p: the first point when a click would close, else p (Shift-constrained). Null while the draft is empty. */
export function rubberTarget(d: Draft, p: Point, shift: boolean): Point | null {
  if (!d.points.length) return null;
  if (closesAt(d, p)) return d.points[0];
  return shift ? constrainAxis(d.points[d.points.length - 1], p) : p;
}
