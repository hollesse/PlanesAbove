import type { PathLayer } from '../../src/client/ui/domain/livery-file';

// Pure logic of the "Rundung" (curve handle on a segment). Segment i runs from points[i] to points[i+1];
// the closing segment (last point back to the first) is segment points.length - 1. Never mutates its input.

export type Pt = [number, number];
type Curvable = Pick<PathLayer, 'points' | 'via'>;

/** Where the handle of segment i sits: on the curve (`via[i]`) if rounded, else the segment's midpoint. */
export function segmentHandle(layer: Curvable, i: number): Pt {
  const via = layer.via?.[i];
  if (via) return [via[0], via[1]];
  const a = layer.points[i];
  const b = layer.points[(i + 1) % layer.points.length];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Set (or with null clear) the via point of segment i; `via` is kept exactly as long as `points`. */
export function setVia<L extends Curvable>(layer: L, i: number, p: Pt | null): L & { via: (Pt | null)[] } {
  const via: (Pt | null)[] = layer.points.map((_, k) => (layer.via?.[k] as Pt | null | undefined) ?? null);
  via[i] = p;
  return { ...layer, via };
}

/** Move the corner points[i] to p; `via` stays untouched. Refuses a p identical to a neighbouring point (returns the layer unchanged). */
export function movePoint<L extends Pick<PathLayer, 'points'>>(layer: L, i: number, p: Pt): L {
  const n = layer.points.length;
  const same = (q: readonly number[]) => q[0] === p[0] && q[1] === p[1];
  if (n > 1 && (same(layer.points[(i + n - 1) % n]) || same(layer.points[(i + 1) % n]))) return layer;
  return { ...layer, points: layer.points.map((q, k) => (k === i ? p : q)) };
}
