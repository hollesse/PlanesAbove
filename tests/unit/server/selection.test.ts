// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { distanceKm, selectNearest } from '../../../src/server/modules/airspace/selection';
import type { Flugzeug } from '../../../src/server/modules/airspace/model';

const HOME = { lat: 50.05, lon: 8.57 };
// ~1 km north per 0.009 deg latitude
const at = (icao24: string, km: number, extra: Partial<Flugzeug> = {}): Flugzeug => ({ icao24, lat: HOME.lat + km * 0.009, lon: HOME.lon, onGround: false, ...extra });

describe('distanceKm', () => {
  it('is 0 for the same point and ~111 km per degree of latitude', () => {
    expect(distanceKm(HOME, HOME)).toBe(0);
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111.2, 0);
  });
});

describe('selectNearest (Auswahl der zwei Naechsten)', () => {
  it('returns nothing for an empty sky', () => {
    expect(selectNearest([], HOME, 30)).toEqual([]);
  });
  it('returns the single plane in radius', () => {
    const r = selectNearest([at('a', 5)], HOME, 30);
    expect(r.map((x) => x.aircraft.icao24)).toEqual(['a']);
    expect(r[0].distanceKm).toBeCloseTo(5, 0);
  });
  it('picks the two nearest by own distance, nearest first', () => {
    const r = selectNearest([at('far', 25), at('near', 3), at('mid', 12), at('mid2', 20)], HOME, 30);
    expect(r.map((x) => x.aircraft.icao24)).toEqual(['near', 'mid']);
  });
  it('ignores planes beyond the radius and planes on the ground', () => {
    const r = selectNearest([at('out', 31), at('gnd', 1, { onGround: true }), at('in', 29)], HOME, 30);
    expect(r.map((x) => x.aircraft.icao24)).toEqual(['in']);
  });
  it('is deterministic on equal distance (icao24 order)', () => {
    const r = selectNearest([at('b', 10), at('a', 10)], HOME, 30);
    expect(r.map((x) => x.aircraft.icao24)).toEqual(['a', 'b']);
  });
  it('never returns more than the requested count', () => {
    expect(selectNearest([at('a', 1), at('b', 2), at('c', 3)], HOME, 30, 1)).toHaveLength(1);
  });
});
