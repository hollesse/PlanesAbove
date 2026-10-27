// @vitest-environment node
// Fixture airplaneslive-error-403.json: real airplanes.live response recorded 2026-10-27 (GET /v2/point/50.45/8.09/17 -> 403, feeder-only).
// The 200 case reuses the adsb.fi recording (same readsb schema), since airplanes.live currently serves no 200 to us.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { FakeClock } from '../../../src/server/clock';
import { createLogger } from '../../../src/server/logger';
import { FlightSourceChain } from '../../../src/server/modules/airspace/flight-source-chain';
import { AirplanesLiveFlightSource, AIRPLANES_LIVE_FORBIDDEN_PAUSE_MS } from '../../../src/server/modules/airspace/adapters/airplanes-live';
import { AdsbLolFlightSource } from '../../../src/server/modules/airspace/adapters/adsb-lol';
import { SourceError } from '../../../src/server/modules/airspace/model';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';

const fixture = (n: string): string => fs.readFileSync(new URL(`../../fixtures/${n}`, import.meta.url), 'utf8');
const reply = (status: number, body: string, headers: Record<string, string> = {}): Fetch => async () => ({ ok: status >= 200 && status < 300, status, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null }, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
const al = (f: Fetch) => new AirplanesLiveFlightSource({ fetch: f, userAgent: 'test', timeoutMs: 1000 });
const lol = (f: Fetch) => new AdsbLolFlightSource({ fetch: f, userAgent: 'test', timeoutMs: 1000 });
const HOME = { lat: 50.45, lon: 8.09 };
const err = async (src: AirplanesLiveFlightSource): Promise<SourceError> => { try { await src.fetchAircraft(HOME, 30); } catch (e) { return e as SourceError; } throw new Error('expected a SourceError'); };

describe('AirplanesLiveFlightSource contract', () => {
  it('requests the v2 point path with a polite user agent', async () => {
    let seen: { url?: string; ua?: string } = {};
    await al(async (url, init) => { seen = { url, ua: init?.headers?.['user-agent'] }; return reply(200, fixture('adsbfi-v3-point-oberweyer.json'))(url, init); }).fetchAircraft(HOME, 30);
    expect(seen).toEqual({ url: 'https://api.airplanes.live/v2/point/50.45/8.09/17', ua: 'test' });
  });
  it('normalises a 200 readsb response identically to adsb.lol', async () => {
    const body = fixture('adsbfi-v3-point-oberweyer.json');
    const a = await al(reply(200, body)).fetchAircraft(HOME, 30);
    expect(a).toHaveLength(3);
    expect(a).toEqual(await lol(reply(200, body)).fetchAircraft(HOME, 30));
  });
  it('the recorded 403 (feeder-only) becomes unavailable with a 1 h pause', async () => {
    const e = await err(al(reply(403, fixture('airplaneslive-error-403.json'))));
    expect(e).toBeInstanceOf(SourceError);
    expect(e.errorClass).toBe('unavailable');
    expect(e.retryAfterMs).toBe(AIRPLANES_LIVE_FORBIDDEN_PAUSE_MS);
  });
  it('429 keeps its Retry-After; 5xx, timeout and parse errors carry no pause', async () => {
    expect((await err(al(reply(429, '', { 'retry-after': '90' })))).retryAfterMs).toBe(90_000);
    const e5 = await err(al(reply(503, '')));
    expect(e5.errorClass).toBe('http-5xx'); expect(e5.retryAfterMs).toBeUndefined();
    expect((await err(al(reply(200, 'nope')))).errorClass).toBe('parse');
    expect((await err(al(async () => { throw Object.assign(new Error('x'), { name: 'TimeoutError' }); }))).errorClass).toBe('timeout');
  });
  it('in the chain a 403 moves on to adsb.lol in the same Takt, warns once per pause and is not asked again', async () => {
    const clock = new FakeClock(1_000_000);
    const lines: { level: string; msg: string }[] = [];
    const log = createLogger(clock, 'debug', (l) => lines.push(JSON.parse(l)));
    let alCalls = 0;
    const a = al(async (u, i) => { alCalls++; return reply(403, fixture('airplaneslive-error-403.json'))(u, i); });
    const chain = new FlightSourceChain([a, lol(reply(200, fixture('adsbfi-v3-point-oberweyer.json')))], { clock, log, jitter: () => 1 });
    expect(await chain.fetchAircraft(HOME, 30)).toHaveLength(3);
    expect(chain.status().active).toBe('adsb-lol');
    await clock.advance(30_000); await chain.fetchAircraft(HOME, 30);
    await clock.advance(30_000); await chain.fetchAircraft(HOME, 30);
    expect(alCalls).toBe(1);
    expect(lines.filter((l) => l.level === 'warn' && l.msg === 'flight source blocked')).toHaveLength(1);
  });
});
