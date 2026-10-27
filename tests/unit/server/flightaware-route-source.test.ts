// @vitest-environment node
// FlightAware AeroAPI adapter, budget and wiring (ADR 0018). Fixtures in tests/fixtures/flightaware/ were recorded from operator-approved
// calls on 2026-10-27; error cases are constructed. ALL tests are offline: injected fetch, global fetch stubbed to throw, no key used.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { parseConfig } from '../../../src/server/config';
import { openDatabase } from '../../../src/server/db';
import { startService, type Service } from '../../../src/server/app';
import { createLogger } from '../../../src/server/logger';
import { FlightAwareRouteSource, flightToRoute, pickFlight, periodStart, PAID_LOOKUP_CLASSES } from '../../../src/server/modules/airspace/adapters/flightaware-route-source';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';
import { FlightAwareCallLog } from '../../../src/server/modules/airspace/flightaware-call-log';
import { SourceError, type LookupContext, type Route, type RouteSource } from '../../../src/server/modules/airspace/model';
import { RouteService } from '../../../src/server/modules/airspace/route-service';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';

const realFetch = globalThis.fetch; // only used against the local test server, never against a remote host
const FIX = path.resolve(import.meta.dirname, '../../fixtures/flightaware');
const fixture = (n: string): string => fs.readFileSync(path.join(FIX, n + '.json'), 'utf8');
const KEY = 'SECRET-KEY-do-not-log-12345';
const NB: LookupContext = { typklasse: 'narrowbody', airlineKnown: true };
const T0 = Date.UTC(2026, 9, 27, 16, 0); // 2026-10-27 16:00Z, billing day 1

beforeEach(() => { vi.stubGlobal('fetch', () => { throw new Error('real network access in a test'); }); });
afterEach(() => { vi.unstubAllGlobals(); });

