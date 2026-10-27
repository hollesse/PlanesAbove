// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isPlausibleRoute, DEFAULT_PLAUSIBILITY, RouteService } from '../../../src/server/modules/airspace/route-service';
import { destinationPoint, bearingDeg, crossTrackKm } from '../../../src/server/modules/airspace/geo';
import type { Airport, LatLon, Route, RouteSource } from '../../../src/server/modules/airspace/model';
import { FakeClock } from '../../../src/server/clock';
import { parseConfig } from '../../../src/server/config';

// Airport coordinates (VRS standing data / OurAirports), measured 2026-10-27.
const ap = (city: string, lat: number, lon: number): Airport => ({ name: city, city, lat, lon });
const STR = ap('Stuttgart', 48.6899, 9.222), LCA = ap('Larnaca', 34.8751, 33.6249), CGN = ap('Koeln', 50.8659, 7.1427), VIE = ap('Wien', 48.1103, 16.5697);
const SPU = ap('Split', 43.5389, 16.298), DUS = ap('Duesseldorf', 51.2895, 6.7668), MUC = ap('Muenchen', 48.3538, 11.7861), FRA = ap('Frankfurt', 50.0333, 8.5706), JFK = ap('New York', 40.6398, -73.7789);
const route = (from: Airport, to: Airport, legs?: Airport[]): Route => ({ from, to, legs });
const OBERWEYER: LatLon = { lat: 50.45, lon: 8.09 };
const ft = (f: number): number => f * 0.3048;

describe('isPlausibleRoute: live regressions 2026-10-27', () => {
  it('EWG9YV Split-Koeln (really DUS-MUC): flying 140 deg while the route demands ~305 deg -> rejected for heading', () => {
    // altitude 5000 m is inside the profile envelope near CGN, so only the heading can decide
    const obs = { trackDeg: 140, altitudeM: 5000, verticalRateMs: -0.3 };
    expect(isPlausibleRoute(route(SPU, CGN), OBERWEYER, { ...obs, trackDeg: undefined })).toBe(true);
    expect(isPlausibleRoute(route(SPU, CGN), OBERWEYER, obs)).toBe(false);
    expect(isPlausibleRoute(route(SPU, CGN), OBERWEYER, { trackDeg: 140, altitudeM: ft(35000), verticalRateMs: -0.3 })).toBe(false); // cruise level: profile rejects too
  });
  it('EWG16Y Stuttgart-Larnaca (really CGN-VIE): rejected, far off the line', () => {
    expect(isPlausibleRoute(route(STR, LCA), OBERWEYER, { trackDeg: 113, altitudeM: ft(26225), verticalRateMs: 12.6 })).toBe(false);
    expect(isPlausibleRoute(route(STR, LCA), OBERWEYER)).toBe(false);
  });
  it('true routes stay plausible', () => {
    expect(isPlausibleRoute(route(CGN, VIE), OBERWEYER, { trackDeg: 113, altitudeM: ft(26225), verticalRateMs: 12.6 })).toBe(true);
    expect(isPlausibleRoute(route(DUS, MUC), OBERWEYER, { trackDeg: 140, altitudeM: ft(35000), verticalRateMs: 0 })).toBe(true);
  });
  it('LHX1979 Koeln-Muenchen and AUA166D Duesseldorf-Wien at Oberweyer in level cruise stay plausible', () => {
    const cruise = (trackDeg: number) => ({ trackDeg, altitudeM: 8000, verticalRateMs: 0 }); // ~80 km from CGN the envelope is ~10 km, so a realistic still-climbing-out level is 8000 m
    expect(isPlausibleRoute(route(CGN, MUC), OBERWEYER, cruise(Math.round(bearingDeg(OBERWEYER, MUC as LatLon))))).toBe(true); // EDDK-EDDM
    expect(isPlausibleRoute(route(DUS, VIE), OBERWEYER, cruise(Math.round(bearingDeg(OBERWEYER, VIE as LatLon))))).toBe(true); // EDDL-LOWW, ~49 km cross-track: tightest case
  });
  it('DLH400 climbing 55 km out of Frankfurt (inside the zone): only the corridor counts', () => {
    const p = destinationPoint(FRA as LatLon, 55, 290);
    expect(isPlausibleRoute(route(FRA, JFK), p, { trackDeg: 90, altitudeM: ft(15000), verticalRateMs: 12 })).toBe(true);
  });
});

