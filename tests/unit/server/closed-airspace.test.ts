// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { closedAirspaceHit, DEFAULT_CLOSED_AIRSPACES, sampleGreatCircle } from '../../../src/server/modules/airspace/closed-airspace';
import { isPlausibleRoute, DEFAULT_PLAUSIBILITY } from '../../../src/server/modules/airspace/route-service';
import { destinationPoint } from '../../../src/server/modules/airspace/geo';
import type { Airport, LatLon, Route } from '../../../src/server/modules/airspace/model';
import { parseConfig } from '../../../src/server/config';

const ap = (city: string, lat: number, lon: number): Airport => ({ name: city, city, lat, lon });
const LHR = ap('London', 51.4775, -0.4614), ICN = ap('Seoul', 37.4633, 126.44), FRA = ap('Frankfurt', 50.0333, 8.5706), HEL = ap('Helsinki', 60.3172, 24.9633);
const IST = ap('Istanbul', 41.2753, 28.7519), NRT = ap('Tokio', 35.772, 140.3929), DXB = ap('Dubai', 25.2528, 55.3644), YVR = ap('Vancouver', 49.1947, -123.1792);
const CGN = ap('Koeln', 50.8659, 7.1427), VIE = ap('Wien', 48.1103, 16.5697);
const route = (from: Airport, to: Airport): Route => ({ from, to });
const hit = (a: Airport, b: Airport): string | null => closedAirspaceHit(a as LatLon, b as LatLon, DEFAULT_CLOSED_AIRSPACES, 100);
const ASCHAFFENBURG: LatLon = { lat: 50.2124, lon: 9.5366 };
const noClosed = { ...DEFAULT_PLAUSIBILITY, closedAirspaces: [] };

describe('closedAirspaceHit (great-circle sampling)', () => {
  it('has the 12 default polygons', () => { expect(DEFAULT_CLOSED_AIRSPACES).toHaveLength(12); });
  it('Frankfurt-Helsinki and Frankfurt-Istanbul hit nothing', () => { expect(hit(FRA, HEL)).toBeNull(); expect(hit(FRA, IST)).toBeNull(); });
  it('Frankfurt-Tokio and London-Seoul hit Russland', () => { expect(hit(FRA, NRT)).toBe('Russland'); expect(hit(LHR, ICN)).toBe('Russland'); });
  it('Frankfurt-Dubai hits Irak, Iran or the Gulf', () => { expect(['Irak', 'Iran', 'Persischer Golf und Golf von Oman']).toContain(hit(FRA, DXB)); });
  it('Vancouver-Tokyo (dateline) runs through cleanly and hits nothing', () => {
    const pts = sampleGreatCircle(YVR as LatLon, NRT as LatLon, 100);
    expect(pts.every((p) => Number.isFinite(p.lat) && p.lon >= -180 && p.lon <= 180)).toBe(true);
    expect(pts[0].lon).toBeCloseTo(-123.1792, 3); expect(pts[pts.length - 1].lon).toBeCloseTo(140.3929, 3);
    expect(hit(YVR, NRT)).toBeNull();
  });
  it('an empty list never hits', () => { expect(closedAirspaceHit(LHR as LatLon, ICN as LatLon, [], 100)).toBeNull(); });
});

describe('isPlausibleRoute: detoured legs (KAL908 London-Seoul, 2026-10-27)', () => {
  const obs = { trackDeg: 104, altitudeM: 10058, verticalRateMs: 0 };
  it('KAL908 over Aschaffenburg, heading 104: plausible, but rejected without closed airspaces', () => {
    expect(isPlausibleRoute(route(LHR, ICN), ASCHAFFENBURG, obs)).toBe(true);
    expect(isPlausibleRoute(route(LHR, ICN), ASCHAFFENBURG, obs, noClosed)).toBe(false);
  });
  it('heading 230 (deviation > 90) is rejected', () => { expect(isPlausibleRoute(route(LHR, ICN), ASCHAFFENBURG, { ...obs, trackDeg: 230 })).toBe(false); });
  it('climbing at 3000 m, 8 m/s, 60 km from Frankfurt stays rejected (profile/phase)', () => {
    const p = destinationPoint(FRA as LatLon, 60, 20);
    expect(isPlausibleRoute(route(LHR, ICN), p, { trackDeg: 104, altitudeM: 3000, verticalRateMs: 8 })).toBe(false);
  });
  it('without detour nothing changes: Frankfurt-Helsinki and Koeln-Wien at 160 km cross-track stay rejected', () => {
    const east = destinationPoint({ lat: 55, lon: 16 }, 160, 90); // ~160 km off the Frankfurt-Helsinki line
    expect(isPlausibleRoute(route(FRA, HEL), east, { altitudeM: 10000, verticalRateMs: 0 })).toBe(false);
    const mid = destinationPoint({ lat: 49.5, lon: 11.85 }, 160, 0);
    expect(isPlausibleRoute(route(CGN, VIE), mid, { altitudeM: 10000, verticalRateMs: 0 })).toBe(false);
  });
});

describe('config: closed airspaces', () => {
  const y = (extra: string): string => `location: { lat: 50, lon: 8 }\nsources:\n  route:\n    plausibility:\n${extra}`;
  it('defaults', () => {
    const p = parseConfig('location: { lat: 50, lon: 8 }').sources.route.plausibility;
    expect(p.detourHeadingDeviationDeg).toBe(90); expect(p.closedAirspaceSampleKm).toBe(100); expect(p.closedAirspaces).toHaveLength(12);
    expect(parseConfig(y('      corridorBaseKm: 50\n')).sources.route.plausibility.closedAirspaces).toHaveLength(12);
  });
  it('closedAirspaces: [] disables detection (KAL908 then rejected)', () => {
    const p = parseConfig(y('      closedAirspaces: []\n')).sources.route.plausibility;
    expect(p.closedAirspaces).toEqual([]);
    expect(isPlausibleRoute(route(LHR, ICN), ASCHAFFENBURG, { trackDeg: 104, altitudeM: 10058, verticalRateMs: 0 }, p)).toBe(false);
  });
  it('a configured list replaces the defaults (no merge)', () => {
    const p = parseConfig(y('      closedAirspaces:\n        - { name: Test, since: 2026-01-01, polygon: [[0, 0], [0, 1], [1, 1]] }\n')).sources.route.plausibility;
    expect(p.closedAirspaces.map((z) => z.name)).toEqual(['Test']);
  });
  it('rejects too few corners, out-of-range coordinates, bad deviation and sample step', () => {
    expect(() => parseConfig(y('      closedAirspaces:\n        - { name: T, since: x, polygon: [[0, 0], [0, 1]] }\n'))).toThrow();
    expect(() => parseConfig(y('      closedAirspaces:\n        - { name: T, since: x, polygon: [[91, 0], [0, 1], [1, 1]] }\n'))).toThrow();
    expect(() => parseConfig(y('      closedAirspaces:\n        - { name: T, since: x, polygon: [[0, 181], [0, 1], [1, 1]] }\n'))).toThrow();
    expect(() => parseConfig(y('      detourHeadingDeviationDeg: 181\n'))).toThrow();
    expect(() => parseConfig(y('      closedAirspaceSampleKm: 0\n'))).toThrow();
  });
});
