// @vitest-environment node
// The mock control surface exists only when `mode: mock` (ADR 0013); in live mode it has no effect.
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

const stateOf = async (url: string) => { const { serverTime: _t, ...rest } = (await (await fetch(url + '/api/state')).json()) as Record<string, unknown>; return rest; };
const rejecting: Fetch = async () => { throw new Error('network down'); };

async function bootLive() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-mocklive-'));
  const config = parseConfig(`port: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.45, lon: 8.09 }\nspeech: { adapter: fake }\nsources: { route: { enabled: false } }\n`);
  svc = await startService({ config, clientDir: path.join(dir, 'client'), write: () => undefined, timeZone: 'UTC', fetch: rejecting });
  return `http://127.0.0.1:${svc.port}`;
}
async function bootMock() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-mocklive-'));
  const scenario = path.join(dir, 's.json');
  fs.writeFileSync(scenario, JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [{ at: 0, planes: [] }] }));
  const config = parseConfig(`mode: mock\nscenario: ${scenario}\nport: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.05, lon: 8.57 }\nspeech: { adapter: fake }\n`);
  svc = await startService({ config, clientDir: path.join(dir, 'client'), write: () => undefined, timeZone: 'UTC' });
  return `http://127.0.0.1:${svc.port}`;
}

describe('mock endpoints are absent in live mode (ADR 0013)', () => {
  it('GET /mock/sightings is 404 "not found", not a JSON array', async () => {
    const url = await bootLive();
    const r = await fetch(url + '/mock/sightings');
    expect(r.status).toBe(404);
    const body = await r.text();
    expect(body).toBe('not found');
    expect(() => JSON.parse(body)).toThrow();
  });
  it('POST /mock/advance is 405 without a {now} answer and leaves /api/state unchanged', async () => {
    const url = await bootLive();
    const before = await stateOf(url);
    const r = await fetch(url + '/mock/advance', { method: 'POST', body: JSON.stringify({ seconds: 3600 }) });
    expect(r.status).toBe(405);
    const body = await r.text();
    expect(body).not.toContain('now');
    expect(await stateOf(url)).toEqual(before);
  });
  it('counter-check: in mode mock both paths answer 200', async () => {
    const url = await bootMock();
    expect((await fetch(url + '/mock/sightings')).status).toBe(200);
    expect((await fetch(url + '/mock/advance', { method: 'POST', body: JSON.stringify({ seconds: 1 }) })).status).toBe(200);
  });
});
