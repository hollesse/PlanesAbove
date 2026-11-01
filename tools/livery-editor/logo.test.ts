import { describe, expect, it } from 'vitest';
import { logoFrame, newLogoLayer, rotationFromHandle, scaleFromCorner, snapRotation } from './logo';

const size = { w: 200, h: 100 };
const l = { x: 500, y: 220, scale: 1, rotation: 0 };
const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe('logoFrame', () => {
  it('corners around the centre, handle above the top edge', () => {
    const f = logoFrame(l, size);
    expect(f.corners).toEqual([[400, 170], [600, 170], [600, 270], [400, 270]]);
    expect(f.rotateHandle).toEqual([500, 140]);
    expect(f.center).toEqual([500, 220]);
  });
  it('scale grows the frame about the centre', () => {
    expect(logoFrame({ ...l, scale: 0.5 }, size).corners[0]).toEqual([450, 195]);
  });
  it('rotation turns the frame clockwise about the centre', () => {
    const f = logoFrame({ ...l, rotation: 90 }, size);
    close(f.corners[0], [550, 120]); // top-left (-100,-50) -> (50,-100)
    close(f.rotateHandle, [580, 220]); // up (0,-80) -> right (80,0)
  });
});

describe('scaleFromCorner', () => {
  it('is proportional about the centre', () => {
    const half = Math.hypot(200, 100) / 2;
    expect(scaleFromCorner(l, size, [500 + half * 2, 220])).toBe(2);
    expect(scaleFromCorner(l, size, [500, 220 - half / 2])).toBe(0.5);
  });
  it('dragging the actual corner outwards doubles the scale', () => {
    expect(scaleFromCorner(l, size, [300, 120])).toBe(2);
  });
  it('never collapses to zero', () => {
    expect(scaleFromCorner(l, size, [500, 220])).toBeGreaterThan(0);
  });
});

describe('rotationFromHandle / snapRotation', () => {
  it('pointer straight above is 0, right is 90, below is 180, left is -90', () => {
    expect(rotationFromHandle(l, [500, 100])).toBeCloseTo(0);
    expect(rotationFromHandle(l, [600, 220])).toBeCloseTo(90);
    expect(rotationFromHandle(l, [500, 300])).toBeCloseTo(180);
    expect(rotationFromHandle(l, [400, 220])).toBeCloseTo(-90);
  });
  it('round trip with the frame handle', () => {
    const r = { ...l, rotation: 37 };
    expect(rotationFromHandle(r, logoFrame(r, size).rotateHandle)).toBeCloseTo(37);
  });
  it('Shift snaps to 15 degree steps, otherwise one decimal', () => {
    expect(snapRotation(52, true)).toBe(45);
    expect(snapRotation(53, true)).toBe(60);
    expect(snapRotation(-7, true)).toBe(0);
    expect(Object.is(snapRotation(-7, true), -0)).toBe(false);
    expect(snapRotation(52.34, false)).toBe(52.3);
  });
});

describe('newLogoLayer', () => {
  it('is ~120 wide, upright, centred', () => {
    expect(newLogoLayer('x', size, 500, 220)).toEqual({ type: 'logo', src: 'x', x: 500, y: 220, scale: 0.6, rotation: 0 });
  });
});