type Req = { url: string; headers?: Record<string, string> };
interface Rig { src: FlightAwareRouteSource; clock: FakeClock; calls: FlightAwareCallLog; lines: string[]; seen: Req[]; db: ReturnType<typeof openDatabase> }
/** Fake AeroAPI: `flights` answers /flights/*, `usage` answers /account/usage (body string, status number, or 'timeout'). */
function mk(o: { flights?: string | number | 'timeout'; usage?: string | number | 'timeout'; budget?: number; cap?: number; db?: ReturnType<typeof openDatabase>; startMs?: number } = {}): Rig {
  const clock = new FakeClock(o.startMs ?? T0);
  const lines: string[] = [];
  const seen: Req[] = [];
  const answer = (v: string | number | 'timeout' | undefined, dflt: string) => {
    if (v === 'timeout') { const e = new Error('timeout'); e.name = 'TimeoutError'; throw e; }
    const status = typeof v === 'number' ? v : 200;
    return { ok: status >= 200 && status < 300, status, text: async () => (typeof v === 'string' ? v : dflt), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  const fetch: Fetch = async (url, init) => {
    seen.push({ url, headers: init?.headers });
    return url.includes('/account/usage') ? answer(o.usage, fixture('usage')) : answer(o.flights, fixture('flights-LHX1HL'));
  };
  const db = o.db ?? openDatabase(':memory:');
  const calls = new FlightAwareCallLog(db);
  const log = createLogger(clock, 'debug', (l) => lines.push(l));
  const src = new FlightAwareRouteSource({ fetch, apiKey: KEY, clock, log, calls, timeoutMs: 1000, monthlyBudgetUsd: o.budget ?? 4.5, monthlyRequestCap: o.cap ?? 900, usageSyncMinutes: 30, usageLagMinutes: 15, billingPeriodStartDay: 1 });
  return { src, clock, calls, lines, seen, db };
}
const ready = async (o: Parameters<typeof mk>[0] = {}) => { const r = mk(o); await r.src.syncUsage(); r.seen.length = 0; return r; };
const flightCalls = (r: Rig) => r.seen.filter((s) => s.url.includes('/flights/')).length;

describe('flight choice (pure)', () => {
  const f = (off: string | null, on: string | null, extra: object = {}) => ({ actual_off: off, actual_on: on, ...extra });
  it('a flight in the air (actual_off set, actual_on null) wins over newer completed ones', () => {
    const air = f('2026-10-27T10:00:00Z', null, { id: 'air' });
    expect(pickFlight([f('2026-10-27T12:00:00Z', '2026-10-27T13:00:00Z'), air])).toBe(air);
  });
  it('else the most recent actual_off', () => {
    const newest = f('2026-10-27T12:00:00Z', '2026-10-27T13:00:00Z');
    expect(pickFlight([f('2026-10-26T12:00:00Z', '2026-10-26T13:00:00Z'), newest])).toBe(newest);
  });
  it('empty flights[], garbage and flights that never departed are unknown', () => {
    expect(pickFlight([])).toBeNull();
    expect(pickFlight(undefined)).toBeNull();
    expect(pickFlight([f(null, null)])).toBeNull();
    expect(flightToRoute(null)).toBeNull();
  });
});

describe('FlightAwareRouteSource contract (recorded fixtures)', () => {
  it('LHX1HL resolves to LHX1979 Cologne/Bonn -> Munich with city and name', async () => {
    const r = await ready({ flights: fixture('flights-LHX1HL') });
    const route = (await r.src.lookup('LHX1HL', { lat: 50, lon: 8 }, NB)) as Route;
    expect(route.source).toBe('flightaware');
    expect(route.from.city).toBe('Cologne/Bonn');
    expect(route.to.city).toBe('Munich');
    expect(route.to.name).toBeTruthy();
    expect(route.legs).toHaveLength(2);
  });
  it('TKJ9GC picks the most recent completed flight TKJ26 EDDL -> LTFJ', async () => {
    const r = await ready({ flights: fixture('flights-TKJ9GC') });
    const route = (await r.src.lookup('TKJ9GC', { lat: 50, lon: 8 }, NB)) as Route;
    expect(route.to.city).toBe('Istanbul');
    expect(JSON.parse(fixture('flights-TKJ9GC')).flights[0].actual_off > JSON.parse(fixture('flights-TKJ9GC')).flights[1].actual_off).toBe(true);
  });
  it('LAV8091: the running return leg is position_only with destination null = unknown', async () => {
    const r = await ready({ flights: fixture('flights-LAV8091') });
    expect(await r.src.lookup('LAV8091', { lat: 50, lon: 8 }, NB)).toBeNull();
  });
  it('request: designator ident, max_pages=1, now -/+ 1 day window, x-apikey header; the usage sync uses the period start', async () => {
    const r = mk();
    await r.src.syncUsage();
    await r.src.lookup('lhx1hl', { lat: 50, lon: 8 }, NB);
    const usage = new URL(r.seen[0].url);
    expect(usage.pathname).toBe('/aeroapi/account/usage');
    expect(usage.searchParams.get('start')).toBe('2026-10-01T00:00:00Z');
    expect(usage.searchParams.get('end')).toBe('2026-10-27T16:00:00Z');
    const u = new URL(r.seen[1].url);
    expect(u.origin + u.pathname).toBe('https://aeroapi.flightaware.com/aeroapi/flights/LHX1HL');
    expect(u.searchParams.get('ident_type')).toBe('designator');
    expect(u.searchParams.get('max_pages')).toBe('1');
    expect(u.searchParams.get('start')).toBe('2026-10-26T16:00:00Z');
    expect(u.searchParams.get('end')).toBe('2026-10-28T16:00:00Z');
    expect(r.seen[1].headers?.['x-apikey']).toBe(KEY);
  });
});

describe('error cases', () => {
  it.each([401, 403])('HTTP %i is unavailable and closes the adapter until restart (no further HTTP call)', async (status) => {
    const r = await ready({ flights: status });
    await expect(r.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB)).rejects.toBeInstanceOf(SourceError);
    expect(r.src.eligible(NB)).toBe(false);
    r.seen.length = 0;
    await expect(r.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB)).rejects.toBeInstanceOf(SourceError);
    expect(r.seen).toHaveLength(0);
    expect(await r.src.syncUsage()).toBe(false);
    expect(r.seen).toHaveLength(0);
    expect(r.lines.join('\n')).not.toContain(KEY);
  });
  it.each([['429', 429], ['500', 500], ['503', 503], ['timeout', 'timeout' as const], ['broken JSON', '{nope']])('%s is unavailable without closing the adapter', async (_n, flights) => {
    const r = await ready({ flights });
    await expect(r.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB)).rejects.toBeInstanceOf(SourceError);
    expect(r.src.eligible(NB)).toBe(true);
    expect(r.lines.join('\n')).not.toContain(KEY);
  });
  it('a lookup outside eligibility throws unavailable without any HTTP call', async () => {
    const r = await ready();
    await expect(r.src.lookup('LHX1HL', { lat: 0, lon: 0 })).rejects.toBeInstanceOf(SourceError);
    expect(r.seen).toHaveLength(0);
  });
});

