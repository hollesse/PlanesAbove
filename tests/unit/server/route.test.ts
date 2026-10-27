// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RouteService, isPlausibleRoute, formatRoute } from '../../../src/server/modules/airspace/route-service';
import { SourceError, type Route, type RouteSource } from '../../../src/server/modules/airspace/model';

const POS = { lat: 50, lon: 8.5 };

const FRA_JFK: Route = { from: { name: 'Frankfurt Airport', city: 'Frankfurt', lat: 50.03, lon: 8.57 }, to: { name: 'JFK', city: 'New York', lat: 40.64, lon: -73.78 }, vendorPlausible: true };

describe('isPlausibleRoute (a route that fails the check is never stated)', () => {
  it('accepts a plane near the route corridor and rejects one far off it', () => {
    expect(isPlausibleRoute(FRA_JFK, POS)).toBe(true);
    expect(isPlausibleRoute(FRA_JFK, { lat: -33.9, lon: 151.2 })).toBe(false);
  });
  it('falls back to the vendor flag when the airports have no coordinates', () => {
    const noCoords: Route = { from: { name: 'A', city: 'A' }, to: { name: 'B', city: 'B' } };
    expect(isPlausibleRoute({ ...noCoords, vendorPlausible: false }, POS)).toBe(false);
    expect(isPlausibleRoute({ ...noCoords, vendorPlausible: true }, POS)).toBe(true);
    expect(isPlausibleRoute(noCoords, POS)).toBe(true);
  });
  it('formats "Frankfurt → New York"', () => { expect(formatRoute(FRA_JFK)).toBe('Frankfurt → New York'); });
  it('multi-leg: lists every leg and is plausible when the plane is on any leg', () => {
    const bhx = { name: 'BHX', city: 'Birmingham', lat: 52.45, lon: -1.75 };
    const multi: Route = { ...FRA_JFK, legs: [FRA_JFK.from, bhx, FRA_JFK.to] };
    expect(formatRoute(multi)).toBe('Frankfurt → Birmingham → New York');
    expect(isPlausibleRoute(multi, { lat: 51, lon: -20 })).toBe(true);
    expect(isPlausibleRoute(multi, { lat: -33.9, lon: 151.2 })).toBe(false);
  });
});

describe('RouteService (plausibility + cache with positive/negative TTL)', () => {
  const counting = (route: Route | null | 'throw') => { const s = { calls: 0, name: 'fake', async lookup() { s.calls++; if (route === 'throw') throw new SourceError('timeout'); return route; } }; return s as RouteSource & { calls: number }; };
  const H = 3600_000;
  it('caches known routes for the TTL and re-asks afterwards', async () => {
    const src = counting(FRA_JFK); let now = 0;
    const svc = new RouteService(src, { now: () => now }, { ttlMs: 6 * H, negativeTtlMs: 600_000 });
    expect(await svc.routeFor('DLH400', POS)).toBe('Frankfurt → New York');
    now = 5 * H; await svc.routeFor('DLH400', POS);
    expect(src.calls).toBe(1);
    now = 7 * H; await svc.routeFor('DLH400', POS);
    expect(src.calls).toBe(2);
  });
  it('caches negatives shorter and returns null (Route unbekannt)', async () => {
    const src = counting(null); let now = 0;
    const svc = new RouteService(src, { now: () => now }, { ttlMs: 6 * H, negativeTtlMs: 600_000 });
    expect(await svc.routeFor('XYZ1', POS)).toBeNull();
    now = 300_000; await svc.routeFor('XYZ1', POS);
    expect(src.calls).toBe(1);
    now = 700_000; await svc.routeFor('XYZ1', POS);
    expect(src.calls).toBe(2);
  });
  it('states Route unbekannt for an implausible route and for source failures', async () => {
    expect(await new RouteService(counting(FRA_JFK), { now: () => 0 }, { ttlMs: 1, negativeTtlMs: 1 }).routeFor('DLH400', { lat: -33.9, lon: 151.2 })).toBeNull();
    expect(await new RouteService(counting('throw'), { now: () => 0 }, { ttlMs: 1, negativeTtlMs: 1 }).routeFor('DLH400', POS)).toBeNull();
  });
  it('does not ask for aircraft without a callsign', async () => {
    const src = counting(FRA_JFK);
    expect(await new RouteService(src, { now: () => 0 }, { ttlMs: 1, negativeTtlMs: 1 }).routeFor(undefined, POS)).toBeNull();
    expect(src.calls).toBe(0);
  });
});
