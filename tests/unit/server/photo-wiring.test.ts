// @vitest-environment node
// Photo sources in the composition root (ADR 0029): GET /api/photos/:icao24 for the current Auswahl (JSON metadata only),
// memory cache, /healthz photo.sources[], boot warning for a User-Agent without contact. Mock scenario + fetch seam, no network.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseConfig } from '../../../src/server/config';
import { startService, type Service } from '../../../src/server/app';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';

let svc: Service | undefined;
let dir: string;
afterEach(async () => { await svc?.stop(); svc = undefined; fs.rmSync(dir, { recursive: true, force: true }); });
const FIX = path.resolve(import.meta.dirname, '../../fixtures/photos');
const fixture = (n: string): string => fs.readFileSync(path.join(FIX, n + '.json'), 'utf8');
const res = (status: number, body: string) => ({ ok: status < 300, status, headers: { get: () => null }, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });

async function boot(fetchImpl: Fetch, extraCfg = '') {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-photo-'));
  fs.mkdirSync(path.join(dir, 'client'));
  const scenario = path.join(dir, 's.json');
  fs.writeFileSync(scenario, JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [{ at: 0, planes: [{ icao24: '3c6444', callsign: 'DLH400', typeCode: 'A20N', registration: 'D-AIXA', distanceKm: 8, bearingDeg: 90, altitudeFt: 36000, speedKt: 470 }] }] }));
  const config = parseConfig(`mode: mock\nscenario: ${scenario}\nport: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.05, lon: 8.57 }\nspeech: { adapter: fake }\n${extraCfg}`);
  const lines: string[] = [];
  svc = await startService({ config, clientDir: path.join(dir, 'client'), write: (l) => lines.push(l), timeZone: 'UTC', fetch: fetchImpl });
  const base = `http://127.0.0.1:${svc.port}`;
  return { lines, get: (p: string) => fetch(base + p) };
}

describe('GET /api/photos/:icao24', () => {
  it('returns the merged gallery of the chain for a plane of the current Auswahl, as JSON only', async () => {
    const urls: string[] = [];
    const { get } = await boot(async (url) => { urls.push(url); return url.includes('planespotters') ? res(200, fixture('planespotters-hex-hit')) : url.includes('commons') ? res(200, fixture('commons-hit')) : res(200, fixture('airport-data-hit')); });
    const r = await get('/api/photos/3C6444');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('application/json');
    const body = (await r.json()) as { status: string; photos: { source: string; imageUrl: string }[] };
    expect(body.status).toBe('ok');
    expect(body.photos.map((p) => p.source)).toEqual(['planespotters', 'commons', 'commons', 'airport-data', 'airport-data']);
    expect(urls.every((u) => /planespotters|wikimedia|airport-data/.test(u) && !/\.(jpe?g|png)(\?|$)/.test(u))).toBe(true); // the server asks metadata endpoints, never an image
  });
  it('404 for a hex that is not in the current Auswahl (and no photo request is made)', async () => {
    const urls: string[] = [];
    const { get } = await boot(async (url) => { urls.push(url); return res(200, '{}'); });
    expect((await get('/api/photos/abcdef')).status).toBe(404);
    expect(urls).toEqual([]);
  });
  it('status none when every source has no photo, unavailable when they are all down', async () => {
    const none = await boot(async (url) => res(200, url.includes('planespotters') ? fixture('planespotters-empty') : url.includes('commons') ? fixture('commons-empty') : fixture('airport-data-empty')));
    expect(await (await none.get('/api/photos/3c6444')).json()).toEqual({ photos: [], status: 'none' });
    await svc?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
    const down = await boot(async () => res(503, ''));
    expect(await (await down.get('/api/photos/3c6444')).json()).toEqual({ photos: [], status: 'unavailable' });
  });
  it('answers repeated requests from the memory cache', async () => {
    let n = 0;
    const { get } = await boot(async () => { n++; return res(200, fixture('planespotters-empty')); });
    await get('/api/photos/3c6444'); const first = n;
    await get('/api/photos/3c6444');
    expect(first).toBeGreaterThan(0);
    expect(n).toBe(first);
  });
  it('with sources.photo.order: [] there are no photo sources: status none, no requests', async () => {
    let n = 0;
    const { get } = await boot(async () => { n++; return res(200, '{}'); }, 'sources: { photo: { order: [] } }\n');
    expect(await (await get('/api/photos/3c6444')).json()).toEqual({ photos: [], status: 'none' });
    expect(n).toBe(0);
  });
});

describe('/healthz and boot', () => {
  it('lists photo.sources[] with their state; a 429 shows as backoff', async () => {
    const { get } = await boot(async (url) => (url.includes('planespotters') ? res(429, '') : res(200, fixture('commons-empty'))));
    await get('/api/photos/3c6444');
    const h = (await (await get('/healthz')).json()) as { photo: { sources: { name: string; state: string }[] } };
    expect(h.photo.sources.map((s) => `${s.name}:${s.state}`)).toEqual(['planespotters:backoff', 'commons:ok', 'airport-data:ok']);
  });
  it('warns at boot when the User-Agent has no contact and photo sources are active; not with a contact or no photo sources', async () => {
    const warn = (lines: string[]) => lines.some((l) => l.includes('"level":"warn"') && l.includes('userAgent'));
    expect(warn((await boot(async () => res(200, '{}'))).lines)).toBe(true);
    await svc?.stop(); fs.rmSync(dir, { recursive: true, force: true });
    expect(warn((await boot(async () => res(200, '{}'), 'sources: { userAgent: "PlanesAbove/0.1 (mailto:me@example.org)" }\n')).lines)).toBe(false);
    await svc?.stop(); fs.rmSync(dir, { recursive: true, force: true });
    expect(warn((await boot(async () => res(200, '{}'), 'sources: { photo: { order: [] } }\n')).lines)).toBe(false);
  });
});