describe('chain integration', () => {
  const POS = { lat: 50, lon: 8 };
  const free = (name: string, r: Route | null | 'throw'): RouteSource => ({ name, async lookup() { if (r === 'throw') throw new SourceError('unavailable'); return r; } });
  const HIT: Route = { from: { name: 'A', city: 'A', lat: 50, lon: 8 }, to: { name: 'B', city: 'B', lat: 51, lon: 9 } };
  const svc = (s: RouteSource[], compareAll = false) => new RouteService(s, new FakeClock(T0), { ttlMs: 3_600_000, negativeTtlMs: 600_000, compareAll });
  it('is the last stage: asked after unknown/unavailable free sources, even when listed first, with attempts recorded', async () => {
    const r = await ready();
    const lookup = await svc([r.src, free('adsbdb', null), free('vrs', 'throw')]).lookupFor('LHX1HL', POS, NB);
    expect(lookup?.attempts.map((a) => a.source)).toEqual(['adsbdb', 'vrs', 'flightaware']);
    expect(lookup).toMatchObject({ chosen: 'flightaware', info: { text: 'Cologne/Bonn → Munich', source: 'flightaware' } });
    expect(flightCalls(r)).toBe(1);
  });
  it('0 FlightAware calls when a free source hits (also with compareAll)', async () => {
    for (const compareAll of [false, true]) {
      const r = await ready();
      await svc([free('adsbdb', HIT), r.src], compareAll).lookupFor('LHX1HL', POS, NB);
      expect(flightCalls(r)).toBe(0);
    }
  });
  it('an implausible (rejected) free hit does not block FlightAware', async () => {
    const r = await ready();
    const far: Route = { from: { name: 'S', city: 'S', lat: -33, lon: 151 }, to: { name: 'T', city: 'T', lat: -37, lon: 174 } };
    await svc([free('vrs', far), r.src]).lookupFor('LHX1HL', POS, NB);
    expect(flightCalls(r)).toBe(1);
  });
  it('filter: light-aircraft, glider, helicopter, business-jet, turboprop, regional-jet and unknown airline make 0 calls; narrowbody and bigger exactly 1', async () => {
    for (const typklasse of ['light-aircraft', 'glider', 'helicopter', 'business-jet', 'turboprop', 'regional-jet']) {
      const r = await ready();
      await svc([free('vrs', null), r.src]).lookupFor('LHX1HL', POS, { typklasse, airlineKnown: true });
      expect(flightCalls(r), typklasse).toBe(0);
    }
    const r0 = await ready();
    await svc([r0.src]).lookupFor('LHX1HL', POS, { typklasse: 'narrowbody', airlineKnown: false });
    await svc([r0.src]).lookupFor('LHX1HL', POS);
    expect(flightCalls(r0)).toBe(0);
    for (const typklasse of PAID_LOOKUP_CLASSES) {
      const r = await ready();
      await svc([r.src]).lookupFor('LHX1HL', POS, { typklasse, airlineKnown: true });
      expect(flightCalls(r), typklasse).toBe(1);
    }
    expect([...PAID_LOOKUP_CLASSES]).toEqual(['narrowbody', 'widebody', 'jumbo-hump', 'double-decker']);
  });
});

