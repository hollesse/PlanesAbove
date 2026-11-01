import { describe, expect, it } from 'vitest';
import type { LiveryFile } from '../../src/client/ui/domain/livery-file';
import { addPoint, canClose, closeDraft, snap } from './board';

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
});
