// @vitest-environment node
// /healthz names the active flight source and the state per source; the Takt survives a failing primary (ADR 0019).
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
const fixture = fs.readFileSync(new URL('../../fixtures/adsbfi-v3-point-oberweyer.json', import.meta.url), 'utf8');
const res = (status: number, body: string, headers: Record<string, string> = {}) => ({ ok: status < 300, status, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null }, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });

async function boot(fetchImpl: Fetch) {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-chain-'));
  const lines: string[] = [];
  const config = parseConfig(`port: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.45, lon: 8.09 }\nspeech: { adapter: fake }\nsources: { route: { enabled: false } }\n`);
  svc = await startService({ config, clientDir: path.join(dir, 'client'), write: (l) => lines.push(l), timeZone: 'UTC', fetch: fetchImpl });
  const base = `http://127.0.0.1:${svc.port}`;
  return { lines, health: async () => (await (await fetch(base + '/healthz')).json()) as { flight: { active: string; sources: { name: string; state: string }[] } }, state: async () => (await (await fetch(base + '/api/state')).json()) as { stale: boolean } };
}

describe('flight chain in the composition root', () => {
  it('adsb.fi healthy: it is the active source, adsb.lol is never asked', async () => {
    const urls: string[] = [];
    const { health, lines } = await boot(async (url) => { urls.push(url); return res(200, fixture); });
    const h = await health();
    expect(h.flight.active).toBe('adsb-fi');
    expect(h.flight.sources.map((s) => `${s.name}:${s.state}`)).toEqual(['adsb-fi:ok', 'adsb-lol:ok']);
    expect(urls.some((u) => u.includes('adsb.lol'))).toBe(false);
    expect(lines.some((l) => l.includes('"level":"warn"'))).toBe(false);
  });
  it('adsb.fi answers 429: the same Takt is served by adsb.lol, scene not stale, /healthz shows adsb-fi blocked', async () => {
    const { health, state, lines } = await boot(async (url) => (url.includes('adsb.fi') ? res(429, '') : res(200, fixture)));
    expect((await state()).stale).toBe(false);
    const h = await health();
    expect(h.flight.active).toBe('adsb-lol');
    expect(h.flight.sources.find((s) => s.name === 'adsb-fi')?.state).toBe('blocked');
    expect(lines.some((l) => l.includes('flight source active') && l.includes('adsb-lol'))).toBe(true);
  });
});