describe('call log (migration 0004)', () => {
  it('every call writes exactly one row, failures with cost 0; the sync counts as a call with cost 0', async () => {
    const r = mk();
    await r.src.syncUsage();
    await r.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB);
    expect(r.calls.count()).toBe(2);
    expect(r.calls.costSince(0)).toBeCloseTo(0.005, 6);
    for (const [flights, status] of [[401, 401], [429, 429], [500, 500], ['timeout', null]] as const) {
      const x = await ready({ flights });
      await x.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB).catch(() => undefined);
      const rows = x.db.prepare("SELECT status, result_sets, cost_usd FROM flightaware_calls WHERE endpoint = 'flights'").all();
      expect(rows).toEqual([{ status, result_sets: 0, cost_usd: 0 }]);
    }
    expect(r.db.prepare("SELECT endpoint, status, result_sets, cost_usd FROM flightaware_calls ORDER BY id").all()).toEqual([{ endpoint: 'usage', status: 200, result_sets: 0, cost_usd: 0 }, { endpoint: 'flights', status: 200, result_sets: 1, cost_usd: 0.005 }]);
  });
  it('migration 0004 is idempotent on an existing file DB and rows survive a restart', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-fa-'));
    try {
      const file = path.join(dir, 'x.db');
      const a = openDatabase(file);
      new FlightAwareCallLog(a).record({ ts: T0, endpoint: 'flights', status: 200, resultSets: 1, costUsd: 0.005 });
      a.close();
      const b = openDatabase(file);
      expect(new FlightAwareCallLog(b).count()).toBe(1);
      expect(b.pragma('table_info(flightaware_calls)') as { name: string }[]).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'ts' }), expect.objectContaining({ name: 'endpoint' }), expect.objectContaining({ name: 'status' }), expect.objectContaining({ name: 'result_sets' }), expect.objectContaining({ name: 'cost_usd' })]));
      b.close();
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
  it('rows before the period start are pruned', async () => {
    const r = await ready();
    r.calls.record({ ts: Date.UTC(2026, 8, 30), endpoint: 'flights', status: 200, resultSets: 1, costUsd: 0.005 });
    r.calls.record({ ts: Date.UTC(2026, 9, 2), endpoint: 'flights', status: 200, resultSets: 1, costUsd: 0.005 });
    const before = r.calls.count();
    r.src.eligible(NB);
    expect(r.calls.count()).toBe(before - 1);
  });
});

describe('budget', () => {
  it('estimate = own period sum when there is no foreign usage', async () => {
    const r = await ready();
    for (let i = 0; i < 3; i++) await r.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB);
    expect(r.src.estimateUsd()).toBeCloseTo(0.015, 6);
  });
  it('estimate = last sync total + own cost of the lag window when that is higher (foreign usage)', async () => {
    const r = await ready({ usage: JSON.stringify({ ...JSON.parse(fixture('usage')), total_cost: 2 }) });
    r.calls.record({ ts: T0 - 20 * 60_000, endpoint: 'flights', status: 200, resultSets: 1, costUsd: 0.005 }); // outside the 15 min lag window
    r.calls.record({ ts: T0 - 5 * 60_000, endpoint: 'flights', status: 200, resultSets: 1, costUsd: 0.005 }); // inside
    expect(r.src.estimateUsd()).toBeCloseTo(2.005, 6);
  });
  it('estimate keeps the own sum when it exceeds the stale sync value', async () => {
    const r = await ready();
    r.calls.record({ ts: T0 - 3 * 3_600_000, endpoint: 'flights', status: 200, resultSets: 1, costUsd: 0.5 });
    expect(r.src.estimateUsd()).toBeCloseTo(0.5, 6);
  });
  it('stops before the budget would be reached (estimate + one query < budget), warns exactly once, resets in the next period', async () => {
    const r = await ready({ budget: 0.02 });
    const results: boolean[] = [];
    for (let i = 0; i < 6; i++) results.push(r.src.eligible(NB));
    expect(results.slice(0, 1)).toEqual([true]);
    let paid = 0;
    const stopAt = mk({ budget: 0.02 });
    await stopAt.src.syncUsage();
    while (stopAt.src.eligible(NB) && paid < 10) { await stopAt.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB); paid++; }
    expect(paid).toBe(3); // 3 x 0.005 + 0.005 = 0.020 is not < 0.02
    for (let i = 0; i < 5; i++) expect(stopAt.src.eligible(NB)).toBe(false);
    expect(stopAt.lines.filter((l) => l.includes('budget exhausted'))).toHaveLength(1);
    await stopAt.clock.advance(5 * 86_400_000); // 2026-11-01: new period; the sync of the old period no longer counts
    await stopAt.src.syncUsage();
    expect(stopAt.src.eligible(NB)).toBe(true);
    for (let i = 0; i < 5; i++) { if (stopAt.src.eligible(NB)) await stopAt.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB); }
    expect(stopAt.lines.filter((l) => l.includes('budget exhausted'))).toHaveLength(2);
  });
  it('monthlyRequestCap: result sets must stay below the cap', async () => {
    const r = await ready({ cap: 2 });
    await r.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB);
    await r.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB);
    expect(r.src.eligible(NB)).toBe(false);
    expect(flightCalls(r)).toBe(2);
  });
  it('periodStart honours billingPeriodStartDay', () => {
    expect(periodStart(Date.UTC(2026, 9, 27), 1)).toBe(Date.UTC(2026, 9, 1));
    expect(periodStart(Date.UTC(2026, 9, 9), 10)).toBe(Date.UTC(2026, 8, 10));
    expect(periodStart(Date.UTC(2026, 0, 3), 10)).toBe(Date.UTC(2025, 11, 10));
    expect(periodStart(Date.UTC(2026, 9, 10), 10)).toBe(Date.UTC(2026, 9, 10));
  });
});

