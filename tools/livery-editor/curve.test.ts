import { describe, expect, it } from 'vitest';
import { movePoint, segmentHandle, setVia } from './curve';
import { pathData } from '../../src/client/ui/domain/livery-render';

const quad = { points: [[0, 0], [100, 0], [100, 50], [0, 50]] as [number, number][] };

describe('curve handle logic', () => {
  it('handle is the segment midpoint without a curve, including the closing segment', () => {
    expect(segmentHandle(quad, 0)).toEqual([50, 0]);
    expect(segmentHandle(quad, 3)).toEqual([0, 25]);
  });
  it('handle is the via point once the segment is rounded', () => {
    expect(segmentHandle(setVia(quad, 1, [130, 25]), 1)).toEqual([130, 25]);
  });
  it('setVia writes only that index, pads with null to points.length, and null clears again', () => {
    const r = setVia(quad, 3, [-20, 25]);
    expect(r.via).toEqual([null, null, null, [-20, 25]]);
    const r2 = setVia(r, 0, [50, -10]);
    expect(r2.via).toEqual([[50, -10], null, null, [-20, 25]]);
    expect(setVia(r2, 0, null).via).toEqual([null, null, null, [-20, 25]]);
    expect(quad).not.toHaveProperty('via');
  });
  it('a dragged handle lies on the rendered curve: quadratic Bezier at t=0.5 hits via', () => {
    const layer = setVia(quad, 0, [50, -30]);
    const m = /^M0 0 Q(\S+) (\S+) 100 0/.exec(pathData(layer))!;
    const [cx, cy] = [Number(m[1]), Number(m[2])];
    const at = (a: number, c: number, b: number) => 0.25 * a + 0.5 * c + 0.25 * b;
    expect([at(0, cx, 100), at(0, cy, 0)]).toEqual([50, -30]);
  });
});

describe('movePoint', () => {
  const rounded = setVia(quad, 0, [50, -10]);
  it('sets exactly points[i] and keeps via unchanged', () => {
    const r = movePoint(rounded, 1, [120, 5]);
    expect(r.points).toEqual([[0, 0], [120, 5], [100, 50], [0, 50]]);
    expect(r.via).toEqual(rounded.via);
    expect(rounded.points[1]).toEqual([100, 0]);
  });
  it('refuses a point identical to either neighbour, including across the closing edge', () => {
    expect(movePoint(quad, 0, [100, 0])).toBe(quad);
    expect(movePoint(quad, 0, [0, 50])).toBe(quad);
    expect(movePoint(quad, 2, [100, 0])).toBe(quad);
  });
});
