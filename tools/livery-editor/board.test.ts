import { describe, expect, it } from 'vitest';
import type { LiveryFile } from '../../src/client/ui/domain/livery-file';
import { addPoint, canClose, closeDraft, closesAt, draftPathData, setDraftVia, isNearFirstPoint, CLOSE_RADIUS, snap } from './board';

const empty: LiveryFile = { version: 1, livery: 'spike', typklasse: 'narrowbody', fields: {}, layers: [] };

describe('board path tool', () => {
  it('snaps clicks to whole numbers', () => expect(snap(10.4, 20.6)).toEqual([10, 21]));
  it('needs three points to close; four clicks plus closing give one coloured quad', () => {
    let d = { points: [] as [number, number][] };
    for (const p of [[1, 1], [9, 1], [9, 9]] as [number, number][]) d = addPoint(d, p);
    expect(canClose(d)).toBe(true);
    expect(canClose({ points: d.points.slice(0, 2) })).toBe(false);
    expect(closeDraft(empty, { points: d.points.slice(0, 2) }, '#ff0000')).toBe(empty);
    d = addPoint(d, [1, 9]);
    expect(closeDraft(empty, d, '#ff0000').layers).toEqual([{ type: 'path', points: [[1, 1], [9, 1], [9, 9], [1, 9]], color: '#ff0000' }]);
  });
  it('isNearFirstPoint honours the radius boundary', () => {
    const d = { points: [[100, 100], [200, 100], [200, 200]] as [number, number][] };
    expect(isNearFirstPoint(d, [100 + CLOSE_RADIUS, 100])).toBe(true);
    expect(isNearFirstPoint(d, [100 + CLOSE_RADIUS + 1, 100])).toBe(false);
    expect(isNearFirstPoint({ points: [] }, [0, 0])).toBe(false);
  });
  it('a click near the first point closes only from three points on', () => {
    const three = { points: [[100, 100], [200, 100], [200, 200]] as [number, number][] };
    expect(closesAt(three, [105, 103])).toBe(true);
    expect(closesAt({ points: three.points.slice(0, 2) }, [105, 103])).toBe(false);
    expect(closesAt(three, [150, 150])).toBe(false);
  });
});

describe('draft rounding', () => {
  const pts: [number, number][] = [[0, 0], [100, 0], [100, 100]];
  it('setDraftVia writes exactly the index, padded to points.length', () => {
    const d = setDraftVia({ points: pts }, 1, [100, 30]);
    expect(d.via).toEqual([null, [100, 30], null]);
    expect(setDraftVia(d, 1, null).via).toEqual([null, null, null]);
  });
  it('addPoint keeps via; closeDraft carries it padded with null (closing segment straight)', () => {
    const d = addPoint(setDraftVia({ points: pts.slice(0, 2) }, 0, [50, -20]), pts[2]);
    expect(d.via).toEqual([[50, -20], null]);
    expect(closeDraft(empty, d, '#ff0000').layers).toEqual([{ type: 'path', points: pts, color: '#ff0000', via: [[50, -20], null, null] }]);
  });
  it('draftPathData is an open path with quadratic segments', () => {
    expect(draftPathData({ points: pts, via: [[50, -20], null, null] })).toBe('M0 0 Q50 -40 100 0 L100 100');
  });
});
