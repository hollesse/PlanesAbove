// @vitest-environment node
// adsb.lol daily request budget (airspace-b9r4w): persisted UTC-day counter, header handling, chain skipping, /healthz.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { openDatabase, type Db } from '../../../src/server/db';
import { createLogger } from '../../../src/server/logger';
import { parseConfig } from '../../../src/server/config';
import { startService, type Service } from '../../../src/server/app';
import { DailyRequestBudget } from '../../../src/server/modules/airspace/flight-source-budget';
import { AdsbLolFlightSource } from '../../../src/server/modules/airspace/adapters/adsb-lol';
import { FlightSourceChain } from '../../../src/server/modules/airspace/flight-source-chain';
import { SourceError, type FlightSource, type Flugzeug } from '../../../src/server/modules/airspace/model';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';

const C = { lat: 50, lon: 8 };
const T0 = Date.UTC(2026, 9, 27, 22, 0, 0); // 22:00 UTC, two hours before midnight
const body = JSON.stringify({ ac: [{ hex: 'abc123', lat: 50, lon: 8 }] });
const res = (status: number, text: string, headers: Record<string, string> = {}) => ({ ok: status < 300, status, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null }, text: async () => text, arrayBuffer: async () => new ArrayBuffer(0) });

let dir: string;
const dbs: Db[] = [];
let svc: Service | undefined;
afterEach(async () => { await svc?.stop(); svc = undefined; dbs.splice(0).forEach((d) => { try { d.close(); } catch { /* closed */ } }); if (dir) fs.rmSync(dir, { recursive: true, force: true }); });
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-budget-')); });
const openDb = () => { const d = openDatabase(path.join(dir, 'b.db')); dbs.push(d); return d; };

class Fake implements FlightSource {
  calls = 0;
  constructor(readonly name: string, public behaviour: () => Flugzeug[] = () => [{ icao24: 'a' } as Flugzeug]) {}
  async fetchAircraft(): Promise<Flugzeug[]> { this.calls++; return this.behaviour(); }
}
function rig(opts: { cap: number; fetch: Fetch; clock?: FakeClock; db?: Db; others?: FlightSource[] }) {
  const clock = opts.clock ?? new FakeClock(T0);
  const db = opts.db ?? openDb();
  const budget = new DailyRequestBudget({ db, clock, source: 'adsb-lol', cap: opts.cap });
  const lol = new AdsbLolFlightSource({ fetch: opts.fetch, userAgent: 'x', timeoutMs: 1000, budget });
  const log = createLogger(clock, 'error', () => undefined);
  const chain = new FlightSourceChain([...(opts.others ?? []), lol], { clock, log, jitter: () => 1 });
  budget.onExhausted = (ms) => chain.blockFor('adsb-lol', ms, 'blocked');
  budget.checkExhausted();
  return { clock, db, budget, chain };
}
const boom = () => { throw new SourceError('http-5xx'); };

