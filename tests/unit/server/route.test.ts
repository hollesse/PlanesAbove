// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { AdsbLolRouteSource } from '../../../src/server/modules/airspace/adapters/adsb-lol-routeset';
import { RouteService, isPlausibleRoute, formatRoute } from '../../../src/server/modules/airspace/route-service';
import { SourceError, type Route, type RouteSource } from '../../../src/server/modules/airspace/model';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';

const fixture = (n: string): string => fs.readFileSync(new URL(`../../fixtures/${n}`, import.meta.url), 'utf8');
const reply = (status: number, body: string): Fetch => async () => ({ ok: status < 300, status, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
const mk = (f: Fetch, timeoutMs = 1000) => new AdsbLolRouteSource({ fetch: f, userAgent: 'test', timeoutMs });
const POS = { lat: 50, lon: 8.5 };

describe('AdsbLolRouteSource contract', () => {
  it('POSTs callsign + position to /api/0/routeset and returns the Route', async () => {
    let seen: { url?: string; method?: string; body?: string } = {};
    const f: Fetch = async (url, init) => { seen = { url, method: init?.method, body: init?.body }; return reply(200, fixture('adsblol-routeset-response.json'))(url, init); };
    const r = await mk(f).lookup('DLH400', POS);
    expect(seen.url).toBe('https://api.adsb.lol/api/0/routeset');
    expect(seen.method).toBe('POST');
    expect(JSON.parse(seen.body!)).toEqual({ planes: [{ callsign: 'DLH400', lat: 50, lng: 8.5 }] });
    expect(r).toMatchObject({ from: { city: 'Frankfurt' }, to: { city: 'New York' }, vendorPlausible: true });
  });
  it('returns null (Route unbekannt) for unknown callsigns, entries without airports and an empty 201 body (as recorded live)', async () => {
    expect(await mk(reply(200, fixture('adsblol-routeset-response.json'))).lookup('XYZ999', POS)).toBeNull();
    expect(await mk(reply(200, fixture('adsblol-routeset-response.json'))).lookup('BAD1', POS)).toBeNull();
    expect(await mk(reply(200, fixture('adsblol-routeset-response.json'))).lookup('NOPE', POS)).toBeNull();
    expect(await mk(reply(201, fixture('adsblol-routeset-empty-201.txt'))).lookup('DLH400', POS)).toBeNull();
  });
  it('maps 403/429/5xx/timeout/garbage to typed SourceErrors', async () => {
    const cls = (f: Fetch, t?: number) => mk(f, t).lookup('DLH400', POS).catch((e: SourceError) => e.errorClass);
    expect(await cls(reply(403, ''))).toBe('http-403');
    expect(await cls(reply(429, ''))).toBe('http-429');
    expect(await cls(reply(502, ''))).toBe('http-5xx');
    expect(await cls(reply(200, 'not json'))).toBe('parse');
    expect(await cls((_u, i) => new Promise((_r, rej) => i?.signal?.addEventListener('abort', () => rej(i.signal!.reason))), 20)).toBe('timeout');
  });
});

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