describe('usage sync', () => {
  it('without a successful sync at start there are 0 paid calls; a later successful sync opens the adapter', async () => {
    const r = mk({ usage: 500 });
    await r.src.start();
    expect(r.src.eligible(NB)).toBe(false);
    await expect(r.src.lookup('LHX1HL', { lat: 0, lon: 0 }, NB)).rejects.toBeInstanceOf(SourceError);
    expect(flightCalls(r)).toBe(0);
    const ok = mk();
    await ok.src.start();
    expect(ok.src.eligible(NB)).toBe(true);
  });
  it('syncs at start (start = period start) and again every usageSyncMinutes; sync calls cost 0', async () => {
    const r = mk();
    const cancel = await r.src.start();
    expect(r.seen).toHaveLength(1);
    expect(r.seen[0].url).toContain('start=2026-10-01T00%3A00%3A00Z');
    await r.clock.advance(29 * 60_000);
    expect(r.seen).toHaveLength(1);
    await r.clock.advance(60_000);
    expect(r.seen).toHaveLength(2);
    expect(r.calls.costSince(0)).toBe(0);
    cancel();
    await r.clock.advance(60 * 60_000);
    expect(r.seen).toHaveLength(2);
  });
});

describe('persistence of FlightAware routes', () => {
  it('route text and route_source flightaware are stored; findings go to route_lookups; adsbdb text still is not', () => {
    const db = openDatabase(':memory:');
    const repo = new SightingRepository(db, 30 * 60_000);
    const base = { icao24: 'abc', callsign: 'LHX1HL', typklasse: 'narrowbody', liveryPresent: false, distanceKm: 3, slot: 1 };
    repo.observe({ ...base, route: 'Cologne/Bonn → Munich', routeSource: 'flightaware' }, T0);
    repo.observe({ ...base, icao24: 'def', route: 'X → Y', routeSource: 'adsbdb' }, T0);
    repo.recordLookup('abc', [{ source: 'adsbdb', outcome: 'unknown' }, { source: 'flightaware', outcome: 'hit' }], false, 'flightaware', T0);
    const rows = db.prepare('SELECT icao24, route, route_source FROM sightings ORDER BY icao24').all();
    expect(rows).toEqual([{ icao24: 'abc', route: 'Cologne/Bonn → Munich', route_source: 'flightaware' }, { icao24: 'def', route: null, route_source: 'adsbdb' }]);
    expect(db.prepare('SELECT source, outcome, chosen FROM route_lookups ORDER BY id').all()).toEqual([{ source: 'adsbdb', outcome: 'unknown', chosen: 0 }, { source: 'flightaware', outcome: 'hit', chosen: 1 }]);
  });
});

