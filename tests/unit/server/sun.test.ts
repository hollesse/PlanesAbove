// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { skyTimeAt, sunPosition } from '../../../src/server/modules/weather/sun';

const FRA = { lat: 50.05, lon: 8.57 };
const at = (iso: string): number => Date.parse(iso);

describe('sunPosition (ADR 0006)', () => {
  it('equinox noon at Greenwich: the sun stands about 90 - lat high, hour angle near 0', () => {
    const p = sunPosition(at('2026-03-20T12:07:00Z'), 51.48, 0);
    expect(p.elevationDeg).toBeCloseTo(38.5, 0);
    expect(Math.abs(p.hourAngleDeg)).toBeLessThan(1);
  });
  it('midsummer at Frankfurt: about 63 deg at solar noon, below the horizon at midnight', () => {
    expect(sunPosition(at('2026-06-21T11:28:00Z'), FRA.lat, FRA.lon).elevationDeg).toBeCloseTo(63.4, 0);
    expect(sunPosition(at('2026-06-21T23:30:00Z'), FRA.lat, FRA.lon).elevationDeg).toBeLessThan(-10);
  });
  it('sunrise and sunset (elevation about -0.83 deg) match the almanac within about 5 minutes (1 deg)', () => {
    // Frankfurt am Main, 2026-11-24: sunrise 07:57 UTC+1, sunset 16:32 UTC+1
    for (const iso of ['2026-11-24T06:57:00Z', '2026-11-24T15:32:00Z']) expect(Math.abs(sunPosition(at(iso), FRA.lat, FRA.lon).elevationDeg + 0.83), iso).toBeLessThan(1);
  });
});

describe('skyTimeAt: Tageszeit from the sun position', () => {
  it.each([
    ['2026-11-24T03:00:00Z', 'night'],
    ['2026-11-24T06:10:00Z', 'night'], // sun still below -6 deg
    ['2026-11-24T06:30:00Z', 'dawn'], // shortly before sunrise, civil twilight
    ['2026-11-24T07:20:00Z', 'dawn'], // sun just above the horizon, still below +4 deg
    ['2026-11-24T10:00:00Z', 'day'],
    ['2026-11-24T15:20:00Z', 'dusk'],
    ['2026-11-24T16:00:00Z', 'dusk'], // after sunset, civil twilight
    ['2026-11-24T17:00:00Z', 'night'],
    ['2026-06-21T03:00:00Z', 'dawn'], // midsummer: early morning twilight
    ['2026-06-21T19:30:00Z', 'dusk'],
    ['2026-06-21T22:00:00Z', 'night'],
  ] as const)('%s at Frankfurt -> %s', (iso, time) => {
    expect(skyTimeAt(at(iso), FRA)).toBe(time);
  });
  it('thresholds are configurable', () => {
    const ms = at('2026-11-24T07:20:00Z'); // sun about +3 deg, rising
    expect(skyTimeAt(ms, FRA)).toBe('dawn');
    expect(skyTimeAt(ms, FRA, { nightBelowDeg: -6, dayAboveDeg: 0 })).toBe('day');
  });
});