describe('adsb.lol daily budget', () => {
  it('cap reached: no more calls until 00:00 UTC, then it is asked again', async () => {
    let calls = 0;
    const { chain, clock, budget } = rig({ cap: 3, fetch: async () => { calls++; return res(200, body); } });
    for (let i = 0; i < 5; i++) await chain.fetchAircraft(C, 30).catch(() => undefined);
    expect(calls).toBe(3);
    expect(budget.status()).toMatchObject({ used: 3, cap: 3, remaining: 0, resetsAt: Date.UTC(2026, 9, 28) });
    expect(chain.status().sources[0]).toMatchObject({ state: 'blocked', until: Date.UTC(2026, 9, 28) });
    await clock.advance(2 * 3_600_000 - 1);
    await expect(chain.fetchAircraft(C, 30)).rejects.toMatchObject({ errorClass: 'unavailable' });
    await clock.advance(1);
    await expect(chain.fetchAircraft(C, 30)).resolves.toHaveLength(1);
    expect(calls).toBe(4);
    expect(budget.status().used).toBe(1);
  });
  it('counter survives a restart (file-backed DB)', async () => {
    const f = rig({ cap: 2, fetch: async () => res(200, body) });
    await f.chain.fetchAircraft(C, 30); await f.chain.fetchAircraft(C, 30);
    f.db.close();
    let calls = 0;
    const g = rig({ cap: 2, clock: f.clock, db: openDb(), fetch: async () => { calls++; return res(200, body); } });
    expect(g.budget.status().used).toBe(2);
    expect(g.chain.status().sources[0].state).toBe('blocked');
    await expect(g.chain.fetchAircraft(C, 30)).rejects.toMatchObject({ errorClass: 'unavailable' });
    expect(calls).toBe(0);
  });
  it('x-ratelimit-remaining: 3 overrides the local reserve', async () => {
    const { chain, budget } = rig({ cap: 400, fetch: async () => res(200, body, { 'x-ratelimit-remaining': '3' }) });
    await chain.fetchAircraft(C, 30);
    expect(budget.status()).toMatchObject({ used: 397, remaining: 3 });
  });
  it('a higher x-ratelimit-remaining never lowers local consumption', async () => {
    const { chain, budget } = rig({ cap: 400, fetch: async () => res(200, body, { 'x-ratelimit-remaining': '499' }) });
    await chain.fetchAircraft(C, 30);
    expect(budget.status().used).toBe(1);
  });
  it('429 with x-ratelimit-reset 25203 blocks exactly 25203 s and still counts', async () => {
    const { chain, clock, budget } = rig({ cap: 400, fetch: async () => res(429, '', { 'x-ratelimit-reset': '25203', 'x-ratelimit-remaining': '0' }) });
    await expect(chain.fetchAircraft(C, 30)).rejects.toMatchObject({ errorClass: 'http-429', retryAfterMs: 25_203_000 });
    expect(chain.status().sources[0]).toMatchObject({ state: 'blocked', until: clock.now() + 25_203_000 });
    expect(budget.status().used).toBe(1);
  });
  it('two stages: adsb.lol asked only when adsb.fi fails in the same Takt; skipped when exhausted', async () => {
    let calls = 0;
    const s1 = new Fake('adsb-fi');
    const r = rig({ cap: 1, others: [s1], fetch: async () => { calls++; return res(200, body); } });
    await r.chain.fetchAircraft(C, 30);
    expect(calls).toBe(0);
    s1.behaviour = boom; // stage 1 fails: adsb.lol asked
    await r.chain.fetchAircraft(C, 30);
    expect(calls).toBe(1);
    await expect(r.chain.fetchAircraft(C, 30)).rejects.toMatchObject({ errorClass: 'http-5xx' }); // exhausted: skipped
    expect(calls).toBe(1);
  });
  it('a failing cap-reaching call (429, short reset) does not shorten the block until 00:00 UTC', async () => {
    let calls = 0;
    const { chain, clock } = rig({ cap: 1, fetch: async () => { calls++; return res(429, '', { 'x-ratelimit-reset': '10' }); } });
    await expect(chain.fetchAircraft(C, 30)).rejects.toMatchObject({ errorClass: 'http-429' });
    expect(chain.status().sources[0]).toMatchObject({ state: 'blocked', until: Date.UTC(2026, 9, 28) });
    await clock.advance(60_000);
    await expect(chain.fetchAircraft(C, 30)).rejects.toMatchObject({ errorClass: 'unavailable' });
    expect(calls).toBe(1);
  });
  it('a failing cap-reaching call that opens the breaker keeps the midnight block', async () => {
    let calls = 0;
    const { chain, clock } = rig({ cap: 3, fetch: async () => { calls++; return res(500, ''); } });
    for (let i = 0; i < 3; i++) await chain.fetchAircraft(C, 30).catch(() => undefined);
    expect(chain.status().sources[0]).toMatchObject({ until: Date.UTC(2026, 9, 28) });
    await clock.advance(10 * 60_000);
    await chain.fetchAircraft(C, 30).catch(() => undefined);
    expect(calls).toBe(3);
  });
  it('/healthz shows used/cap and reset for adsb-lol', async () => {
    const config = parseConfig(`port: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.45, lon: 8.09 }\nspeech: { adapter: fake }\nsources: { route: { enabled: false }, flight: { adsbLol: { dailyRequestCap: 5 } } }\n`);
    svc = await startService({ config, clientDir: path.join(dir, 'client'), write: () => undefined, timeZone: 'UTC', fetch: async (url) => (url.includes('adsb.fi') ? res(500, '') : res(200, body)) });
    const base = `http://127.0.0.1:${svc.port}`;
    await fetch(base + '/api/state');
    const h = (await (await fetch(base + '/healthz')).json()) as { flight: { sources: { name: string; budget?: { used: number; cap: number; resetsAt: number } }[] } };
    const lol = h.flight.sources.find((s) => s.name === 'adsb-lol');
    expect(lol?.budget).toMatchObject({ cap: 5 });
    expect(lol?.budget?.used).toBeGreaterThanOrEqual(1);
    expect(lol?.budget?.resetsAt).toBeGreaterThan(Date.now());
  });
  it('config: dailyRequestCap defaults to 400 and must be a positive integer', () => {
    expect(parseConfig('location: { lat: 1, lon: 1 }\n').sources.flight.adsbLol.dailyRequestCap).toBe(400);
    expect(() => parseConfig('location: { lat: 1, lon: 1 }\nsources: { flight: { adsbLol: { dailyRequestCap: 0 } } }\n')).toThrow();
  });
});
