import { describe, expect, it } from 'vitest';
import { pickTransition } from '../../src/client/app/transition-plan';
import { TRANSITIONS } from '../../src/client/ui';

// Decision table of sky-scene-n0sfy (ADR 0020): compare icao24 and array position only.
const table: [string[], string[], string][] = [
  [[], [], 'same'],
  [[], ['x'], 'empty-to-one'],
  [[], ['x', 'y'], 'empty-to-two'],
  [['a'], [], 'one-to-empty'],
  [['a'], ['a'], 'same'],
  [['a'], ['x'], 'switch-one'],
  [['a'], ['a', 'x'], 'one-to-two'],
  [['a'], ['x', 'a'], 'cut'],
  [['a'], ['x', 'y'], 'cut'],
  [['a', 'b'], [], 'two-to-empty'],
  [['a', 'b'], ['a'], 'two-to-one-b'],
  [['a', 'b'], ['b'], 'two-to-one-a'],
  [['a', 'b'], ['x'], 'cut'],
  [['a', 'b'], ['a', 'b'], 'same'],
  [['a', 'b'], ['a', 'x'], 'switch-two-2'],
  [['a', 'b'], ['x', 'b'], 'switch-two-1'],
  [['a', 'b'], ['x', 'y'], 'switch-two-both'],
  [['a', 'b'], ['b', 'a'], 'cut'],
  [['a', 'b'], ['b', 'x'], 'cut'],
  [['a', 'b'], ['x', 'a'], 'cut'],
];
const planes = (ids: string[]) => ids.map((icao24) => ({ icao24 }));

describe('pickTransition', () => {
  it.each(table)('%j -> %j = %s', (prev, next, expected) => {
    expect(pickTransition(planes(prev), planes(next))).toBe(expected);
  });
  it('first render (no previous state) is a cut', () => {
    expect(pickTransition(undefined, planes(['a']))).toBe('cut');
  });
  it('every returned spec id exists in TRANSITIONS and all 11 plane ids are reachable', () => {
    const ids = new Set(table.map((r) => r[2]).filter((r) => r !== 'cut' && r !== 'same'));
    expect(ids.size).toBe(11);
    for (const id of ids) expect(TRANSITIONS.some((t) => t.id === id)).toBe(true);
  });
});