describe('config', () => {
  const MIN = 'location: { lat: 50, lon: 8 }\n';
  const fa = (y: string) => parseConfig(MIN + `sources: { route: { flightaware: { ${y} } } }\n`).sources.route.flightaware;
  it('order accepts flightaware; the default order does not contain it', () => {
    expect(parseConfig(MIN + 'sources: { route: { order: [adsbdb, vrs, flightaware] } }\n').sources.route.order).toEqual(['adsbdb', 'vrs', 'flightaware']);
    expect(parseConfig(MIN).sources.route.order).not.toContain('flightaware');
  });
  it('defaults', () => {
    expect(parseConfig(MIN).sources.route.flightaware).toMatchObject({ monthlyBudgetUsd: 4.5, monthlyRequestCap: 900, usageSyncMinutes: 30, usageLagMinutes: 15, billingPeriodStartDay: 1 });
  });
  it.each([['monthlyBudgetUsd', 0], ['monthlyBudgetUsd', -1], ['monthlyRequestCap', 0], ['monthlyRequestCap', 1.5], ['usageSyncMinutes', 31], ['usageSyncMinutes', 0], ['billingPeriodStartDay', 0], ['billingPeriodStartDay', 29], ['usageLagMinutes', 0]])('rejects %s: %s and names the key', (key, v) => {
    expect(() => fa(`${key}: ${v}`)).toThrow(new RegExp(`flightaware\\.${key}`));
  });
  it('accepts valid values', () => {
    expect(fa('monthlyBudgetUsd: 2, monthlyRequestCap: 100, usageSyncMinutes: 10, billingPeriodStartDay: 28, usageLagMinutes: 20')).toMatchObject({ monthlyBudgetUsd: 2, monthlyRequestCap: 100, usageSyncMinutes: 10, billingPeriodStartDay: 28, usageLagMinutes: 20 });
  });
  it('there is no apiKey setting: the key only comes from the environment', () => {
    expect(Object.keys(parseConfig(MIN).sources.route.flightaware)).not.toContain('apiKey');
  });
});

describe('secret handling in the composition root', () => {
  let svc: Service | undefined;
  let dir: string;
  afterEach(async () => { await svc?.stop(); svc = undefined; if (dir) fs.rmSync(dir, { recursive: true, force: true }); });
  async function boot(env: Record<string, string | undefined>, fetchImpl: Fetch) {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-fa-app-'));
    const lines: string[] = [];
    const config = parseConfig(`port: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.05, lon: 8.57 }\nspeech: { adapter: fake }\nsources: { route: { order: [adsbdb, flightaware] } }\n`);
    svc = await startService({ config, clientDir: path.join(dir, 'client'), write: (l) => lines.push(l), timeZone: 'UTC', env, fetch: fetchImpl });
    return lines;
  }
  const ok = (body: string) => ({ ok: true, status: 200, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
  it('without FLIGHTAWARE_API_KEY the adapter is disabled with exactly one warning and AeroAPI is never called', async () => {
    const urls: string[] = [];
    const lines = await boot({}, async (url) => { urls.push(url); return ok('{"states":[]}'); });
    expect(lines.filter((l) => l.includes('FLIGHTAWARE_API_KEY'))).toHaveLength(1);
    expect(urls.some((u) => u.includes('flightaware.com'))).toBe(false);
  });
  it('with the key: usage sync at startup using x-apikey; the key appears in no log line, /api/state or /healthz', async () => {
    const seen: Req[] = [];
    const lines = await boot({ FLIGHTAWARE_API_KEY: KEY }, async (url, init) => { seen.push({ url, headers: init?.headers }); return ok(url.includes('/account/usage') ? fixture('usage') : '{"ac":[]}'); });
    const usage = seen.filter((s) => s.url.includes('/account/usage'));
    expect(usage).toHaveLength(1);
    expect(usage[0].headers?.['x-apikey']).toBe(KEY);
    const base = `http://127.0.0.1:${(svc as Service).port}`;
    const bodies = [await (await realFetch(base + '/api/state')).text(), await (await realFetch(base + '/healthz')).text()];
    for (const b of bodies) expect(b).not.toContain(KEY);
    expect(lines.join('\n')).not.toContain(KEY);
  });
  it('a failing usage sync (401) keeps the adapter closed and logs no key', async () => {
    const seen: string[] = [];
    const lines = await boot({ FLIGHTAWARE_API_KEY: KEY }, async (url) => { seen.push(url); return url.includes('/account/usage') ? { ok: false, status: 401, text: async () => '{}', arrayBuffer: async () => new ArrayBuffer(0) } : ok('{"ac":[]}'); });
    expect(seen.some((u) => u.includes('/flights/'))).toBe(false);
    expect(lines.join('\n')).not.toContain(KEY);
  });
});
