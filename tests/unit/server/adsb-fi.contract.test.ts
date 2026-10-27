// @vitest-environment node
// Fixture adsbfi-v3-point-oberweyer.json: real adsb.fi v3 response recorded 2026-10-27 (GET /api/v3/lat/50.45/lon/8.09/dist/17), 3 aircraft, keyless.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { AdsbFiFlightSource } from '../../../src/server/modules/airspace/adapters/adsb-fi';
import { AdsbLolFlightSource } from '../../../src/server/modules/airspace/adapters/adsb-lol';
import { SourceError } from '../../../src/server/modules/airspace/model';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';

const fixture = (n: string): string => fs.readFileSync(new URL(`../../fixtures/${n}`, import.meta.url), 'utf8');
const reply = (status: number, body: string, headers: Record<string, string> = {}): Fetch => async () => ({ ok: status >= 200 && status < 300, status, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null }, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
const fi = (f: Fetch) => new AdsbFiFlightSource({ fetch: f, userAgent: 'test', timeoutMs: 1000 });
const lol = (f: Fetch) => new AdsbLolFlightSource({ fetch: f, userAgent: 'test', timeoutMs: 1000 });
const err = async (src: AdsbFiFlightSource): Promise<SourceError> => { try { await src.fetchAircraft(HOME, 30); } catch (e) { return e as SourceError; } throw new Error('expected a SourceError'); };
const HOME = { lat: 50.45, lon: 8.09 };

describe('AdsbFiFlightSource contract', () => {
  it('requests the v3 path with a polite user agent', async () => {
    let seen: { url?: string; ua?: string } = {};
    await fi(async (url, init) => { seen = { url, ua: init?.headers?.['user-agent'] }; return reply(200, fixture('adsbfi-v3-point-oberweyer.json'))(url, init); }).fetchAircraft(HOME, 30);
    expect(seen).toEqual({ url: 'https://opendata.adsb.fi/api/v3/lat/50.45/lon/8.09/dist/17', ua: 'test' });
  });
  it('normalises the recorded response identically to the adsb.lol adapter', async () => {
    const body = fixture('adsbfi-v3-point-oberweyer.json');
    const a = await fi(reply(200, body)).fetchAircraft(HOME, 30);
    expect(a).toHaveLength(3);
    expect(a).toEqual(await lol(reply(200, body)).fetchAircraft(HOME, 30));
    expect(a.find((x) => x.icao24 === '4d2257')).toMatchObject({ callsign: 'RYR5CB', typeCode: 'B738', registration: '9H-QDA', emitterCategory: 'A3' });
  });
  it('tolerates missing category and geom_rate', async () => {
    const r = await fi(reply(200, JSON.stringify({ ac: [{ hex: 'ABC123', lat: 50, lon: 8, alt_baro: 5000, baro_rate: 600 }] }))).fetchAircraft(HOME, 30);
    expect(r[0]).toMatchObject({ icao24: 'abc123', emitterCategory: undefined });
    expect(r[0].verticalRateMs).toBeCloseTo(600 * 0.00508, 3);
  });
  it.each([400, 401, 403, 404, 429])('HTTP %i asks for a pause of at least 60 s', async (status) => {
    const e = await err(fi(reply(status, '')));
    expect(e).toBeInstanceOf(SourceError);
    expect(e.retryAfterMs).toBeGreaterThanOrEqual(60_000);
  });
  it('a 429 with a longer Retry-After keeps the longer pause', async () => {
    const e = await err(fi(reply(429, '', { 'retry-after': '120' })));
    expect(e.retryAfterMs).toBe(120_000);
  });
  it.each([500, 503])('HTTP %i, timeout, parse errors carry no pause', async (status) => {
    const e = await err(fi(reply(status, '')));
    expect(e.errorClass).toBe('http-5xx'); expect(e.retryAfterMs).toBeUndefined();
    const p = await err(fi(reply(200, 'nope')));
    expect(p.errorClass).toBe('parse'); expect(p.retryAfterMs).toBeUndefined();
    const t = await err(fi(async () => { throw Object.assign(new Error('x'), { name: 'TimeoutError' }); }));
    expect(t.errorClass).toBe('timeout'); expect(t.retryAfterMs).toBeUndefined();
  });
});
