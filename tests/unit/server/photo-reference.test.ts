// @vitest-environment node
// GET /api/photos/reference (ADR 0033 §2, amended): Commons only, only for hexes in `sightings`, stored registration only. Fetch seam, no network.
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

async function boot(fetchImpl: Fetch, registration: string | null = 'D-AIXA') {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-ref-'));
  fs.mkdirSync(path.join(dir, 'client'));
  const scenario = path.join(dir, 's.json');
  const plane = { icao24: '3c6444', callsign: 'DLH400', typeCode: 'A20N', distanceKm: 8, bearingDeg: 90, altitudeFt: 36000, speedKt: 470, ...(registration ? { registration } : {}) };
  fs.writeFileSync(scenario, JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [{ at: 0, planes: [plane] }] }));
  const config = parseConfig(`mode: mock\nscenario: ${scenario}\nport: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.05, lon: 8.57 }\nspeech: { adapter: fake }\n`);
  svc = await startService({ config, clientDir: path.join(dir, 'client'), write: () => {}, timeZone: 'UTC', fetch: fetchImpl });
  const base = `http://127.0.0.1:${svc.port}`;
  await fetch(base + '/mock/advance', { method: 'POST', body: JSON.stringify({ seconds: 30 }) });
  return { get: (p: string) => fetch(base + p) };
}

describe('GET /api/photos/reference', () => {
  it('200 with the chain answer for a sighted hex; Commons sees only the stored registration, a differing parameter is ignored', async () => {
    const urls: string[] = [];
    const { get } = await boot(async (url) => { urls.push(url); return res(200, fixture('commons-hit')); });
    const r = await get('/api/photos/reference?icao24=3C6444&registration=D-EVIL');
    expect(r.status).toBe(200);
    const body = (await r.json()) as { status: string; photos: { source: string }[] };
    expect(body.status).toBe('ok');
    expect(body.photos[0].source).toBe('commons');
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.some((u) => u.includes('EVIL'))).toBe(false);
    expect(urls.some((u) => /D-?AIXA/i.test(decodeURIComponent(u)))).toBe(true);
  });
  it('a matching registration parameter is not used twice; the second call within the cache time asks nobody', async () => {
    let n = 0;
    const { get } = await boot(async () => { n++; return res(200, fixture('commons-hit')); });
    await get('/api/photos/reference?icao24=3c6444&registration=%20d-aixa%20'); const first = n;
    await get('/api/photos/reference?icao24=3c6444');
    expect(first).toBeGreaterThan(0);
    expect(n).toBe(first);
  });
  it('400 for an invalid hex, 404 for a never sighted hex; no source is asked in both cases', async () => {
    let n = 0;
    const { get } = await boot(async () => { n++; return res(200, '{}'); });
    expect((await get('/api/photos/reference?icao24=xyz')).status).toBe(400);
    expect((await get('/api/photos/reference')).status).toBe(400);
    expect((await get('/api/photos/reference?icao24=abcdef')).status).toBe(404);
    expect(n).toBe(0);
  });
  it('asks Commons only: Planespotters stays unasked even when Commons finds nothing, while /api/photos/:icao24 still follows the configuration', async () => {
    const urls: string[] = [];
    const { get } = await boot(async (url) => { urls.push(url); return res(200, url.includes('planespotters') ? fixture('planespotters-hex-hit') : fixture('commons-empty')); });
    expect(await (await get('/api/photos/reference?icao24=3c6444')).json()).toEqual({ photos: [], status: 'none' });
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.some((u) => u.includes('planespotters'))).toBe(false);
    await get('/api/photos/3c6444');
    expect(urls.some((u) => u.includes('planespotters'))).toBe(true);
  });
  it('a hex without a stored registration answers 200 none and Commons is not asked', async () => {
    let n = 0;
    const { get } = await boot(async () => { n++; return res(200, fixture('commons-hit')); }, null);
    expect(await (await get('/api/photos/reference?icao24=3c6444&registration=D-AIXA')).json()).toEqual({ photos: [], status: 'none' });
    expect(n).toBe(0);
  });
});