describe('corridor 8 % capped at 150 km (airspace-prwpv)', () => {
  const ZAG = ap('Zagreb', 45.7429, 16.0688), BRU = ap('Bruessel', 50.9014, 4.4844), GDN = ap('Danzig', 54.3776, 18.4662);
  const CTN: LatLon = { lat: 50.48, lon: 8.24 };
  it('CTN4456 Zagreb-Bruessel (cross-track ~100 km on a 1029 km leg) is plausible, EWG16Y and DLH7PP stay rejected', () => {
    expect(crossTrackKm(ZAG as LatLon, BRU as LatLon, CTN)).toBeGreaterThan(95);
    expect(isPlausibleRoute(route(ZAG, BRU), CTN, { trackDeg: 279, altitudeM: ft(32000), verticalRateMs: 0 })).toBe(true);
    expect(isPlausibleRoute(route(STR, LCA), OBERWEYER, { trackDeg: 113, altitudeM: ft(26225), verticalRateMs: 12.6 })).toBe(false);
    expect(isPlausibleRoute(route(MUC, GDN), OBERWEYER, { trackDeg: 113, altitudeM: ft(26225), verticalRateMs: 12.6 })).toBe(false);
    expect(isPlausibleRoute(route(MUC, GDN), OBERWEYER)).toBe(false);
  });
  it('the cap is required: without it EWG16Y passes the corridor with 8 %', () => {
    const uncapped = { ...DEFAULT_PLAUSIBILITY, corridorMaxKm: 10000 };
    expect(isPlausibleRoute(route(STR, LCA), OBERWEYER, undefined, uncapped)).toBe(true);
    expect(isPlausibleRoute(route(STR, LCA), OBERWEYER, undefined, DEFAULT_PLAUSIBILITY)).toBe(false);
  });
});

describe('cross-track corridor', () => {
  it('measures distance to the segment', () => { expect(crossTrackKm(DUS as LatLon, MUC as LatLon, OBERWEYER)).toBeLessThan(15); expect(crossTrackKm(STR as LatLon, LCA as LatLon, OBERWEYER)).toBeGreaterThan(176); });
  it('allows corridorBaseKm + corridorPercent of the leg length', () => {
    const a = { lat: 50, lon: 8 } as Airport, b = destinationPoint(a as LatLon, 1000, 90);
    const B = { ...b, name: 'B', city: 'B' } as Airport; const r = route({ ...a, name: 'A', city: 'A' }, B);
    const mid = destinationPoint(destinationPoint(a as LatLon, 500, 90), 95, 0); // ~95 km abeam, allowed = 50 + 80 = 130
    expect(isPlausibleRoute(r, mid)).toBe(true);
    expect(isPlausibleRoute(r, destinationPoint(destinationPoint(a as LatLon, 500, 90), 140, 0))).toBe(false);
  });
});

