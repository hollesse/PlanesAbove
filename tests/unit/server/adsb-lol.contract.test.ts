// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { AdsbLolFlightSource, kmToNm } from '../../../src/server/modules/airspace/adapters/adsb-lol';
import { SourceError } from '../../../src/server/modules/airspace/model';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';

const fixture = (n: string): string => fs.readFileSync(new URL(`../../fixtures/${n}`, import.meta.url), 'utf8');
const reply = (status: number, body: string): Fetch => async () => ({ ok: status >= 200 && status < 300, status, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
const src = (f: Fetch, timeoutMs = 1000) => new AdsbLolFlightSource({ fetch: f, userAgent: 'test', timeoutMs });
const HOME = { lat: 50.05, lon: 8.57 };

describe('AdsbLolFlightSource contract (recorded fixtures)', () => {
  it('converts the radius to integer nautical miles (30 km -> 17 nm)', () => {
    expect(kmToNm(30)).toBe(17);
  });
  it('requests /v2/point/{lat}/{lon}/{radius_nm} with a polite user agent', async () => {
    let seen: { url?: string; ua?: string } = {};
    await src(async (url, init) => { seen = { url, ua: init?.headers?.['user-agent'] }; return { ok: true, status: 200, text: async () => fixture('adsblol-point-frankfurt.json'), arrayBuffer: async () => new ArrayBuffer(0) }; }).fetchAircraft(HOME, 30);
    expect(seen).toEqual({ url: 'https://api.adsb.lol/v2/point/50.05/8.57/17', ua: 'test' });
  });
  it('normalises a real recorded response into Flugzeug (units, trimmed callsign)', async () => {
    const r = await src(reply(200, fixture('adsblol-point-frankfurt.json'))).fetchAircraft(HOME, 30);
    expect(r).toHaveLength(2);
    const ezy = r.find((a) => a.icao24 === '40768a')!;
    expect(ezy).toMatchObject({ callsign: 'EZY25YP', typeCode: 'A20N', registration: 'G-UZHV', emitterCategory: 'A3', onGround: false, lat: 50.013428, lon: 8.826141 });
    expect(ezy.altitudeM).toBeCloseTo(37975 * 0.3048, 1);
    expect(ezy.speedKmh).toBeCloseTo(393.7 * 1.852, 1);
  });
  it('tolerates missing fields, ground traffic and position-less entries', async () => {
    const r = await src(reply(200, fixture('adsblol-point-edge-cases.json'))).fetchAircraft(HOME, 30);
    expect(r.map((a) => a.icao24)).toEqual(['3c6444', 'abcdef', '4ca123']);
    expect(r[0]).toMatchObject({ onGround: true, typeCode: 'A359' });
    expect(r[1]).toMatchObject({ callsign: undefined, typeCode: undefined, emitterCategory: undefined, onGround: false });
    expect(r[2].verticalRateMs).toBeCloseTo(-1200 * 0.00508, 3);
  });
  it('maps 403, 429, 5xx, 4xx to typed SourceErrors', async () => {
    const cls = async (status: number) => src(reply(status, fixture('adsblol-error-403.json'))).fetchAircraft(HOME, 30).catch((e: SourceError) => e.errorClass);
    expect(await cls(403)).toBe('http-403');
    expect(await cls(429)).toBe('http-429');
    expect(await cls(503)).toBe('http-5xx');
    expect(await cls(404)).toBe('http-4xx');
  });
  it('maps a hanging request to a timeout', async () => {
    const hang: Fetch = (_u, init) => new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(init.signal!.reason)));
    expect(await src(hang, 20).fetchAircraft(HOME, 30).catch((e: SourceError) => e.errorClass)).toBe('timeout');
  });
  it('maps a connection failure to network and garbage to parse', async () => {
    expect(await src(async () => { throw new TypeError('fetch failed'); }).fetchAircraft(HOME, 30).catch((e: SourceError) => e.errorClass)).toBe('network');
    expect(await src(reply(200, '<html>oops')).fetchAircraft(HOME, 30).catch((e: SourceError) => e.errorClass)).toBe('parse');
    expect(await src(reply(200, '{"msg":"x"}')).fetchAircraft(HOME, 30).catch((e: SourceError) => e.errorClass)).toBe('parse');
  });
});
