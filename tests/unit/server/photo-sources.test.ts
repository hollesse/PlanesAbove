// @vitest-environment node
// PhotoSource adapters (ADR 0029). Fixtures under tests/fixtures/photos are constructed from the response shapes the research
// aircraft-photo-sources-2026-10-31 verified live (Planespotters hex/reg, Airport-Data ac_thumb, Commons imageinfo+extmetadata); error cases are constructed. All tests offline.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AirportDataPhotoSource } from '../../../src/server/modules/airspace/adapters/airport-data-photo-source';
import { CommonsPhotoSource } from '../../../src/server/modules/airspace/adapters/commons-photo-source';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';
import { PlanespottersPhotoSource } from '../../../src/server/modules/airspace/adapters/planespotters-photo-source';
import type { PhotoSource } from '../../../src/server/modules/airspace/photo-source';

const FIX = path.resolve(import.meta.dirname, '../../fixtures/photos');
const fixture = (n: string): string => fs.readFileSync(path.join(FIX, n + '.json'), 'utf8');
const reply = (status: number, body: string, headers: Record<string, string> = {}): Fetch => async () => ({ ok: status >= 200 && status < 300, status, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null }, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
const o = (f: Fetch) => ({ fetch: f, userAgent: 'UA-test (mailto:me@example.org)', timeoutMs: 1000 });
const Q = { icao24: '3c6444', registration: 'D-AIXA' };

beforeEach(() => { vi.stubGlobal('fetch', () => { throw new Error('real network access in a test'); }); });
afterEach(() => { vi.unstubAllGlobals(); });

/** Shared failure contract: 429 / 5xx / network / timeout / broken JSON are `unavailable`, never "Kein Foto". */
function failureContract(make: (f: Fetch) => PhotoSource, q = Q): void {
  it('429 is unavailable with errorClass http-429 and the Retry-After pause', async () => {
    expect(await make(reply(429, '', { 'retry-after': '120' })).lookup(q)).toEqual({ unavailable: true, errorClass: 'http-429', retryAfterMs: 120_000 });
  });
  it('5xx, network error, timeout and broken JSON are unavailable', async () => {
    expect(await make(reply(503, '')).lookup(q)).toMatchObject({ unavailable: true, errorClass: 'http-5xx' });
    expect(await make(async () => { throw new TypeError('fetch failed'); }).lookup(q)).toMatchObject({ unavailable: true, errorClass: 'network' });
    expect(await make(async () => { throw Object.assign(new Error('aborted'), { name: 'TimeoutError' }); }).lookup(q)).toMatchObject({ unavailable: true, errorClass: 'timeout' });
    expect(await make(reply(200, '<html>')).lookup(q)).toMatchObject({ unavailable: true, errorClass: 'parse' });
  });
  it('sends the configured User-Agent', async () => {
    let ua: string | undefined;
    await make(async (u, init) => { ua = init?.headers?.['User-Agent']; return reply(500, '')(u, init); }).lookup(q);
    expect(ua).toBe('UA-test (mailto:me@example.org)');
  });
}

describe('PlanespottersPhotoSource', () => {
  const make = (f: Fetch) => new PlanespottersPhotoSource(o(f));
  it('asks /pub/photos/hex/<HEX> (upper case) first', async () => {
    const urls: string[] = [];
    await make(async (u, i) => { urls.push(u); return reply(200, fixture('planespotters-hex-hit'))(u, i); }).lookup(Q);
    expect(urls).toEqual(['https://api.planespotters.net/pub/photos/hex/3C6444']);
  });
  it('hit: maps thumbnail, thumbnail_large, link and photographer with the credit line', async () => {
    expect(await make(reply(200, fixture('planespotters-hex-hit'))).lookup(Q)).toEqual({ photos: [{
      id: '1234567', source: 'planespotters', photographer: 'AsharkNGB',
      thumbUrl: 'https://t.plnspttrs.net/12345/1234567_abcdef_small.jpg', imageUrl: 'https://t.plnspttrs.net/12345/1234567_abcdef_280.jpg',
      pageUrl: 'https://www.planespotters.net/photo/1234567/d-aixa-lufthansa-airbus-a350-941', licenceText: '© AsharkNGB · planespotters.net', size: { width: 498, height: 280 },
    }] });
  });
  it('empty photos[] on hex falls back to /pub/photos/reg/<REG>', async () => {
    const urls: string[] = [];
    const r = await make(async (u, i) => { urls.push(u); return reply(200, fixture(u.includes('/reg/') ? 'planespotters-hex-hit' : 'planespotters-empty'))(u, i); }).lookup(Q);
    expect(urls).toEqual(['https://api.planespotters.net/pub/photos/hex/3C6444', 'https://api.planespotters.net/pub/photos/reg/D-AIXA']);
    expect(r).toMatchObject({ photos: [{ id: '1234567' }] });
  });
  it('Kein Foto: empty photos[] (no registration to fall back on) and a 404 are an empty list, not unavailable', async () => {
    expect(await make(reply(200, fixture('planespotters-empty'))).lookup({ icao24: '3c6444' })).toEqual({ photos: [] });
    expect(await make(reply(404, '{"error":"not found"}')).lookup(Q)).toEqual({ photos: [] });
  });
  it('an answer without photos[] is a parse failure (unavailable)', async () => {
    expect(await make(reply(200, '{"error":"x"}')).lookup(Q)).toMatchObject({ unavailable: true, errorClass: 'parse' });
  });
  failureContract(make);
});

describe('AirportDataPhotoSource', () => {
  const make = (f: Fetch) => new AirportDataPhotoSource(o(f));
  it('asks ac_thumb.json?m=<HEX>&n=5', async () => {
    const urls: string[] = [];
    await make(async (u, i) => { urls.push(u); return reply(200, fixture('airport-data-hit'))(u, i); }).lookup(Q);
    expect(urls).toEqual(['https://airport-data.com/api/ac_thumb.json?m=3C6444&n=5']);
  });
  it('hit: a gallery with photographer credit and link', async () => {
    const r = await make(reply(200, fixture('airport-data-hit'))).lookup(Q);
    expect(r).toMatchObject({ photos: [
      { id: 'https://airport-data.com/aircraft/photo/001234567.html', source: 'airport-data', photographer: 'Max Muster', imageUrl: 'https://image.airport-data.com/aircraft/thumbnails/001/234/001234567.jpg', pageUrl: 'https://airport-data.com/aircraft/photo/001234567.html', licenceText: '© Max Muster · airport-data.com' },
      { photographer: 'Erika Beispiel' },
    ] });
  });
  it('no data falls back to r=<REG>; still nothing is Kein Foto', async () => {
    const urls: string[] = [];
    const r = await make(async (u, i) => { urls.push(u); return reply(200, fixture('airport-data-empty'))(u, i); }).lookup(Q);
    expect(urls).toEqual(['https://airport-data.com/api/ac_thumb.json?m=3C6444&n=5', 'https://airport-data.com/api/ac_thumb.json?r=D-AIXA&n=5']);
    expect(r).toEqual({ photos: [] });
  });
  it('404 is Kein Foto', async () => { expect(await make(reply(404, '')).lookup(Q)).toEqual({ photos: [] }); });
  failureContract(make);
});

describe('CommonsPhotoSource', () => {
  const make = (f: Fetch) => new CommonsPhotoSource(o(f));
  it('searches the File namespace for the registration', async () => {
    const urls: string[] = [];
    await make(async (u, i) => { urls.push(u); return reply(200, fixture('commons-hit'))(u, i); }).lookup(Q);
    expect(urls[0]).toContain('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=D-AIXA&gsrnamespace=6');
    expect(urls[0]).toContain('iiprop=url%7Cextmetadata');
    expect(urls[0]).toContain('iiurlwidth=1600');
  });
  it('imageUrl is the thumburl of the response (1600 px preview), size from thumbwidth/thumbheight when given', async () => {
    const body = JSON.stringify({ query: { pages: { 1: { pageid: 1, title: 'File:D-AIXA.jpg', index: 1, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/x/1600px-D-AIXA.jpg', thumbwidth: 1600, thumbheight: 900, url: 'https://upload.wikimedia.org/x/D-AIXA.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:D-AIXA.jpg', extmetadata: {} }] } } } });
    const r = await make(reply(200, body)).lookup(Q);
    const p = 'photos' in r ? r.photos[0] : undefined;
    expect(p?.imageUrl).toBe('https://upload.wikimedia.org/x/1600px-D-AIXA.jpg');
    expect(p?.size).toEqual({ width: 1600, height: 900 });
  });
  it('mis-hits are dropped: only files whose title or description contains the registration exactly stay (D-AIXB, apron without reg are out)', async () => {
    const r = await make(reply(200, fixture('commons-hit'))).lookup(Q);
    const ids = 'photos' in r ? r.photos.map((p) => p.id) : [];
    expect(ids).toEqual(['102', '101']); // search `index` order; 102 matches via its (HTML) description only
  });
  it('credit: artist (HTML stripped, entities decoded) · licence · Wikimedia Commons; page = file page', async () => {
    const r = await make(reply(200, fixture('commons-hit'))).lookup(Q);
    expect('photos' in r && r.photos).toEqual([
      expect.objectContaining({ source: 'commons', photographer: 'Bob & Co', licenceText: 'Bob & Co · CC BY 4.0 · Wikimedia Commons', pageUrl: 'https://commons.wikimedia.org/wiki/File:Lufthansa_A350_landing.jpg', thumbUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/landing.jpg/640px-landing.jpg' }),
      expect.objectContaining({ photographer: 'Anna Fotograf', licenceText: 'Anna Fotograf · CC BY-SA 4.0 · Wikimedia Commons' }),
    ]);
  });
  it('Kein Foto: no `query` in the answer, or no registration to search for (nothing is requested)', async () => {
    expect(await make(reply(200, fixture('commons-empty'))).lookup(Q)).toEqual({ photos: [] });
    const f = vi.fn(reply(200, ''));
    expect(await make(f).lookup({ icao24: '3c6444' })).toEqual({ photos: [] });
    expect(f).not.toHaveBeenCalled();
  });
  it('an API error object is unavailable', async () => {
    expect(await make(reply(200, '{"error":{"code":"ratelimited"}}')).lookup(Q)).toMatchObject({ unavailable: true, errorClass: 'parse' });
  });
  failureContract(make);
});