describe('protected zones around the airports (heading)', () => {
  const O = { lat: 50, lon: 8 } as Airport; // origin, destination 1000 km due north
  const D = { ...destinationPoint(O as LatLon, 1000, 0) } as Airport;
  const r = route({ ...O, name: 'O', city: 'O' }, { ...D, name: 'D', city: 'D' });
  const at = (km: number, fromOrigin = true): LatLon => (fromOrigin ? destinationPoint(O as LatLon, km, 0) : destinationPoint(D as LatLon, km, 180));
  it('50 km from origin, track 180 vs route 0: not rejected (zone 60)', () => { expect(isPlausibleRoute(r, at(50), { trackDeg: 180, altitudeM: 5000 })).toBe(true); });
  it('70 km from origin at 5000 m: rejected', () => { expect(isPlausibleRoute(r, at(70), { trackDeg: 180, altitudeM: 5000 })).toBe(false); });
  it('70 km from origin at 2500 m: not rejected (altitude guard)', () => { expect(isPlausibleRoute(r, at(70), { trackDeg: 180, altitudeM: 2500 })).toBe(true); });
  it('70 km before destination with opposite heading: not rejected (zone 80)', () => { expect(isPlausibleRoute(r, at(70, false), { trackDeg: 180, altitudeM: 5000 })).toBe(true); });
  it('90 km before destination with opposite heading: rejected', () => { expect(isPlausibleRoute(r, at(90, false), { trackDeg: 180, altitudeM: 5000 })).toBe(false); });
  it('heading within the deviation passes', () => { expect(isPlausibleRoute(r, at(300), { trackDeg: 40, altitudeM: 10000 })).toBe(true); expect(isPlausibleRoute(r, at(300), { trackDeg: 70, altitudeM: 10000 })).toBe(false); });
  it('missing track or vertical rate: corridor only', () => {
    expect(isPlausibleRoute(r, at(300), { altitudeM: 10000 })).toBe(true);
    expect(isPlausibleRoute(r, at(300), { trackDeg: 0, altitudeM: 10000 })).toBe(true);
  });
  it('climb far from the origin is rejected, descent far from the destination likewise', () => {
    expect(isPlausibleRoute(r, at(300), { trackDeg: 0, altitudeM: 5000, verticalRateMs: 12 })).toBe(false);
    expect(isPlausibleRoute(r, at(200), { trackDeg: 0, altitudeM: 11000, verticalRateMs: 12 })).toBe(true);
    expect(isPlausibleRoute(r, at(300, false), { trackDeg: 0, altitudeM: 5000, verticalRateMs: -12 })).toBe(false);
    expect(isPlausibleRoute(r, at(200, false), { trackDeg: 0, altitudeM: 5000, verticalRateMs: -12 })).toBe(true);
    expect(isPlausibleRoute(r, at(300), { trackDeg: 0, altitudeM: 11000, verticalRateMs: 1 })).toBe(true);
  });
  it('altitude profile (also inside the zones, also without track)', () => {
    expect(isPlausibleRoute(r, at(30), { altitudeM: 9000 })).toBe(false);
    expect(isPlausibleRoute(r, at(30), { altitudeM: 3500 })).toBe(true);
    expect(isPlausibleRoute(r, at(50, false), { altitudeM: 10000 })).toBe(false);
    expect(isPlausibleRoute(r, at(50, false), { altitudeM: 3000 })).toBe(true);
    expect(isPlausibleRoute(r, at(150, false), { altitudeM: 11000 })).toBe(true);
  });
});

describe('multi-leg', () => {
  it('plausible when one leg passes every check', () => {
    const r = route(SPU, CGN, [SPU, DUS, MUC]);
    expect(isPlausibleRoute(r, OBERWEYER, { trackDeg: 140, altitudeM: ft(35000), verticalRateMs: 0 })).toBe(true); // DUS-MUC leg
    expect(isPlausibleRoute(route(SPU, CGN, [SPU, CGN]), OBERWEYER, { trackDeg: 140, altitudeM: 5000 })).toBe(false);
  });
  it('bearing helper', () => { expect(Math.round(bearingDeg(OBERWEYER, CGN as LatLon))).toBeGreaterThan(290); });
});

describe('config', () => {
  it('has the documented defaults and rejects non-positive/out-of-range values', () => {
    const yaml = (extra = ''): string => `location: { lat: 50, lon: 8 }\nsources:\n  route:\n    plausibility:\n${extra || '      corridorBaseKm: 50\n'}`;
    expect(parseConfig('location: { lat: 50, lon: 8 }').sources.route.plausibility).toEqual(DEFAULT_PLAUSIBILITY);
    expect(DEFAULT_PLAUSIBILITY).toMatchObject({ corridorBaseKm: 50, corridorPercent: 8, corridorMaxKm: 150, originZoneKm: 60, destinationZoneKm: 80, minHeadingCheckAltitudeM: 3000, maxHeadingDeviationDeg: 65, maxClimbDistanceKm: 250, climbMetersPerKm: 120, descentMetersPerKm: 80, profileSlackM: 600 });
    expect(() => parseConfig(yaml('      corridorBaseKm: 0\n'))).toThrow();
    expect(() => parseConfig(yaml('      maxHeadingDeviationDeg: 181\n'))).toThrow();
    expect(parseConfig(yaml('      maxHeadingDeviationDeg: 90\n')).sources.route.plausibility.maxHeadingDeviationDeg).toBe(90);
  });
});

