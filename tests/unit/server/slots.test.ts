// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assignSlots, emptySlots, type Slots } from '../../../src/server/modules/sky-scene/slots';
import type { Candidate } from '../../../src/server/modules/airspace/selection';
import type { Flugzeug } from '../../../src/server/modules/airspace/model';

const HOLD = 90_000; // 3 Takte
const c = (icao24: string, distanceKm: number): Candidate => ({ aircraft: { icao24 } as Flugzeug, distanceKm });
const ids = (s: Slots) => s.map((x) => x?.icao24 ?? null);

describe('assignSlots (ADR 0017)', () => {
  it('fills empty slots nearest first, one hold window each', () => {
    const s = assignSlots(emptySlots(), [c('a', 2), c('b', 5), c('z', 9)], 0, HOLD);
    expect(ids(s)).toEqual(['a', 'b']);
    expect(s[0]?.holdUntil).toBe(HOLD);
  });
  it('a single candidate takes slot 1', () => {
    expect(ids(assignSlots(emptySlots(), [c('a', 2)], 0, HOLD))).toEqual(['a', null]);
  });
  it('is pure: does not mutate its input', () => {
    const prev = assignSlots(emptySlots(), [c('a', 2), c('b', 5)], 0, HOLD);
    const snap = JSON.stringify(prev);
    assignSlots(prev, [c('c', 1), c('a', 2)], 1000, HOLD);
    expect(JSON.stringify(prev)).toBe(snap);
  });
  const table: { name: string; at: number; cands: Candidate[]; expected: (string | null)[] }[] = [
    { name: 'holder keeps slot against a nearer plane while held', at: 30_000, cands: [c('n', 1), c('a', 2), c('b', 5)], expected: ['a', 'b'] },
    { name: 'held until the window ends (Takt 3)', at: 60_000, cands: [c('n', 1), c('a', 2), c('b', 5)], expected: ['a', 'b'] },
    { name: 'after the window the nearest non-holder displaces the holder', at: 90_000, cands: [c('n', 1), c('m', 1.5), c('a', 2), c('b', 5)], expected: ['n', 'm'] },
    { name: 'after the window an expired holder still among the nearest keeps its slot', at: 90_000, cands: [c('n', 1), c('a', 2), c('b', 5)], expected: ['a', 'n'] },
    { name: 'holder leaves the radius: slot refilled the same Takt', at: 30_000, cands: [c('n', 1), c('b', 5), c('m', 7)], expected: ['n', 'b'] },
    { name: 'no swap when order reverses while both are held', at: 30_000, cands: [c('b', 1), c('a', 2)], expected: ['a', 'b'] },
    { name: 'no swap when order reverses after expiry either', at: 120_000, cands: [c('b', 1), c('a', 2)], expected: ['a', 'b'] },
  ];
  for (const t of table) {
    it(t.name, () => {
      const prev = assignSlots(emptySlots(), [c('a', 2), c('b', 5)], 0, HOLD);
      expect(ids(assignSlots(prev, t.cands, t.at, HOLD))).toEqual(t.expected);
    });
  }
  it('a vanished holder frees only its own slot', () => {
    const prev = assignSlots(emptySlots(), [c('a', 2), c('b', 5)], 0, HOLD);
    expect(ids(assignSlots(prev, [c('a', 2), c('n', 1)], 30_000, HOLD))).toEqual(['a', 'n']);
  });
  it('newcomer in a freed slot gets a fresh hold window', () => {
    const prev = assignSlots(emptySlots(), [c('a', 2), c('b', 5)], 0, HOLD);
    const s = assignSlots(prev, [c('a', 2), c('n', 1)], 30_000, HOLD);
    expect(s[1]).toEqual({ icao24: 'n', holdUntil: 120_000 });
    expect(s[0]?.holdUntil).toBe(HOLD);
  });
});