describe('RouteService passes the observation on and records the rejection', () => {
  it('rejects by heading via the lookup context', async () => {
    const src: RouteSource = { name: 'fake', async lookup() { return route(SPU, CGN); } };
    const svc = new RouteService(src, { now: () => 0 }, { ttlMs: 1000, negativeTtlMs: 1000 });
    const l = await svc.lookupFor('EWG9YV', OBERWEYER, { typklasse: 'x', airlineKnown: true, trackDeg: 140, altitudeM: 5000, verticalRateMs: 0 });
    expect(l?.info).toBeNull();
    expect(l?.attempts).toEqual([{ source: 'fake', outcome: 'rejected' }]);
  });
});

describe('rejected routes are remembered and re-judged per tick (airspace-prwpv)', () => {
  const ZAG = ap('Zagreb', 45.7429, 16.0688), BRU = ap('Bruessel', 50.9014, 4.4844);
  const ZB = route(ZAG, BRU);
  const NEAR: LatLon = { lat: 50.48, lon: 8.24 };
  const FARP: LatLon = destinationPoint(NEAR, 60, 0); // clearly outside the corridor
  const mk = (r: Route | null, ttl = 6 * 3_600_000) => {
    const clock = new FakeClock(0); const src = { name: 'hexdb', calls: 0, async lookup() { src.calls++; return r; } };
    return { clock, src, svc: new RouteService(src as RouteSource, clock, { ttlMs: ttl, negativeTtlMs: 600_000 }) };
  };
  it('tick 1 rejected, tick 2 in the corridor: shown as hit without asking the source again', async () => {
    const { clock, src, svc } = mk(ZB);
    const l1 = await svc.lookupFor('CTN4456', FARP);
    expect(l1).toMatchObject({ info: null, fresh: true, attempts: [{ source: 'hexdb', outcome: 'rejected' }] });
    await clock.advance(30_000);
    const l2 = await svc.lookupFor('CTN4456', NEAR);
    expect(l2).toMatchObject({ info: { text: 'Zagreb → Bruessel', source: 'hexdb' }, fresh: true, chosen: 'hexdb', attempts: [{ source: 'hexdb', outcome: 'hit' }] });
    expect(src.calls).toBe(1);
    expect((await svc.lookupFor('CTN4456', NEAR))?.fresh).toBe(false);
  });
  it('still implausible later: no record, source not asked; no negative-cache expiry for it', async () => {
    const { clock, src, svc } = mk(ZB);
    await svc.lookupFor('C', FARP);
    expect(await svc.lookupFor('C', FARP)).toMatchObject({ info: null, fresh: false, attempts: [] });
    await clock.advance(11 * 60_000);
    expect(await svc.lookupFor('C', FARP)).toMatchObject({ fresh: false });
    expect(src.calls).toBe(1);
  });
  it('all sources unknown: negative cache for negativeTtlMinutes only', async () => {
    const { clock, src, svc } = mk(null);
    await svc.lookupFor('U', NEAR); await svc.lookupFor('U', NEAR);
    expect(src.calls).toBe(1);
    await clock.advance(11 * 60_000);
    await svc.lookupFor('U', NEAR);
    expect(src.calls).toBe(2);
  });
  it('one source rejected, the rest unknown: no negative cache expiry, no new network call within the TTL', async () => {
    const clock = new FakeClock(0);
    const rej = { name: 'hexdb', calls: 0, async lookup() { rej.calls++; return ZB; } }, unk = { name: 'adsbdb', calls: 0, async lookup() { unk.calls++; return null; } };
    const svc = new RouteService([rej, unk] as RouteSource[], clock, { ttlMs: 6 * 3_600_000, negativeTtlMs: 600_000 });
    await svc.lookupFor('R', FARP);
    await clock.advance(11 * 60_000);
    await svc.lookupFor('R', FARP);
    expect([rej.calls, unk.calls]).toEqual([1, 1]);
    expect((await svc.lookupFor('R', NEAR))?.info?.text).toBe('Zagreb → Bruessel');
  });
  it('the remembered rejected route expires after cacheTtlHours and the source is asked again', async () => {
    const { clock, src, svc } = mk(ZB);
    await svc.lookupFor('E', FARP);
    await clock.advance(6 * 3_600_000 + 1);
    await svc.lookupFor('E', FARP);
    expect(src.calls).toBe(2);
  });
});
